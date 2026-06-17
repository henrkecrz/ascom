#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================"
echo "  Plano de Comunicacao - Novacap ASCOM"
echo "========================================"
echo ""
echo "Escaneando diretorios de documentos (logs em backend/logs/)..."
cd "$DIR/backend"
npm run scan
echo ""
echo "Iniciando servidores (processamento em fila ocorre em segundo plano)..."
echo ""
echo "  Configuracoes carregadas do arquivo backend/.env"
echo ""

# Start backend
cd "$DIR/backend" && npm run dev &
BACKEND_PID=$!

# Start frontend
cd "$DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo "Aguardando servidores iniciarem..."
sleep 6

# Detect IP for network access
IP=$(ipconfig 2>/dev/null | grep -i "IPv4" | head -1 | awk -F': ' '{print $2}' | tr -d ' ' || true)
if [ -z "$IP" ]; then
  IP=$(ifconfig 2>/dev/null | grep -E 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' || true)
fi

# Open browser
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173
elif command -v open &>/dev/null; then
  open http://localhost:5173
fi

echo ""
echo "========================================"
echo "  Sistema iniciado com sucesso!"
echo ""
echo "  Acesso local:    http://localhost:5173"
if [ -n "$IP" ]; then
  echo "  Acesso rede:     http://$IP:5173"
fi
echo ""
echo "  Busca:      Busca Inteligente no menu"
echo "  Timeline:   Linha do Tempo no menu"
echo "  Relatorios: Relatorios Executivos no menu"
echo ""
echo "  Processamento em fila executa em 2o plano (1 doc por vez)"
echo "  Monitore o progresso no Dashboard"
echo ""
echo "  LOGS: backend/logs/ (YYYY-MM-DD.log)"
echo "  Para monitorar em tempo real: bash logs.bat"
echo ""
echo "  Para reindexar tudo: cd backend && npm run scan && npm run analyze"
echo "========================================"
echo ""
echo "Pressione Ctrl+C para encerrar."

cleanup() {
  echo ""
  echo "Encerrando servidores..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
