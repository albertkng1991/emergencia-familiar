from backend.dashboard.routes.health import health_bp
from backend.dashboard.routes.keys import keys_bp


def register_dashboard_blueprints(app):
    app.register_blueprint(keys_bp)
    app.register_blueprint(health_bp)
