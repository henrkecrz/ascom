---
description: "Fase 1 — Segurança e Higiene Crítica (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#ef4444"
temperature: 0.1
permission:
  edit: allow
  bash:
    git push: ask
    git rm*: allow
    "*": allow
---

# Fase 1 — Segurança e Higiene Crítica

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## Segurança

1. **.gitignore** — Adicionar ao arquivo `.gitignore` na raiz:
   - `**/.env`
   - `*.log`
   - `*.traineddata`
   - `scratch/`
   - `.DS_Store`
   - `coverage/`
   - `.vscode/`
   - `.idea/`
   - A regra atual `.env` não cobre `backend/.env` (só raiz)

2. **backend/.env** — Remover do Git tracking (`git rm --cached backend/.env`).
   Trocar `MASTER_PASSWORD` para uma senha forte.

3. **Criar** `backend/.env.example` — Template sem valores sensíveis, com comentários explicativos.

## Limpeza de Arquivos

4. **Remover scripts órfãos no backend** (12 arquivos, ~10KB):
   - `_check_file_count.ts`
   - `_check_state.mjs`
   - `_check_tables.ts`
   - `check_paths.cjs`
   - `check_queue.cjs`
   - `check_schema.cjs`
   - `check_server_db.cjs`
   - `check_tables.cjs`
   - `check_tables.mjs`
   - `verify_db.cjs`
   - `verify_status.cjs`
   - Manter `_generate_all.ts` → mover para `backend/scripts/generate_all.ts`

5. **Mover HTMLs legados** (5 arquivos no root: `dashboard.html`, `consult-chat.html`, `crisis-panel.html`, `plan-health.html`, `index.html`) para `docs/legacy/` ou excluir.

6. **Remover logs do Git**: `git rm --cached` de todos os `.log` files.

## Verificação

- `git status` não deve mostrar `.env`, logs ou scripts removidos
