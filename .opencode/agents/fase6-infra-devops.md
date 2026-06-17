---
description: "Fase 6 — Infraestrutura e DevOps (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#06b6d4"
temperature: 0.1
permission:
  edit: allow
  bash: allow
---

# Fase 6 — Infraestrutura e DevOps

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## 6.1 Scripts Cross-Platform

1. **start.bat** — Analisar lógica atual e criar:
   - `start.sh` equivalente para Linux/Mac
   - Ou mover lógica para npm scripts no `package.json` raiz

## 6.2 Testes Automatizados

2. **Criar** `backend/src/__tests__/`:
   - Testes unitários para módulos críticos: `classifier.ts`, `entityExtractor.ts`, `nlpService.ts`
   - Testes de integração para rotas: `search`, `import`, `consult`

3. **Criar** `frontend/src/__tests__/`:
   - Testes de componentes: `Sidebar`, `Card`, `ErrorBoundary`
   - Testes de integração de páginas com MSW (Mock Service Worker)

## Verificação

- `cd backend && npm test`
- `cd frontend && npm test`
