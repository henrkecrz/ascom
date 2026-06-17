---
description: "Fase 4 — Qualidade de Código (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#8b5cf6"
temperature: 0.1
permission:
  edit: allow
  bash: allow
---

# Fase 4 — Qualidade de Código

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## 4.1 Linting e Formatação

1. **Criar** `.eslintrc.json` (raiz) — ESLint para TypeScript + React.
   Rules: `no-any`, `no-unused-vars`, `consistent-return`.

2. **Criar** `.prettierrc` (raiz) — Formatação consistente.

3. **package.json** (raiz) — Adicionar scripts: `lint`, `lint:fix`, `format`.

## 4.2 Corrigir package.json do Backend

4. **backend/package.json** — Mover `@types/*`, `tsx`, `typescript` para `devDependencies`.
   Adicionar scripts de `lint` e `test`.

## 4.3 Service Layer no Backend

5. **Criar** `backend/src/services/` e extrair lógica de negócio das rotas:
   - `backend/src/services/dashboardService.ts` — lógica de agregação do dashboard
   - `backend/src/services/importService.ts` — lógica de importação (atualmente em `backend/src/routes/import.ts` com 309 linhas)
   - `backend/src/services/consultService.ts` — lógica de consulta IA (atualmente em `backend/src/routes/consult.ts` com 240 linhas)
   - `backend/src/services/searchService.ts` — lógica de busca

## 4.4 Melhorar Queue System

6. **backend/src/queueWorker.ts** (335 linhas):
   - Implementar retry com exponential backoff (max 3 tentativas)
   - Adicionar dead letter queue para falhas persistentes
   - Quebrar try/catch monolítico em handlers por estágio
   - Adicionar timeout por tarefa (ex: 60s para OCR)

## 4.5 Corrigir tsconfig do Backend

7. **backend/tsconfig.json** — `moduleResolution`: `"node"` → `"node16"`.
   Remover `declaration: true`.
