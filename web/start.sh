#!/bin/bash
# ─────────────────────────────────────────────────────
# Plan de Emergencia Familiar — Arrancar formularios
# ─────────────────────────────────────────────────────
# Uso: ./web/start.sh
# Para parar: Ctrl+C
# ─────────────────────────────────────────────────────

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Parando servidor y túnel...${NC}"
  kill $SERVER_PID 2>/dev/null
  kill $NGROK_PID 2>/dev/null
  wait $SERVER_PID 2>/dev/null
  wait $NGROK_PID 2>/dev/null
  echo -e "${GREEN}Todo parado.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start web server in background
echo -e "${BLUE}Arrancando servidor web...${NC}"
node web/server.js &
SERVER_PID=$!
sleep 1

# Check server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "Error: el servidor no arrancó."
  exit 1
fi

# 2. Start ngrok tunnel
echo -e "${BLUE}Abriendo túnel público con ngrok...${NC}"
ngrok http 3000 --log stdout --log-level warn > /dev/null 2>&1 &
NGROK_PID=$!
sleep 3

# 3. Get public URL from ngrok API
PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
    tunnels = json.load(sys.stdin)['tunnels']
    print(tunnels[0]['public_url'])
except:
    print('')
" 2>/dev/null)

if [ -z "$PUBLIC_URL" ]; then
  echo "Error: no se pudo obtener la URL pública de ngrok."
  cleanup
  exit 1
fi

PANEL_URL="${PUBLIC_URL}/estado.html"

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                                                            ║${NC}"
echo -e "${BOLD}║   ${GREEN}Formularios online${NC}${BOLD}                                       ║${NC}"
echo -e "${BOLD}║                                                            ║${NC}"
echo -e "${BOLD}║${NC}   Enlace para las familias:                                ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${GREEN}${PUBLIC_URL}${NC}"
echo -e "${BOLD}║${NC}                                                            ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   Tu panel de coordinador:                                 ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   ${BLUE}${PANEL_URL}${NC}"
echo -e "${BOLD}║${NC}                                                            ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   Los datos se guardan en ${YELLOW}data/nucleos/${NC}                   ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}   Pulsa ${YELLOW}Ctrl+C${NC} para parar                                  ${BOLD}║${NC}"
echo -e "${BOLD}║                                                            ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Copy URL to clipboard
echo "$PUBLIC_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✓ Enlace copiado al portapapeles${NC}" || true
echo ""
echo "Esperando formularios..."
echo ""

# Wait forever (until Ctrl+C)
wait
