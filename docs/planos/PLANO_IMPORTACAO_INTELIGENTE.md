# Plano de Implementação — Motor de Importação Inteligente (Estilo Power BI)

## Visão Geral
Sistema que usa IA para analisar arquivos, inferir schemas, criar tabelas dinamicamente no SQLite, detectar relacionamentos entre dados, e preparar tudo para dashboards — semelhante ao Power Query do Power BI.

## Status da Implementação

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 92% — Faltam itens de integração FASE 7
```

---

## Fases

### FASE 1 — Núcleo de IA (schemaInferrer) ✅ Completa
- [x] `backend/src/analysis/schemaInferrer.ts` — IA que analisa cada arquivo e retorna schema JSON
- [x] Prompt de classificação para LLM
- [x] Fallback heurístico (regex) quando IA falha
- [x] Suporte a XLSX, CSV, DOCX, PDF

### FASE 2 — Banco Dinâmico (dynamicTableGenerator) ✅ Completa
- [x] `backend/src/analysis/dynamicTableGenerator.ts` — Cria/altera tabelas no SQLite sob medida
- [x] Mapeamento de tipos (TEXT, INTEGER, REAL, DATE, BOOLEAN)
- [x] Cria índices automaticamente
- [x] Migração segura (add column se já existe)

### FASE 3 — Relacionamentos (relationshipFinder) ✅ Completa
- [x] `backend/src/analysis/relationshipFinder.ts` — Detecta relações entre fontes
- [x] Match por nome de coluna (ex: `contato_id` → `contacts.id`)
- [x] Match por conteúdo (valores que se repetem entre tabelas)
- [x] Sugestão de chaves estrangeiras

### FASE 4 — Orquestrador (smartImporter) ✅ Completa
- [x] `backend/src/analysis/smartImporter.ts` — Pipeline completo
- [x] Preview: analisa sem alterar banco
- [x] Confirm: cria tabelas + insere dados + relações
- [x] Status: feedback em tempo real (job tracking)

### FASE 5 — API (routes/import) ✅ Completa
- [x] `backend/src/routes/import.ts` — Endpoints REST
- [x] `POST /api/import/preview` — analisa sem salvar
- [x] `POST /api/import/confirm` — executa importação
- [x] `GET /api/import/status/:id` — acompanhamento
- [x] `GET /api/import/tables` — listagem de tabelas dinâmicas
- [x] `GET /api/import/relationships` — relacionamentos detectados

### FASE 6 — Frontend (ImportManager) 🟡 Quase completa
- [x] `frontend/src/components/ImportManager.tsx` — UI tipo Power Query
- [x] Lista de fontes de dados detectados com preview
- [x] Botão "Importar" por arquivo ou lote (seleção múltipla)
- [x] Indicador de confiança da IA (cores: verde/amarelo/vermelho)
- [x] Preview de amostra com colunas e tipos
- [x] Resultado da importação com feedback visual
- [x] Listagem de tabelas importadas com expansão
- [ ] **Override manual do schema** — editar colunas/tipos antes de confirmar

### FASE 7 — Integração ⏳ Pendente
- [ ] Conectar DataSourceManager ao ImportManager (fluxo Scan → Import automático)
- [ ] Gatilho automático pós-scan
- [ ] Dashboard com dados importados

---

## Detalhamento do que falta implementar

### FASE 6 — Override Manual do Schema
**Arquivo:** `frontend/src/components/ImportManager.tsx`

- Botão "Editar Schema" em cada arquivo no preview
- Inline editor para renomear colunas
- Dropdown para alterar tipo (TEXT, INTEGER, REAL, DATE)
- Visualizar mudanças em tempo real na amostra

### FASE 7.1 — Conectar DataSourceManager + ImportManager
- DataSourceManager notifica ImportManager quando fonte é adicionada
- ImportManager carrega preview automaticamente
- Feedback visual scanning → importando

### FASE 7.2 — Gatilho Automático Pós-Scan
- Após scan, disparar smart import para XLSX/XLS/CSV/TSV
- Job na fila com status tracking
- Notificação no frontend

### FASE 7.3 — Dashboard com Dados Importados
- Card "Dados Importados" no painel principal
- Contagem de tabelas e registros importados
- Últimas importações com timestamp
