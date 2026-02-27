"""
Flask API: serves packs, stories, and audio files.
"""

import logging
from datetime import datetime, timedelta

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import func

from backend.config.settings import AUDIO_DIR
from backend.dashboard.routes import register_dashboard_blueprints
from backend.storage.database import get_session, init_db
from backend.storage.models import Pack, Story

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    init_db()
    register_dashboard_blueprints(app)

    @app.get("/api/packs")
    def list_packs():
        session = get_session()
        try:
            q = session.query(Pack).filter(Pack.status == "ready")
            pack_type = request.args.get("type", "daily")
            q = q.filter(Pack.pack_type == pack_type)
            topic = request.args.get("topic")
            if topic:
                q = q.filter(func.lower(Pack.topic) == topic.lower())
            date = request.args.get("date")
            if date:
                q = q.filter(Pack.date == date)
            packs = q.order_by(Pack.created_at.desc()).all()
            return jsonify({"packs": [p.to_dict(preview=True) for p in packs]})
        finally:
            session.close()

    @app.get("/api/packs/dates")
    def list_dates():
        session = get_session()
        try:
            pack_type = request.args.get("type", "daily")
            rows = (
                session.query(Pack.date, func.count(Pack.id))
                .filter(Pack.status == "ready", Pack.pack_type == pack_type)
                .group_by(Pack.date)
                .order_by(Pack.date.desc())
                .all()
            )
            return jsonify({"dates": [{"date": d, "count": c} for d, c in rows]})
        finally:
            session.close()

    @app.get("/api/packs/trending")
    def list_trending():
        session = get_session()
        try:
            cutoff = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
            rows = (
                session.query(Pack.topic, func.count(Pack.id))
                .filter(Pack.status == "ready", Pack.pack_type == "daily", Pack.date >= cutoff)
                .group_by(Pack.topic)
                .order_by(func.count(Pack.id).desc())
                .all()
            )
            trending = []
            for topic, pack_count in rows:
                latest = (
                    session.query(Pack)
                    .filter(Pack.status == "ready", Pack.topic == topic, Pack.date >= cutoff)
                    .order_by(Pack.created_at.desc())
                    .first()
                )
                story_count = sum(
                    len(p.stories)
                    for p in session.query(Pack)
                    .filter(
                        Pack.status == "ready",
                        Pack.pack_type == "daily",
                        Pack.topic == topic,
                        Pack.date >= cutoff,
                    )
                    .all()
                )
                trending.append(
                    {
                        "topic": topic,
                        "pack_count": pack_count,
                        "story_count": story_count,
                        "latest_pack": latest.to_dict(preview=True) if latest else None,
                    }
                )
            return jsonify({"trending": trending})
        finally:
            session.close()

    @app.get("/api/topics")
    def list_topics():
        session = get_session()
        try:
            pack_type = request.args.get("type", "daily")
            rows = (
                session.query(Pack.topic, func.count(Pack.id))
                .filter(Pack.status == "ready", Pack.pack_type == pack_type)
                .group_by(Pack.topic)
                .order_by(func.count(Pack.id).desc())
                .all()
            )
            return jsonify({"topics": [{"name": t, "count": c} for t, c in rows]})
        finally:
            session.close()

    @app.get("/api/packs/<int:pack_id>")
    def get_pack(pack_id):
        session = get_session()
        try:
            pack = session.query(Pack).get(pack_id)
            if not pack:
                return jsonify({"error": "Pack not found"}), 404
            return jsonify(pack.to_dict(include_stories=True))
        finally:
            session.close()

    @app.post("/api/packs/generate")
    def generate():
        from backend.packs.generator import generate_pack

        data = request.get_json(silent=True) or {}
        topic = data.get("topic", "IA")
        count = data.get("count", 5)

        try:
            result = generate_pack(topic=topic, story_count=count)
            return jsonify(result), 201
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/stories/search")
    def search_stories():
        q = request.args.get("q", "").strip()
        if len(q) < 2:
            return jsonify({"stories": []})

        session = get_session()
        try:
            pattern = f"%{q}%"
            headline_match = Story.headline.ilike(pattern)
            summary_match = Story.summary.ilike(pattern)

            results = (
                session.query(Story, Pack)
                .join(Pack, Story.pack_id == Pack.id)
                .filter(Pack.status == "ready")
                .filter(headline_match | summary_match)
                .order_by(Pack.date.desc(), Story.created_at.desc())
                .limit(50)
                .all()
            )

            stories = []
            for story, pack in results:
                d = story.to_dict()
                d["topic"] = pack.topic
                d["date"] = pack.date
                stories.append(d)

            return jsonify({"stories": stories})
        finally:
            session.close()

    @app.get("/audio/<path:filename>")
    def serve_audio(filename):
        return send_from_directory(str(AUDIO_DIR), filename)

    return app
