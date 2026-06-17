# Plano de Comunicação — NOVACAP / ASCOM

Sistema inteligente de gerenciamento documental, consulta operacional e **inteligência institucional** para a **Assessoria de Comunicação (ASCOM)** da **Companhia de Urbanização da Nova Capital do Brasil (Novacap/GDF)**.

Em termos de mercado, o sistema funciona como uma **Plataforma de Inteligência Operacional para Comunicação Institucional**, combinando:

- gestão do conhecimento;
- gestão documental inteligente;
- busca semântica;
- command center de comunicação;
- agentes de IA;
- processamento em fila;
- atualização automática das áreas do painel.

Ele transforma uma pasta de rede com documentos institucionais — PDF, DOCX, XLSX, imagens e outros formatos — em uma **base de conhecimento pesquisável, analisável e acionável**, com classificação por IA, grafo de conhecimento, chat consultivo, simulação de crise e suporte à tomada de decisão.

---

## Visão Executiva

O sistema não é um ERP nem um CRM.

Ele não controla estoque, compras, financeiro ou clientes. A função central é organizar e interpretar o conhecimento institucional da comunicação.

```txt
Documentos e dados entram
  ↓
Scanner e fila processam arquivos
  ↓
IA/NLP classificam, resumem, extraem entidades e estruturam dados
  ↓
Agentes enriquecem a base, avaliam risco e atualizam o painel
  ↓
ASCOM consulta, decide, produz conteúdo e gerencia crise
```

A proposta final é uma central de inteligência para que a comunicação institucional tenha contexto, velocidade, rastreabilidade e apoio operacional.

---

## Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| **Scanner de Documentos** | Varre diretórios configurados, indexa metadados e registra estatísticas por scan. |
| **Extração Multi-formato** | PDF, DOCX, XLSX, PPTX, imagens com OCR, TXT, CSV, JSON, XML, HTML e outros formatos. |
| **Classificação por IA** | Classifica documentos por tipo e seção do plano, com fallback baseado em regras. |
| **Resumo e NLP Local** | Gera resumos, palavras-chave, tópicos e vetores TF-IDF. |
| **Entidades e Embeddings** | Extrai pessoas, órgãos, datas, locais e valores; usa spaCy e sentence-transformers no serviço Python opcional. |
| **Chat Consultivo** | Assistente que responde perguntas com base nos documentos e cita fontes internas. |
| **Central de Agentes ASCOM** | Orquestrador que escolhe agentes especializados para documentos, crise, conteúdo, dados, simulação, grafo, planejamento e risco. |
| **Agentes de Fila** | Agentes em segundo plano que registram logs de extração, análise, risco, estruturação, relações, clusters, conhecimento, simulador e site_sync. |
| **Site Agents** | Subagentes que atualizam automaticamente snapshots das páginas essenciais, ferramentas e base de dados. |
| **Importador Universal** | Preview, confirmação, schema inteligente, deduplicação, tabelas dinâmicas e relacionamentos. |
| **Painel de Crise** | Protocolos, porta-vozes, checklist, prontidão, risco e matriz de fala. |
| **Simulador de Crise** | Cenários interativos com opções, pontuação, feedback e geração automática a partir de documentos. |
| **Grafo de Conhecimento** | Visualização interativa de relações entre documentos, entidades, clusters, contatos e dados estruturados. |
| **Saúde do Plano** | Score de completude, lacunas, cobertura por seção e recomendações. |
| **Calendário e Timeline** | Heatmap de atividade documental, check-ins e linha do tempo. |
| **Galeria de Fotos** | Organização por eventos, thumbnails e vínculo com documentos. |
| **Gerador de Release** | Geração de textos institucionais e releases a partir de templates e contexto. |
| **Tema Claro/Escuro** | Design system com suporte a tema dark e light. |

---

## Arquitetura de Inteligência

O sistema passou a ter três camadas de agentes.

```txt
1. Agentes Interativos
   Respondem perguntas e apoiam decisões.

2. Agentes de Fila
   Processam documentos automaticamente, geram logs, avaliam risco e enriquecem a base.

3. Site Agents
   Atualizam snapshots inteligentes para as páginas do painel.
```

### 1. Agentes Interativos

Localizados em:

```txt
backend/src/agents/
```

Principais agentes:

- `documentAgent` — consulta documental;
- `classifierAgent` — classificação de documentos;
- `crisisAgent` — orientação de crise;
- `spokespersonAgent` — porta-voz e falas autorizadas;
- `contentAgent` — geração de conteúdo institucional;
- `dataAgent` — dados e planilhas;
- `simulatorAgent` — cenários de treinamento;
- `graphAgent` — grafo e relações;
- `planningAgent` — planejamento e gargalos;
- `riskAgent` — risco institucional.

Endpoint principal:

```txt
POST /api/agents/ask
```

---

### 2. Agentes de Fila

Localizados em:

```txt
backend/src/queueAgents/
```

Atuam sobre a fila de processamento:

```txt
extract
analyze
risk
structure
relations
clusters
knowledge
simulator
site_sync
```

Principais agentes:

- `extractQueueAgent`;
- `analyzeQueueAgent`;
- `riskQueueAgent`;
- `structureQueueAgent`;
- `relationQueueAgent`;
- `clusterQueueAgent`;
- `knowledgeQueueAgent`;
- `simulatorQueueAgent`;
- `siteSyncQueueAgent`.

Endpoints úteis:

```txt
GET /api/queue/agents
GET /api/queue/agent-logs
GET /api/queue/agent-logs?stage=site_sync
GET /api/queue/agent-logs?riskLevel=alto
```

A tabela `queue_agent_logs` registra agente, estágio, status, confiança, risco, resumo, ação recomendada e metadados.

---

### 3. Site Agents

Localizados em:

```txt
backend/src/siteAgents/
```

Atualizam automaticamente a camada `site_area_snapshots`, usada para alimentar páginas do painel com dados já tratados.

Primeiros subagentes implementados:

| Agente | Área | Página |
|---|---|---|
| `essentialOverviewAgent` | Essencial | Painel |
| `essentialAlertsAgent` | Essencial | Painel |
| `crisisReadinessAgent` | Essencial | Crise |
| `draftPreparationAgent` | Ferramentas | Rascunhar |
| `dataQualityAgent` | Base de Dados | Saúde / Documentos |
| `graphEnrichmentAgent` | Base de Dados | Grafo |
| `planCoverageAgent` | Base de Dados | Plano |

Worker periódico:

```txt
backend/src/siteAgents/siteSyncWorker.ts
```

Endpoints:

```txt
GET /api/site-agents
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/:area
GET /api/site-agents/snapshots/:area/:page
POST /api/site-agents/run
```

Exemplos:

```txt
GET /api/site-agents/snapshots/essencial
GET /api/site-agents/snapshots/ferramentas
GET /api/site-agents/snapshots/dados
GET /api/site-agents/snapshots/essencial/dashboard
```

---

## Stack Tecnológica

### Backend

| Tecnologia | Uso |
|---|---|
| Node.js + Express 4.21 | Servidor HTTP |
| TypeScript 5.6 | Linguagem principal |
| sql.js / SQLite WASM | Banco embarcado |
| JWT | Autenticação |
| express-rate-limit | Proteção básica contra abuso |
| natural | TF-IDF e NLP local |
| pdf-parse, mammoth, xlsx, word-extractor | Extração de texto e dados |
| tesseract.js | OCR de imagens |
| sharp | Thumbnails e processamento de imagem |
| OpenAI-compatible chat completions | Classificação, schema, agentes, simulação e conteúdo |

### Frontend

| Tecnologia | Uso |
|---|---|
| React 18 + Vite 6 | SPA e build |
| TypeScript 5.6 | Linguagem |
| react-router-dom 7 | Roteamento com HashRouter |
| @tanstack/react-query 5 | Estado assíncrono |
| vis-network + vis-data | Grafo interativo |
| lucide-react | Ícones |

### Python opcional

| Tecnologia | Uso |
|---|---|
| FastAPI | Serviço auxiliar HTTP na porta 8000 |
| spaCy 3.7 | NER com `pt_core_news_sm` |
| sentence-transformers | Embeddings semânticos e processamento em lote |
| pdfplumber | Extração avançada de PDF |

---

## Estrutura do Projeto

```txt
/
├── backend/
│   └── src/
│       ├── index.ts                  # Servidor Express, rotas, workers e startup
│       ├── database.ts               # Camada principal de dados
│       ├── scanner.ts                # Scanner de diretórios
│       ├── analyze.ts                # Pipeline de análise completo
│       ├── queue.ts                  # Fila de processamento
│       ├── queueWorker.ts            # Worker principal da fila
│       ├── agents/                   # Agentes interativos e orquestrador ASCOM
│       ├── queueAgents/              # Agentes de fila e logs por estágio
│       ├── siteAgents/               # Site Agents, snapshots e worker periódico
│       ├── routes/                   # Rotas da API
│       ├── analysis/                 # NLP, IA, grafo, relações, clusters
│       ├── processors/               # Processadores de arquivos
│       ├── db/                       # Módulos especializados de banco
│       ├── middleware/               # Auth JWT + validação
│       ├── services/                 # Serviços de IA, cache, simulador
│       ├── lib/                      # Logger + criptografia
│       └── shared/                   # Constantes + stopwords
├── frontend/
│   └── src/
│       ├── App.tsx                   # App React
│       ├── api.ts                    # Cliente API centralizado
│       ├── pages/                    # Páginas do painel
│       ├── components/               # Componentes compartilhados
│       ├── theme.ts                  # Design system
│       └── ThemeContext.tsx          # Contexto de tema
├── docs/
│   ├── BLUEPRINT.md                  # Blueprint técnico da arquitetura
│   ├── README.md                     # Índice de documentação
│   ├── planos/                       # Planos de evolução e implantação
│   └── mockups/                      # Mockups das telas principais
├── python_service/                   # Serviço opcional de NLP/embeddings
├── start.bat                         # Script de inicialização
└── opencode.jsonc                    # Config do provedor de IA
```

---

## Instalação e Uso

### Pré-requisitos

- Node.js 18+
- npm

### Instalar dependências

```bash
npm install
npm run install:all
```

### Configurar

Copie e edite o arquivo de ambiente:

```bash
cp backend/.env.example backend/.env
```

Campos obrigatórios:

- `MASTER_PASSWORD` — senha de acesso ao sistema;
- `APP_SECRET` — 32 caracteres para criptografia AES-256-CBC das chaves de API;
- `JWT_SECRET` — chave para assinatura dos tokens JWT.

A IA pode ser configurada pela tela de Settings ou pelas variáveis de ambiente. O padrão é OpenCode com modelo `opencode/deepseek-v4-flash-free`.

### Iniciar em desenvolvimento

```bash
npm run dev
```

Isso inicia:

- backend em `http://localhost:3001`;
- frontend em `http://localhost:5173`.

### Rodar serviços separadamente

```bash
npm run dev:backend
npm run dev:frontend
```

### Escanear documentos

```bash
npm run scan
```

### Pipeline completo

```bash
cd backend
npm run full
```

### Serviço Python opcional

```bash
cd python_service
pip install -r requirements.txt
python -m spacy download pt_core_news_sm
uvicorn main:app --port 8000
```

---

## Workers e Processamento em Segundo Plano

Ao iniciar o backend, o sistema inicializa:

- banco SQLite;
- fila de processamento;
- cache de modelos;
- worker da fila;
- worker periódico dos Site Agents;
- scanner periódico.

Fluxo principal:

```txt
Scanner identifica documentos
  ↓
processing_queue recebe estágios
  ↓
queueWorker executa processamento
  ↓
queueAgents registram logs e risco
  ↓
site_sync chama Site Agents
  ↓
site_area_snapshots atualiza o painel
```

---

## Rotas da API

As rotas estão organizadas por domínio funcional.

| Grupo | Descrição |
|---|---|
| `/api/files` | Arquivos indexados |
| `/api/dashboard` | KPIs e cards do painel |
| `/api/documents` | Detalhes, seções e relacionados |
| `/api/search` | Busca textual e contextual |
| `/api/operational` | Painel operacional, seções e alertas |
| `/api/consult` | Chat consultivo |
| `/api/agents` | Agentes interativos ASCOM |
| `/api/crisis` | Protocolos, porta-vozes e checklist |
| `/api/health` | Saúde do plano |
| `/api/plan` | Cobertura e plano de comunicação |
| `/api/graph` | Grafo visual |
| `/api/knowledge-graph` | Rede de conhecimento |
| `/api/timeline` | Timeline documental |
| `/api/structured-data` | Dados estruturados |
| `/api/import` | Importação inteligente |
| `/api/settings` | Configurações de IA |
| `/api/contacts` | Contatos e mailing |
| `/api/calendar` | Calendário e heatmap |
| `/api/photos` | Galeria de fotos |
| `/api/data-sources` | Fontes de dados |
| `/api/generator` | Gerador de releases |
| `/api/simulator` | Simulador de crise |
| `/api/reports` | Relatórios executivos |
| `/api/annual-report` | Relatório anual |
| `/api/queue` | Fila, agentes da fila e logs |
| `/api/site-agents` | Snapshots inteligentes por página |
| `/api/metrics` | Métricas do sistema |
| `/api/advisor` | Recomendações de carga e gaps |
| `/api/talking-points` | Matriz de falas autorizadas |
| `/api/scanner` | Estatísticas e execução do scanner |

---

## Estrutura do Banco

O banco fica em:

```txt
backend/data/files.db
```

Principais tabelas:

- `files` — metadados dos arquivos;
- `document_text` — texto extraído e FTS;
- `document_summary` — resumo, keywords, tópicos;
- `document_vectors` — vetores TF-IDF;
- `document_embeddings` — embeddings semânticos;
- `document_relations` — similaridades;
- `document_clusters` — clusters;
- `document_sections` — seções hierárquicas;
- `structured_data` — dados estruturados;
- `knowledge_relations` — grafo de conhecimento;
- `classification_feedback` — feedback manual;
- `contacts` — contatos de imprensa;
- `settings` — configurações;
- `file_blobs` — blobs originais;
- `simulator_scenarios` — cenários de crise;
- `talking_points_matrix` — matriz de fala;
- `photo_events` e `photos` — galeria;
- `photo_document_links` — vínculo foto/documento;
- `data_sources` — fontes de dados;
- `scan_log` — histórico do scanner;
- `calendar_checks` — check-ins de calendário;
- `processing_queue` — fila de processamento;
- `queue_agent_logs` — logs dos agentes de fila;
- `site_area_snapshots` — snapshots inteligentes das páginas;
- tabelas dinâmicas criadas pelo importador.

---

## Documentação

A documentação está em:

```txt
docs/
```

Principais arquivos:

- `docs/README.md` — índice da documentação;
- `docs/BLUEPRINT.md` — blueprint técnico da arquitetura;
- `docs/planos/PLANO_AGENTES_ASCOM.md` — agentes interativos;
- `docs/planos/PLANO_AGENTES_FILA_ASCOM.md` — agentes de fila;
- `docs/planos/PLANO_AGENTES_SITE_ASCOM.md` — Site Agents;
- `docs/planos/PLANO_WORKERS_SITE_AGENTS_ASCOM.md` — workers dos Site Agents.

---

## Licença

Sistema interno — NOVACAP / ASCOM
