---
description: "Fase 3 — Arquitetura Frontend (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#3b82f6"
temperature: 0.1
permission:
  edit: allow
  bash: allow
---

# Fase 3 — Arquitetura Frontend

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## 3.1 CSS Custom Properties (em vez de Inline Styles)

1. **frontend/src/index.css** — Converter todo o design system de `frontend/src/theme.ts` para CSS custom properties:
   ```css
   :root[data-theme="dark"] {
     --bg-primary: #0f0f23;
     --bg-secondary: #1a1a3e;
     --text-primary: #e2e8f0;
   }
   ```
   Criar também tema `light`.

2. **Todas as pages e components** — Substituir `style={{ backgroundColor: theme.colors.bgPrimary }}` por `className="bg-primary"`.
   Impacto: elimina ~7000+ inline style assignments.

## 3.2 React Query (TanStack Query)

3. **Criar** `frontend/src/hooks/useApi.ts` — Custom hooks com React Query para cada endpoint principal:
   - Cache automático stale-while-revalidate
   - Deduplicação de requests
   - Cancelamento automático em unmount

4. **frontend/src/api.ts** — Configurar `BASE_URL` via `import.meta.env.VITE_API_URL`.
   Adicionar `AbortController` support. Tipar retornos (eliminar `any`).

5. **frontend/vite.config.ts** — Adicionar proxy para `/api`:
   ```ts
   server: { proxy: { '/api': 'http://localhost:3001' } }
   ```

## 3.3 Decomposição de Componentes Grandes

6. **frontend/src/App.tsx** (353 linhas) — Extrair `<AppLayout>` e `<AppRoutes>`. App.tsx deve ficar com ~50 linhas.

7. **frontend/src/components/FlatIcons.tsx** (683 linhas) — Dividir em arquivos individuais ou migrar para Lucide React / React Icons.

8. **Decompor páginas grandes**:
   - `DashboardPage.tsx` (536 linhas) → Extrair `<StatCard>`, `<RecentFiles>`, `<TypeChart>`
   - `CrisisPanel.tsx` (479 linhas) → Extrair tabs em sub-componentes
   - `OperationalPage.tsx` (467 linhas) → Extrair seções
   - `ChatConsultPage.tsx` (446 linhas) → Extrair `<MessageBubble>`, `<ChatInput>`
   - `DataSourcesPage.tsx` (431 linhas) → Extrair forms e lista

## 3.4 Otimizações React

9. Adicionar `React.memo` em componentes de lista (Card, Badge, Sidebar items)
10. Adicionar `useMemo` para cálculos derivados nas pages
11. Adicionar `useCallback` para handlers passados como props
12. Virtualizar listas longas (FilesPage, SearchPage) com `react-window` ou `@tanstack/virtual`
