#!/bin/bash
# Genera todos los dossiers, fichas resumen y el plan global
# Uso: ./scripts/generar-todos.sh

set -e

echo "=== Validando datos ==="
npx ts-node src/cli.ts validar --todos

echo ""
echo "=== Generando dossiers y fichas ==="
npx ts-node src/cli.ts generar --todos

echo ""
echo "=== Generando plan global ==="
npx ts-node src/cli.ts generar --global

echo ""
echo "=== Completado ==="
npx ts-node src/cli.ts estado
