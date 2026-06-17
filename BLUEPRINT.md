# BLUEPRINT — Sistema Plano de Comunicação (Novacap ASCOM)

> **Versão:** 1.2
> **Propósito:** Blueprint arquitetural completo do sistema
> **Última atualização:** Junho 2026

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Propósito

O **Plano de Comunicação** é um sistema full-stack de gerenciamento documental inteligente construído para a Assessoria de Comunicação (ASCOM) da Novacap (Companhia de Urbanização da Nova Capital do Brasil / GDF).

Seu objetivo central é transformar uma pasta de rede contendo documentos institucionais brutos (PDFs, planilhas, ofícios, imagens) em uma **plataforma operacional de consulta e apoio à decisão**, permitindo que jornalistas e relações-públicas da equipe encontrem rapidamente protocolos, diretrizes, contatos e históricos — especialmente em situações de crise.

### 1.2 Grade de Maturidade Atual

| Dimensão | Nota | Descrição |
|---|---|---|
| Segurança | ~8/10 | JWT em todas as rotas, rate limiting (100 req/min), validação de input, criptografia AES-256-CBC para API keys, sanitização de path traversal |
| Arquitetura | ~8/10 | Monorepo modular (backend/frontend/python-service), sql.js embarcado, 23 tabelas, 28 rotas, middleware pipeline completo |
| Análise e IA | ~9/10 | Classificação híbrida (LLM + regex com fallback), TF-IDF, sumarização, extração de entidades, grafo de conhecimento, busca semântica vetorizada com cache persistente, OCR em imagens, processamento incremental em lote |
| UX/UI | ~8/10 | Design system OKLCH completo, tema dark/light, Importador Universal Wizard, 21 páginas, 23 componentes compartilhados, lazy loading, skeleton states, error boundaries |
| Qualidade de Código | ~7/10 | TypeScript estrito, zero dependências mortas, logging estruturado com rotação, testes existentes. Pendente: cobertura ampliada |

---

## 2. ARQUITETURA TÉCNICA

### 2.1 Diagrama de Contexto (C4 Nível 1)

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERADOR ASCOM                            │
│          (Jornalistas, RPs, Assessor Chefe)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA PLANO DE COMUNICAÇÃO                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Portal Web SPA (React + Vite)                          │ │
│  │  Acesso via navegador - http://localhost:5173            │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         │ HTTP/JSON (REST)                    │
│  ┌──────────────────────▼──────────────────────────────────┐ │
│  │  API REST (Express + TypeScript)                        │ │
│  │  27 grupos de rotas · 55+ endpoints                     │ │
│  │  Porta 3001                                              │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────────┐ │
│  │  SQLite (sql.js) · Processadores · IA · Python NLP        │ │
│  │  22 tabelas + tabelas dinâmicas                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMAS EXTERNOS                                │
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │ Rede ASCOM (N: drive)│  │ OpenCode/OpenAI API (LLM)   │   │
│  │ Documentos e fotos   │  │ Classificação e Chat        │   │
│  └─────────────────────┘  └──────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Windows Explorer (para abrir documentos originais)     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Diagrama de Containers (C4 Nível 2)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SPA (React 18 + Vite 6)                                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Dashboard│ │ Chat IA  │ │ Crise    │ │ Busca    │ │ Settings │ │
│  │ (Home)   │ │ Consulta │ │ Panel    │ │ Smart    │ │ Config   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Grafo    │ │ Timeline │ │ Relat.   │ │ Galeria  │ │ +8 mais  │ │
│  │ Conhecim.│ │          │ │ Execut.  │ │ Fotos    │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Componentes Compartilhados                                   │   │
│  │  Card, Badge, Button, Input, Skeleton, ErrorBoundary,         │   │
│  │  Sidebar, FlatIcons, DataSourceManager, ImportManager,        │   │
│  │  ProcessingToast                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ api.ts       │  │ theme.ts     │  │ ThemeContext.tsx         │  │
│  │ Cliente HTTP │  │ DesignSystem │  │ Dark/Light Theme        │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │ HTTP REST
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Server (Express 4.21 + TypeScript 5.6)                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Middleware Pipeline                                          │   │
│  │  CORS → Rate Limiter → JSON Parser → JWT Auth → Routes      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Rotas (28 grupos, 60+ endpoints)                            │   │
│  │                                                               │   │
│  │  files  dashboard  documents  search  operational  consult    │   │
│  │  crisis  health  plan  graph  timeline  structuredData        │   │
│  │  import  settings  contacts  calendar  photos  dataSources    │   │
│  │  generator  simulator  reports  annualReport  queue  metrics  │   │
│  │  knowledge-graph  advisor  talkingPoints  scanner             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Análise e IA                                                │   │
│  │                                                               │   │
│  │  analyzer.ts → orquestrador principal                        │   │
│  │  classifier.ts → classificação por regex (12 tipos)          │   │
│  │  aiClassifier.ts → classificação via LLM + fallback          │   │
│  │  nlpService.ts → TF-IDF, keywords, sumário, tópicos          │   │
│  │  entityExtractor.ts → pessoas, orgs, datas, valores          │   │
│  │  similarity.ts → similaridade cosseno entre documentos        │   │
│  │  cluster.ts → agrupamento temático por keywords              │   │
│  │  knowledgeGraph.ts → relações entre entidades                │   │
│  │  schemaInferrer.ts → inferência de schema via IA             │   │
│  │  dynamicTableGenerator.ts → criação dinâmica de tabelas      │   │
│  │  relationshipFinder.ts → detecção de FK entre tabelas        │   │
│  │  smartImporter.ts → pipeline de importação inteligente       │   │
│  │  semanticSearch.ts → busca semântica vetorizada              │   │
│  │  workloadAdvisor.ts → recomendações baseadas em carga        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Processores de Arquivo                                      │   │
│  │                                                               │   │
│  │  textExtractor.ts → roteador unificado                       │   │
│  │  pdfProcessor · docxProcessor · docxStructureExtractor       │   │
│  │  xlsxProcessor · xlsxAnalyzer · xlsxIntelligentImporter      │   │
│  │  pptxProcessor · docProcessor · imageProcessor               │   │
│  │  photoIndexer                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Banco de Dados (SQLite via sql.js WASM)                      │   │
│  │                                                               │   │
│  │  connection.ts → init + save com debounce (5s)               │   │
│  │  files.ts · documents.ts · structuredData.ts                  │   │
│  │  sections.ts · knowledge.ts · contacts.ts                     │   │
│  │  settings.ts · simulator.ts · talkingPoints.ts                │   │
│  │  files.ts · photos.ts · dataSources.ts                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Infra                                                       │   │
│  │                                                               │   │
│  │  scanner.ts → varredura de diretórios c/ scan_log            │   │
│  │  queue.ts + queueWorker.ts → fila de processamento bg        │   │
│  │  auth.ts (JWT) + validate.ts (zod-like)                      │   │
│  │  modelCache.ts → cache de modelos LLM (24h)                  │   │
│  │  simulatorAi.ts → IA para avaliação no simulador de crise    │   │
│  │  crypto.ts → AES-256-CBC para API keys                       │   │
│  │  logger.ts → logging estruturado                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. DIAGRAMA DE SEQUÊNCIA — FLUXO PRINCIPAL

### 3.1 Pipeline de Análise de Documento

```
Scanner         Queue        TextExtractor    NLP Service    Classifier     EntityExtractor    KnowledgeGraph
   │               │               │               │              │                │                 │
   │ scan folders  │               │               │              │                │                 │
   │──────────────>│               │               │              │                │                 │
   │               │               │               │              │                │                 │
   │  insert files │               │               │              │                │                 │
   │<──────────────│               │               │              │                │                 │
   │               │               │               │              │                │                 │
   │               │ enqueue files │               │              │                │                 │
   │               │──────────────>│               │              │                │                 │
   │               │               │               │              │                │                 │
   │               │               │ extract text  │              │                │                 │
   │               │               │──────────────>│              │                │                 │
   │               │               │               │              │                │                 │
   │               │               │  raw_text     │              │                │                 │
   │               │               │<──────────────│              │                │                 │
   │               │               │               │              │                │                 │
   │               │               │  keywords     │              │                │                 │
   │               │               │──────────────>│              │                │                 │
   │               │               │  summary      │              │                │                 │
   │               │               │  topics       │              │                │                 │
   │               │               │               │              │                │                 │
   │               │               │  classify     │              │                │                 │
   │               │               │─────────────────────────────>│                │                 │
   │               │               │               │              │                │                 │
   │               │               │  docType +    │              │                │                 │
   │               │               │  confidence   │              │                │                 │
   │               │               │<─────────────────────────────│                │                 │
   │               │               │               │              │                │                 │
   │               │               │  extract      │              │                │                 │
   │               │               │  entities     │              │                │                 │
   │               │               │──────────────────────────────────────────────>│                 │
   │               │               │               │              │                │                 │
   │               │               │  relations    │              │                │                 │
   │               │               │───────────────────────────────────────────────────────────────>│
   │               │               │               │              │                │                 │
```

### 3.2 Fluxo de Consulta do Usuário

```
Usuário (Browser)         Frontend React            API Express              LLM (opcional)
       │                       │                        │                        │
       │   digita pergunta     │                        │                        │
       │──────────────────────>│                        │                        │
       │                       │  POST /api/consult     │                        │
       │                       │───────────────────────>│                        │
       │                       │                        │                        │
       │                       │                        │  detectar intenção     │
       │                       │                        │  buscar documentos     │
       │                       │                        │  (full-text search)    │
       │                       │                        │                        │
       │                       │                        │  (se API configurada)  │
       │                       │                        │  enviar prompt p/ LLM  │
       │                       │                        │───────────────────────>│
       │                       │                        │                        │
       │                       │                        │  resposta + docs ref   │
       │                       │                        │<───────────────────────│
       │                       │                        │                        │
       │                       │  resposta + docs       │                        │
       │                       │<───────────────────────│                        │
       │                       │                        │                        │
       │  exibe resposta       │                        │                        │
       │  com documentos       │                        │                        │
       │  referenciados        │                        │                        │
       │<──────────────────────│                        │                        │
```

### 3.3 Fluxo de Importação Inteligente (Power BI)

```
Usuário (Browser)         Frontend               API Import           SchemaInferrer      DynamicTable    Relationship
       │                    │                        │                     │                   │               │
       │  clica Preview     │                        │                     │                   │               │
       │───────────────────>│                        │                     │                   │               │
       │                    │  POST /import/preview  │                     │                   │               │
       │                    │───────────────────────>│                     │                   │               │
       │                    │                        │  infere schema      │                   │               │
       │                    │                        │────────────────────>│                   │               │
       │                    │                        │                     │                   │               │
       │                    │                        │  schema + colunas   │                   │               │
       │                    │                        │<────────────────────│                   │               │
       │                    │                        │                     │                   │               │
       │                    │  preview com amostra   │                     │                   │               │
       │                    │<───────────────────────│                     │                   │               │
       │                    │                        │                     │                   │               │
       │  confirma import   │                        │                     │                   │               │
       │───────────────────>│  POST /import/confirm  │                     │                   │               │
       │                    │───────────────────────>│                     │                   │               │
       │                    │                        │  cria tabela        │                   │               │
       │                    │                        │──────────────────────────────────────>│               │
       │                    │                        │                     │                   │               │
       │                    │                        │  insere dados       │                   │               │
       │                    │                        │──────────────────────────────────────>│               │
       │                    │                        │                     │                   │               │
       │                    │                        │  detecta relac.     │                   │               │
       │                    │                        │────────────────────────────────────────────────────>│
       │                    │                        │                     │                   │               │
       │                    │  resultado + linhas   │                     │                   │               │
       │                    │<───────────────────────│                     │                   │               │
       │<───────────────────│                        │                     │                   │               │
```

---

## 4. MODELO DE DADOS

### 4.1 Entidades Principais (23 tabelas)

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│    files     │──1:N──│  document_text   │       │ structured_data   │
├──────────────┤       ├──────────────────┤       ├───────────────────┤
│ id (PK)      │       │ file_id (FK)     │       │ id (PK)           │
│ name         │       │ raw_text         │       │ source_file_id(FK)│
│ full_path    │       │ status           │       │ schema_type       │
│ extension    │       └──────┬───────────┘       │ data (JSON)       │
│ size_bytes   │              │ FTS4              │ theme             │
│ last_modified│    ┌─────────▼──────────┐        │ confidence        │
│ doc_type     │    │ document_text_fts  │        └───────────────────┘
│ doc_type_    │    │ (virtual, FTS4)    │
│  confidence  │    └────────────────────┘        ┌───────────────────┐
│ plan_section │                                  │ document_sections │
│ entities     │       ┌──────────────────┐       ├───────────────────┤
│ category     │──1:N──│ document_summary │       │ id (PK)           │
│ needs_review │       ├──────────────────┤       │ file_id (FK)      │
│ md5_hash     │       │ file_id (FK)     │       │ section_title     │
│ relations_com│       │ summary          │       │ content           │
│ graph_compute│       │ keywords         │       │ has_table         │
└──────┬───────┘       │ topics           │       │ table_data (JSON) │
       ├──│ document_vectors   │          │       │ extracted_entities│
       │  ├────────────────────┤          │       └───────────────────┘
       │  │ file_id (PK)       │          │
       │  │ term (PK)          │          │       ┌───────────────────┐
       │  │ tfidf_score        │          │       │ classification_   │
       │  └────────────────────┘          │       │ feedback          │
       │                                  │       ├───────────────────┤
       │  ┌────────────────────┐          │       │ file_id (FK)      │
       │  │ document_relations │          │       │ original_type     │
       │  ├────────────────────┤          │       │ corrected_type    │
       │  │ file_id_1 (FK)     │          │       └───────────────────┘
       │  │ file_id_2 (FK)     │          │
       │  │ similarity_score   │          │       ┌───────────────────┐
       │  └────────────────────┘          │       │document_embeddings│
       │                                  │       ├───────────────────┤
       │  ┌────────────────────┐          │       │ file_id (PK)      │
       │  │ schema_cache       │          │       │ embedding (BLOB)  │
       │  ├────────────────────┤          │       └───────────────────┘
       │  │ id (PK)            │          │
       │  │ file_id (FK)       │          │       ┌──────────────┐
       │  │ detected_schema    │          │       │ data_sources │
       │                                              ├──────────────┤
       │  ┌────────────────────┐      ┌──────────────┐│ path         │
       └──│ document_clusters  │      │ contacts     ││ type         │
          ├────────────────────┤      ├──────────────┤│ active       │
          │ id (PK)            │      │ name         │└──────────────┘
          │ name               │      │ role         │
          │ description        │      │ organization │  ┌──────────────┐
          │ file_ids           │      │ phone        │  │ file_blobs   │
          │ theme_words        │      │ email        │  ├──────────────┤
          └────────────────────┘      └──────────────┘  │ file_id (PK) │
          ┌──────────────────────────────┐              │ data (BLOB)  │
          │  scan_log                    │              └──────────────┘
          ├──────────────────────────────┤              ├──────────────────┤
          │ source_id · source_label     │              │ check_date (PK)  │
          │ new_count · modified_count   │              │ year, month, day │
          │ removed_count · total_files  │              │ documents_count  │
          │ online · scanned_at          │              └──────────────────┘
          └──────────────────────────────┘
          ┌──────────────────────────────┐              ┌─────────────────────────┐
          │  knowledge_relations         │              │ simulator_scenarios     │
          ├──────────────────────────────┤              ├─────────────────────────┤
          │ source_type · source_id     │              │ title · description     │
          │ target_type · target_id     │              │ options · difficulty    │
          │ relation_type               │              │ category · source      │
          │ confidence                  │              └─────────────────────────┘
          │ metadata (JSON)             │
          └──────────────────────────────┘
┌──────────────────┐    ┌──────────────────┐
│ talking_points_  │    │     settings     │   ┌──────────────────┐
│ matrix           │    ├──────────────────┤   │ processing_queue │
├──────────────────┤    │ key (PK)         │   ├──────────────────┤
│ title · category │    │ value            │   │ file_id (FK)     │
│ approved         │    └──────────────────┘   │ stage · status   │
│ restricted       │                           │ retry_count      │
└──────────────────┘                           │ max_retries (3)  │
                                               └──────────────────┘
┌──────────────────┐    ┌──────────────────┐
│  photo_events    │──1:N│    photos         │──1:N──┐
├──────────────────┤    ├──────────────────┤       │
│ event_name       │    │ event_id (FK)    │       │
│ event_date       │    │ filename         │       │
│ source_path      │    │ source_path      │       │
│ photo_count      │    │ thumbnail_path   │       │
└──────────────────┘    └──────────────────┘       │
                                          ┌────────┘
                                          ▼
                              ┌────────────────────────┐
                              │ photo_document_links   │
                              ├────────────────────────┤
                              │ photo_event_id (FK)    │
                              │ document_id (FK)       │
                              │ match_type · confidence│
                              └────────────────────────┘
```

### 4.2 Tabelas Dinâmicas

Criadas sob demanda pelo `dynamicTableGenerator.ts` quando o usuário importa planilhas. Cada schema inferido gera uma tabela SQLite com:

- Colunas mapeadas do schema (nome + tipo inferido)
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `source_file_id INTEGER` (ref. `files.id`)
- `imported_at TEXT`
- Índices automáticos

---

## 5. DECISÕES ARQUITETURAIS

### 5.1 Por que SQLite (sql.js WASM) em vez de PostgreSQL/MySQL?

| Fator | Decisão |
|---|---|
| **Implantação** | Zero configuração — sem servidor de banco externo |
| **Portabilidade** | Banco em arquivo único (`data/files.db`), copiável |
| **Performance** | Mais que suficiente para ~milhares de documentos |
| **Embedded** | Ideal para aplicação desktop/servidor local |
| **sql.js vs better-sqlite3** | sql.js escolhido por ser WASM puro — sem dependência nativa de compilação, máxima portabilidade entre plataformas |

### 5.2 Por que Classificação Híbrida (IA + Regras)?

| Abordagem | Quando usada |
|---|---|
| **LLM (OpenCode/OpenAI)** | API configurada e disponível — retorna docType + confidence |
| **Regex (classifier.ts)** | API indisponível ou confidence < 0.6 — fallback automático |
| **Feedback Loop** | Reclassificações manuais salvam em `classification_feedback` |

### 5.3 Por que Processamento em Fila (Queue)?

- Evita sobrecarga no servidor durante análise em lote
- Permite pausar/retomar o processamento
- Tracking de progresso item a item (pending → processing → completed / dead_letter)
- Retry com exponential backoff (até 3 tentativas)
- Etapas sequenciais: extract → analyze → structure → relations → clusters → knowledge → simulator

### 5.4 Scanner Incremental com Scan Log

O scanner (`scanner.ts`) opera com sincronização incremental por `source_id`:

- **Arquivos novos** → inseridos no banco e enfileirados para processamento
- **Arquivos modificados** (MD5 diferente) → atualizados e re-enfileirados
- **Arquivos removidos do disco** → deletados em cascata (blob, queue, relações, seções, vetores)
- **Fontes offline** → preserva dados existentes, registra `online: false` no scan_log
- **Scan log** → cada execução registra `new_count`, `modified_count`, `removed_count`, `total_files` por fonte na tabela `scan_log`
- **Histórico** → endpoint `/api/scanner/stats` retorna logs das últimas 200 execuções + resumo por fonte
- **Trigger manual** → `POST /api/scanner/trigger` para execução sob demanda
- **Proteção contra duplicatas** → `data_sources.path` tem índice UNIQUE; o endpoint `POST /api/data-sources` verifica duplicidade antes de inserir (HTTP 409 se conflito)

### 5.6 Autenticação JWT

- Todas as rotas `/api/*` protegidas por middleware JWT (exceto `/api/ping` e `/api/auth/login`)
- Autenticação via senha mestra (`MASTER_PASSWORD` no `.env`)
- Token JWT com expiração de 24h, enviado via header `Authorization: Bearer <token>`
- Ideal para ambiente de intranet onde segurança via rede local é suficiente

---

## 6. SEGURANÇA

### 6.1 Implementado

- ✅ Autenticação JWT com senha mestra via `.env` (`MASTER_PASSWORD`)
- ✅ Rate limiting (100 req/min) com mensagens em português
- ✅ Validação de input em todas as rotas (middleware `validate.ts`)
- ✅ Criptografia AES-256-CBC com derivação scrypt para API keys no banco
- ✅ Sanitização de caminhos de arquivo (proteção path traversal)
- ✅ Scanner com proteção contra command injection (`spawn` com `shell: false`)

---

## 7. MÉTRICAS DO SISTEMA

| Métrica | Descrição | Endpoint |
|---|---|---|
| Total de documentos | Contagem de arquivos indexados | `/api/dashboard` |
| Taxa de extração | % de documentos com texto extraído | `/api/health` |
| Taxa de classificação | % de documentos classificados | `/api/health` |
| Score de saúde | 0-100 baseado em cobertura, atualização | `/api/plan/health` |
| Gaps detectados | Protocolos desatualizados, seções faltando | `/api/plan/gaps` |
| Tabelas importadas | Contagem de tabelas dinâmicas | `/api/import/tables` |
| Relações no grafo | Conexões no grafo de conhecimento | `/api/knowledge-graph` |
| Progresso da fila | Itens processados / pendentes | `/api/queue/status` |
| Scanner (último) | Novos/Modificados/Removidos por fonte | `/api/scanner/stats` |
| Fontes de dados | Contagem de arquivos por fonte | `/api/dashboard` (campo `sources`) |

---

## 8. PLANOS FUTUROS

Os planos de evolução estão documentados em `docs/planos/`:

| Plano | Foco | Prioridade |
|---|---|---|
| `PLANO_IMPORTACAO_INTELIGENTE.md` | Motor de importação estilo Power BI | ✅ Concluído |
| `PLANO_DE_MELHORIAS.md` | UI/UX, design system, funcionalidades operacionais | 🔵 Média |
| `PLANO_TRANSFORMACAO_NOTA_9.md` | Segurança, arquitetura, qualidade de código | 🔴 Alta |
| `PLANO_IA_IMPORTACAO_INTELIGENTE.md` | IA para classificação e extração semântica | 🟢 Normal |
| `PLANO_USO_IA.md` | Guia de uso dos provedores de IA (OpenCode/OpenAI) | 🟢 Normal |

> ℹ️ O **serviço Python** (`python_service/`) oferece endpoints complementares de NLP — NER com spaCy e embeddings com Sentence-Transformers — e é opcional para o funcionamento do sistema. A aplicação opera integralmente sem ele usando TF-IDF interno.

---

## 9. GLOSSÁRIO

| Termo | Significado |
|---|---|
| **ASCOM** | Assessoria de Comunicação |
| **Novacap** | Companhia de Urbanização da Nova Capital do Brasil |
| **GDF** | Governo do Distrito Federal |
| **Plano de Comunicação** | Documento técnico que define fluxos, protocolos e padrões da ASCOM |
| **Protocolo de Crise** | Conjunto de procedimentos pré-validados para situações de crise |
| **Porta-Voz** | Pessoa autorizada a falar oficialmente pela empresa |
| **Structured Data** | Dados tabulares importados de planilhas com schema detectado |
| **Knowledge Graph** | Grafo de relacionamentos entre documentos, entidades e contatos |
| **TF-IDF** | Term Frequency-Inverse Document Frequency — técnica de ponderação de termos |
| **OCR** | Optical Character Recognition — reconhecimento de texto em imagens |

---

## 10. REFERÊNCIAS

- Express 4.x: https://expressjs.com/
- React 18: https://react.dev/
- Vite 6: https://vitejs.dev/
- sql.js: https://sql.js.org/
- vis-network: https://visjs.github.io/vis-network/
- tesseract.js: https://tesseract.projectnaptha.com/
- spaCy: https://spacy.io/
- Sentence-Transformers: https://www.sbert.net/
- OpenCode: https://opencode.ai/
