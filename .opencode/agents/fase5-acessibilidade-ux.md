---
description: "Fase 5 — Acessibilidade e UX (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#10b981"
temperature: 0.1
permission:
  edit: allow
  bash: allow
---

# Fase 5 — Acessibilidade e UX

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## 5.1 Acessibilidade Básica

1. **Todos os componentes interativos**:
   - Adicionar `aria-label` em botões e links
   - Adicionar `role` em elementos dinâmicos
   - Implementar foco visível (`:focus-visible`)
   - Adicionar skip navigation link

## 5.2 Responsividade

2. **frontend/src/index.css** — Adicionar media queries para mobile (< 768px):
   - Sidebar colapsável em mobile
   - Cards em grid responsivo

## 5.3 Paginação

3. **Pages de lista** (FilesPage, SearchPage, ContactsPage):
   - Implementar paginação servidor-side
   - Backend: adicionar `LIMIT/OFFSET` nas queries sem paginação

## Verificação

- Lighthouse accessibility score >= 80
