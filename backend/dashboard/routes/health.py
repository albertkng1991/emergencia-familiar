"""System health endpoint."""

import platform

from flask import Blueprint, jsonify

from backend.config.settings import DATABASE_URL

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
    return jsonify(
        {
            "status": "ok",
            "python": platform.python_version(),
            "database": db_type,
        }
    )
