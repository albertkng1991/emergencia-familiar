"""API key management endpoints."""

from flask import Blueprint, jsonify, request

from backend.dashboard.services.env_manager import get_all_keys, save_keys
from backend.dashboard.services.key_tester import test_all, test_key

keys_bp = Blueprint("keys", __name__)


@keys_bp.get("/api/keys")
def list_keys():
    return jsonify(get_all_keys())


@keys_bp.post("/api/keys")
def update_keys():
    data = request.get_json(silent=True) or {}
    updates = data.get("keys", {})
    if not updates:
        return jsonify({"error": "No keys provided"}), 400
    save_keys(updates)
    return jsonify({"saved": True})


@keys_bp.post("/api/keys/test")
def test_keys():
    data = request.get_json(silent=True) or {}
    env_var = data.get("key")
    if env_var:
        result = test_key(env_var)
        return jsonify({env_var: result})
    results = test_all()
    return jsonify(results)
