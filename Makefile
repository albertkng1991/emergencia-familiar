.PHONY: dev install lint format build

VENV := .venv/bin

# Start Flask (5000) + Vite (5173) in parallel; Ctrl+C kills both
dev:
	@echo "Starting Flask + Vite dev servers..."
	@trap 'kill 0' INT TERM; \
		$(VENV)/python -m backend serve --debug --port 5001 & \
		cd frontend && npm run dev & \
		wait

install:
	$(VENV)/pip install -r requirements.txt
	cd frontend && npm install

lint:
	$(VENV)/ruff check backend/
	cd frontend && npm run lint

format:
	$(VENV)/ruff format backend/
	$(VENV)/ruff check --fix backend/
	cd frontend && npm run format

build:
	cd frontend && npm run build
