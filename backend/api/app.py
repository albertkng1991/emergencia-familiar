"""
Flask API: serves packs, stories, and audio files.
"""

import logging

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from backend.config.settings import AUDIO_DIR
from backend.storage.database import get_session, init_db
from backend.storage.models import Pack

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    init_db()

    @app.get("/api/packs")
    def list_packs():
        session = get_session()
        try:
            packs = session.query(Pack).order_by(Pack.created_at.desc()).all()
            return jsonify({"packs": [p.to_dict() for p in packs]})
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

    @app.get("/audio/<path:filename>")
    def serve_audio(filename):
        return send_from_directory(str(AUDIO_DIR), filename)

    return app
