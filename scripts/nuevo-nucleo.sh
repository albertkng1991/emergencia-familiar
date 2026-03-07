#!/bin/bash
# Crea un nuevo núcleo familiar a partir de la plantilla
# Uso: ./scripts/nuevo-nucleo.sh N1 "Carlos + María + Lucas"

set -e

if [ $# -lt 2 ]; then
  echo "Uso: $0 <ID> <NOMBRE>"
  echo "Ejemplo: $0 N1 \"Carlos + María + Lucas\""
  exit 1
fi

ID="$1"
NOMBRE="$2"

npx ts-node src/cli.ts nuevo --id "$ID" --nombre "$NOMBRE"
