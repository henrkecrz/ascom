# Plano de Transformação: Nota 2 → Nota 9

## Diagnóstico Atual (Nota 2)

### Segurança — Nota 1
- Nenhuma autenticação em nenhum endpoint
- Chave de API da OpenCode armazenada em texto puro no SQLite
- Command Injection em `/api/open` — usa `exec()` com caminho do usuário
- SQL Injection potencial em várias queries com interpolação de string
- Path Traversal no scanner — caminho da rede fixo, sem sanitização
- Nenhuma validação de input em nenhuma rota
- Qualquer pessoa na rede pode acessar, deletar ou modificar dados

### Arquitetura — Nota 2
- Sem separação de concerns (database.ts com 1500+ linhas faz TUDO)
- sql.js sem pooling, sem transactions consistentes
- Race conditions: `getDatabase()` compartilhado globalmente
- `saveDatabase()` chamado em momentos arbitrários, sem debounce
- Rotas Express sem middleware de erro ou validação
- Frontend: estilo inline no JSX, sem design system estruturado
- `any` em TODO canto do TypeScript (backend e frontend)

### Análise e IA — Nota 4
- Classificação híbrida AI + regex funcional
- Importação inteligente de XLSX e DOCX implementada
- Grafo de conhecimento populado com 39 relações
- Mas: sem cache de respostas da API, sem fallback robusto
- NLP local limitado a TF-IDF básico
- 22 seções de documento extraídas, potencial subutilizado

### UX/UI — Nota 3
- Sidebar funcional com tema claro/escuro
- Ícones SVG implementados
- Mas: sem estados de loading (skeleton/spinner)
- Sem tratamento de erro (telas brancas em falha de API)
- Sem responsividade mobile
- Sem lazy loading em StructuredData (3116 rows de uma vez)
- Navegação sem breadcrumbs consistente

### Qualidade de Código — Nota 2
- 86+ issues no backend (12 críticas, 15 altas)
- 65+ issues no frontend (6 críticas, 9 altas)
- Duplicação massiva: stopwords.ts duplicado em 2 lugares
- Dependências não usadas: @tensorflow/tfjs, recharts
- Componentes legados mortos: FileCard, FileGrid, SearchBar, Sidebar (antigo)
- Caminhos hardcoded: `N:\ASCOM\2026\ADM\PLANO DE COMUNICAÇÃO`
- N+1 queries no reports.ts e plan.ts

---

## Roteiro de Transformação

### Fase 0 — Emergência (Dia 1)

Correções que evitam dano imediato. Prioridade absoluta.

| # | Ação | Arquivos | Esforço |
|---|------|----------|---------|
| 0.1 | Remover ou proteger rota `/api/open` com exec() | `backend/src/routes/files.ts` | 15min |
| 0.2 | Criptografar API key no banco + mascarar nas responses | `backend/src/database.ts`, `backend/src/routes/settings.ts` | 1h |
| 0.3 | Adicionar validação de input em TODAS as rotas (express-validator) | Todas as rotas `backend/src/routes/*.ts` | 2h |
| 0.4 | Adicionar rate limiting básico | `backend/src/app.ts` | 30min |
| 0.5 | Substituir interpolação de string por parameterized queries no sql.js | `backend/src/database.ts` (funções: `getDocumentCountsBySection`, `getDocumentsBySection`, etc.) | 1h |

### Fase 1 — Fundação Segura (Semanas 1-2)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 1.1 | Implementar autenticação JWT | Middleware em `backend/src/middleware/auth.ts`. Login com senha mestra configurável via env. Proteger TODAS as rotas exceto `/api/auth/login`. | 4h |
| 1.2 | Refatorar database.ts em módulos | Separar em: `db/connection.ts` (sql.js init + save), `db/documents.ts`, `db/structured.ts`, `db/knowledge.ts`, `db/settings.ts`, `db/feedback.ts`. Implementar transactions com wrapper. | 6h |
| 1.3 | Implementar validação schema-wide | Usar `zod` ou `express-validator` para validar query params, body, params em todas as 20+ rotas. Tipar responses. | 4h |
| 1.4 | Substituir `any` por tipos concretos | Criar `backend/src/types.ts` com interfaces para Document, StructuredData, KnowledgeRelation, etc. Tipar todas as funções do database. | 3h |
| 1.5 | Remover dependências mortas | `npm uninstall @tensorflow/tfjs recharts` | 15min |
| 1.6 | Remover componentes legados | Deletar `FileCard.tsx`, `FileGrid.tsx`, `SearchBar.tsx`, `Sidebar.tsx` antigos. Verificar imports. | 30min |

### Fase 2 — Análise e IA Robusta (Semanas 2-3)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 2.1 | Cache de respostas da API de IA | Implementar cache LRU em `backend/src/analysis/aiClassifier.ts`. Chave = hash do texto, TTL = 24h. Reduz custo e latência. | 2h |
| 2.2 | Melhorar fallback do classificador | Quando AI falhar, usar classifier.ts com TF-IDF + seção + extensão. Threshold configurável. | 1h |
| 2.3 | Completar análise dos 123 documentos | Executar analyzer.ts completo. Garantir que todos passem por extração + classificação + grafo. | 30min (já existe) |
| 2.4 | Adicionar status do analyzer | Endpoint `/api/analysis/status` com contador: processados/total, erros, tempo restante estimado. | 1h |
| 2.5 | Debounce no saveDatabase() | Agrupar saves com debounce de 5s. Salvar apenas quando necessário (mudanças reais). | 1h |

### Fase 3 — Experiência do Usuário (Semanas 3-4)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 3.1 | Implementar sistema de loading/skeleton | Componente `SkeletonCard` genérico. Usar em StructuredData, DocumentList, Dashboard, DocumentStructure. Evitar telas brancas. | 3h |
| 3.2 | Error boundaries + tratamento de erro | Componente `ErrorBoundary` em `App.tsx`. Toast system para erros de API. Empty states com ilustração e botão retry. | 3h |
| 3.3 | Paginação/lazy loading no StructuredData | Substituir fetch único de 3116 rows por paginação (50 por página). Scroll infinito ou botão "Carregar mais". | 2h |
| 3.4 | Responsividade mobile | Media queries nos breakpoints: 768px e 1280px. Menu hamburger. Grid adaptável. Fonte ajustável. | 4h |
| 3.5 | Refatorar estilos inline para CSS modules ou styled-components | Extrair estilos compartilhados para tema. Criar `theme.ts` com spacing, borderRadius, shadows. | 6h |
| 3.6 | Breadcrumbs consistentes | Componente `Breadcrumbs` em todas as páginas. Rota atual como último item, clicável nos anteriores. | 1h |
| 3.7 | Atalhos de teclado | Ctrl+K para busca, Escape para fechar modal, setas para navegação. | 1h |

### Fase 4 — Funcionalidades Core (Semanas 4-6)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 4.1 | Painel Operacional (home) | Cards das seções do plano com contagem de docs. Barra de saúde geral. Alertas de desatualização. Docs recentes. | 6h |
| 4.2 | Chat de Consulta Inteligente | Input + histórico + respostas da IA com documentos referenciados. Botões de filtro rápido por seção. Sugestões automáticas. | 8h |
| 4.3 | Painel de Crise | Modo normal (lista protocolos) + modo crise (protocolo ativo + checklist + porta-vozes). Modo crise amplia fontes, muda esquema de cores. | 8h |
| 4.4 | Saúde do Plano | Cobertura por seção. Timeline. Gaps detectados automaticamente (docs sem atualização >6 meses). | 4h |
| 4.5 | Detalhe do Documento turbinado | Ficha técnica. Relacionados com % similaridade. Keywords destacadas no texto. Entidades coloridas. Abrir original. | 4h |

### Fase 5 — Otimizações e Dívida Técnica (Semanas 6-7)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 5.1 | Resolver N+1 queries | Em `reports.ts` e `plan.ts`, substituir queries em loop por JOINs ou queries em lote. | 2h |
| 5.2 | Clustering real por conteúdo | Substituir cluster por pasta por cluster TF-IDF + seção. Salvar clusters no banco. | 3h |
| 5.3 | Diretório raiz configurável | Env var `SCAN_ROOT_PATH`. Fallback para `N:\ASCOM\2026\ADM\PLANO DE COMUNICAÇÃO` se não definido. | 1h |
| 5.4 | Unificar stopwords.ts | Remover duplicata, manter apenas em `backend/src/shared/stopwords.ts`. | 15min |
| 5.5 | Logging consistente | Substituir console.log por logger estruturado (pino ou winston). Níveis: info, warn, error. | 2h |
| 5.6 | Remover magic numbers | String literals em português para constantes. Números mágicos nomeados. | 1h |

### Fase 6 — Polimento e Monitoramento (Semana 8)

| # | Ação | Detalhes | Esforço |
|---|------|----------|---------|
| 6.1 | Métricas de uso | Endpoint `/api/metrics` com contagem de consultas, documentos acessados, erros. | 2h |
| 6.2 | Health check | `/api/health` com status do banco, última indexação, versão. | 30min |
| 6.3 | Testes de integração | Testar rotas principais com supertest. Cobertura mínima: autenticação, CRUD docs, análise. | 6h |
| 6.4 | Auditoria de segurança final | Revisar todas as rotas, verificar auth, validar inputs, testar rate limiting. | 2h |

---

## Resumo de Esforço

| Fase | Horas | Prioridade | Risco se não fizer |
|------|-------|------------|-------------------|
| Fase 0 — Emergência | ~5h | 🔴 Crítica | Exploitation ativa |
| Fase 1 — Fundação | ~18h | 🔴 Alta | Sistema quebradiço |
| Fase 2 — Análise | ~5h | 🔵 Média | IA cara e lenta |
| Fase 3 — UX | ~19h | 🔵 Média | Baixa adoção |
| Fase 4 — Funcionalidades | ~30h | 🟢 Normal | Sem valor de negócio |
| Fase 5 — Dívida Técnica | ~9h | 🟢 Normal | Manutenção cara |
| Fase 6 — Polimento | ~10h | 🟡 Baixa | Sem monitoramento |
| **Total** | **~96h** | | |

---

## Métricas de Sucesso (Grade 9)

### Segurança (Nota 9)
- ✅ Todas as rotas protegidas por JWT
- ✅ API key criptografada em repouso
- ✅ Nenhuma query SQL com interpolação de string
- ✅ Rate limiting ativo
- ✅ Input validado em schema em todas as rotas
- ✅ Sem dependências com vulnerabilidades conhecidas

### Arquitetura (Nota 9)
- ✅ database.ts modularizado em 6+ arquivos
- ✅ sql.js com transactions e save agendado
- ✅ Tipos fortes (zero `any`)
- ✅ Express com middleware pipeline (auth → validation → handler → error)
- ✅ Separação clara: routes → services → db

### Análise e IA (Nota 9)
- ✅ Cache LRU de respostas da API
- ✅ Fallback híbrido com threshold configurável
- ✅ Status do analyzer em tempo real
- ✅ 123/123 documentos processados
- ✅ Grafo de conhecimento com 100+ relações

### UX/UI (Nota 9)
- ✅ Skeleton loading em todas as páginas
- ✅ Error boundaries + toasts + empty states
- ✅ Responsivo: mobile, tablet, desktop
- ✅ Design system com tema, spacing, tipografia consistentes
- ✅ Atalhos de teclado
- ✅ Breadcrumbs em navegação

### Qualidade de Código (Nota 9)
- ✅ Zero dead code
- ✅ Zero dependências não usadas
- ✅ Logging estruturado
- ✅ Constantes nomeadas
- ✅ Testes de integração nas rotas principais
- ✅ Health check + métricas

---

## Checklist de Execução

```
Fase 0: Emergência
  [x] 0.1 Remover/proteger /api/open
  [x] 0.2 Criptografar API key
  [x] 0.3 Validar input em todas as rotas
  [x] 0.4 Rate limiting
  [x] 0.5 Parameterized queries

Fase 1: Fundação Segura
  [x] 1.1 Autenticação JWT
  [x] 1.2 Modularizar database.ts
  [x] 1.3 Validação schema-wide
  [~] 1.4 Types concretos (zero any) — parcial (alguns `any` remanescentes)
  [x] 1.5 Remover dependências mortas
  [x] 1.6 Remover componentes legados

Fase 2: Análise Robusta
  [x] 2.1 Cache LRU de IA
  [x] 2.2 Fallback classifier
  [x] 2.3 Análise completa 123 docs
  [ ] 2.4 Status endpoint — NÃO IMPLEMENTADO
  [x] 2.5 Debounce saveDatabase

Fase 3: UX
  [x] 3.1 Skeleton loading
  [x] 3.2 Error boundaries
  [x] 3.3 Paginação StructuredData
  [~] 3.4 Responsividade — parcial (CSS básico, sem media queries completas)
  [x] 3.5 Refatorar estilos
  [ ] 3.6 Breadcrumbs — NÃO IMPLEMENTADO
  [ ] 3.7 Atalhos de teclado — NÃO IMPLEMENTADO

Fase 4: Funcionalidades
  [x] 4.1 Painel Operacional
  [x] 4.2 Chat de Consulta
  [x] 4.3 Painel de Crise
  [x] 4.4 Saúde do Plano
  [x] 4.5 Detalhe do Documento

Fase 5: Dívida Técnica
  [~] 5.1 N+1 queries — parcial, precisa revisão
  [x] 5.2 Clustering real
  [x] 5.3 Diretório configurável
  [x] 5.4 Unificar stopwords
  [x] 5.5 Logging estruturado
  [~] 5.6 Magic numbers — parcial

Fase 6: Polimento
  [x] 6.1 Métricas
  [x] 6.2 Health check
  [ ] 6.3 Testes de integração — NÃO IMPLEMENTADO
  [ ] 6.4 Auditoria final — NÃO REALIZADA
```
