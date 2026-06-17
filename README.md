# Plano de Comunicação — NOVACAP / ASCOM

Sistema inteligente de gerenciamento documental e consulta operacional para a **Assessoria de Comunicação (ASCOM)** da **Companhia de Urbanização da Nova Capital do Brasil (Novacap/ GDF)**.

Transforma uma pasta de rede com documentos institucionais (PDF, DOCX, XLSX) em uma **base de conhecimento inteligente e pesquisável**, com classificação por IA, grafo de conhecimento, chat consultivo e suporte à tomada de decisão em crises.

---

## Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| **📂 Scanner de Documentos** | Varre diretórios configurados, indexa metadados e registra estatísticas por scan |
| **🔍 Extração Multi-formato** | PDF, DOCX, XLSX, PPTX, imagens (OCR), TXT, CSV e mais |
| **🤖 Classificação por IA** | 12 tipos documentais com fallback baseado em regras |
| **💬 Chat Inteligente** | Assistente com IA que responde perguntas sobre o plano |
| **📊 Importador Universal** | Extrai PDF/DOCX/Excel/JSON/XML, detecta tipos semânticos (CPF, CNPJ) via Regex/IA, faz cache de schema e deduplica linhas com MD5 |
| **🚨 Painel de Crise** | Protocolos, porta-vozes, checklist interativo e simulador |
| **🕸️ Grafo de Conhecimento** | Visualização interativa de relações entre documentos |
| **📋 Saúde do Plano** | Score de completude, gaps detecção e timeline de atualizações |
| **📅 Calendário e Timeline** | Heatmap de atividade documental e linha do tempo |
| **📸 Galeria de Fotos** | Organização por eventos, thumbnails e vínculo com documentos |
| **📰 Gerador de Release** | Template engine para releases de crise e padrão |
| **🎮 Simulador de Crise** | Cenários interativos com pontuação e feedback |
| **🌙 Tema Claro/Escuro** | Design system completo com temas dark e light |

---

## Stack Tecnológica

### Backend
| Tecnologia | Uso |
|---|---|
| Node.js + Express 4.21 | Servidor HTTP |
| TypeScript 5.6 | Linguagem |
| sql.js (SQLite WASM) | Banco de dados embarcado |
| JWT | Autenticação |
| natural (TF-IDF) | NLP local |
| pdf-parse, mammoth, xlsx | Extração de texto |
| tesseract.js | OCR |
| sharp | Thumbnails de imagens |

### Frontend
| Tecnologia | Uso |
|---|---|
| React 18 + Vite 6 | Framework e build |
| TypeScript 5.6 | Linguagem |
| react-router-dom 7 | Roteamento SPA (HashRouter) |
| vis-network + vis-data | Grafo interativo |
| @tanstack/react-query 5 | Gerenciamento de estado assíncrono |
| lucide-react | Ícones |

### Python (serviço complementar de NLP)
| Tecnologia | Uso |
|---|---|
| FastAPI | Servidor HTTP (porta 8000) |
| spaCy 3.7 | NER (modelo pt_core_news_sm) |
| sentence-transformers | Embeddings semânticos com suporte a processamento em lote (`/embeddings_batch`) |
| pdfplumber | Extração avançada de PDF |

---

## Estrutura do Projeto

```
/
├── backend/
│   └── src/
│       ├── index.ts              # Servidor Express (porta 3001) + Config Express + CORS
│       ├── database.ts           # Camada de dados principal
│       ├── scanner.ts            # Escaneamento de diretórios
│       ├── analyze.ts            # Pipeline de análise completo
│       ├── routes/               # 28 grupos de rotas (60+ endpoints)
│       ├── analysis/             # 14 módulos de análise e IA
│       ├── processors/           # 11 processadores de arquivos
│       ├── db/                   # 12 módulos de banco de dados
│       ├── middleware/           # Auth JWT + validação
│       ├── services/             # Cache de modelo + IA do simulador
│       ├── lib/                  # Logger + criptografia
│       └── shared/               # Constantes + stopwords
├── frontend/
│   └── src/
│ ├── App.tsx               # HashRouter SPA (20 lazy-loaded + LoginPage)
│ ├── api.ts                # Cliente API centralizado
│ ├── pages/                # 21 páginas (20 lazy-loaded + LoginPage)
│ ├── components/           # 23 componentes compartilhados
│       ├── theme.ts              # Design system dark/light
│       └── ThemeContext.tsx       # Contexto de tema
├── docs/
│   ├── planos/                   # Planos de implantação e melhorias
│   └── mockups/                  # Mockups das telas principais
├── start.bat                     # Script de inicialização
└── opencode.jsonc                # Config do provedor de IA
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
Copie e edite o arquivo de configuração:
```bash
cp backend/.env.example backend/.env
```

Campos obrigatórios:
- `MASTER_PASSWORD` — senha de acesso ao sistema (sem ela o servidor não inicia)
- `APP_SECRET` — 32 caracteres para criptografia AES-256-CBC das chaves de API
- `JWT_SECRET` — chave para assinatura dos tokens JWT (se vazio, é auto-gerada com aviso)

(Opcional) Configure o provedor de IA pela interface de Settings (http://localhost:5173/#/settings) ou pelas variáveis de ambiente. Provedor padrão: OpenCode (gratuito, modelo `opencode/deepseek-v4-flash-free`).

### Iniciar (desenvolvimento)
```bash
npm run dev
```

Isso inicia backend (porta 3001) e frontend (porta 5173) simultaneamente.

### Iniciar serviços separadamente
```bash
npm run dev:backend   # Backend na porta 3001
npm run dev:frontend  # Frontend na porta 5173
```

### Escanear documentos
```bash
npm run scan
```

### Pipeline completo (scan + análise)
```bash
cd backend
npm run full
```

### Serviço Python (opcional — NER + embeddings avançados)
```bash
cd python_service
pip install -r requirements.txt
python -m spacy download pt_core_news_sm
uvicorn main:app --port 8000
```

---

## Rotas da API (60+ endpoints)

As rotas estão organizadas em 28 grupos:

| Grupo | Endpoints | Descrição |
|---|---|---|
| `/api/files` | GET, POST | Listar, buscar e abrir arquivos |
| `/api/dashboard` | GET | Visão geral do painel (cards, KPIs, tabelas) |
| `/api/documents/:id` | GET | Detalhe, visualização, relacionados |
| `/api/search` | GET, POST | Busca全文 com sugestões e busca semântica |
| `/api/operational` | GET, POST | Painel operacional, seções, alertas |
| `/api/consult` | GET, POST | Chat consultivo com IA (com citação de fontes) |
| `/api/crisis` | GET | Protocolos, porta-vozes, checklist, indicadores |
| `/api/health` | GET | Saúde do plano, gaps detectados |
| `/api/plan` | GET | Score de completude por seção |
| `/api/graph` | GET | Dados do grafo de conhecimento (vis-network) |
| `/api/timeline` | GET | Timeline cronológica de documentos |
| `/api/structured-data` | GET, DELETE | Dados estruturados importados |
| `/api/import` | POST, GET | Importação inteligente (preview, confirmar, tabelas) |
| `/api/settings` | GET, POST | Configurações de IA (provider, modelo, chave) |
| `/api/contacts` | GET, POST, DELETE | Contatos de imprensa |
| `/api/calendar` | GET, POST | Heatmap de atividade e check-in diário |
| `/api/photos` | GET, POST | Galeria de fotos por evento |
| `/api/data-sources` | GET, POST, DELETE, PUT | Fontes de dados escaneadas |
| `/api/generator` | POST | Gerador de press release (template engine) |
| `/api/simulator` | GET, POST | Simulador de crise com cenários e pontuação |
| `/api/reports` | GET | Relatórios executivos mensais |
| `/api/annual-report` | GET | Relatório anual consolidado |
| `/api/queue` | GET, POST | Fila de processamento (status, retry, dead letter) |
| `/api/metrics` | GET | Métricas e estatísticas do sistema |
| `/api/knowledge` | GET | Grafo de conhecimento (relações multi-entidade) |
| `/api/advisor` | GET | Workload advisor — recomendações baseadas em gaps |
| `/api/talking-points` | GET | Matriz de talking points por categoria |
| `/api/scanner/stats` | GET | Histórico de scans (novos, modificados, removidos por fonte) |
| `/api/scanner/trigger` | POST | Executa scan sob demanda |

---

## Estrutura do Banco (SQLite)

O banco fica em `backend/data/files.db` com 23 tabelas fixas:

- `files` — Metadados dos arquivos indexados (18 colunas)
- `document_text` — Texto extraído por arquivo (com FTS4 para busca全文)
- `document_summary` — Resumo, keywords, tópicos
- `document_vectors` — Vetores TF-IDF por termo
- `document_relations` — Similaridades entre documentos
- `document_clusters` — Clusters temáticos
- `document_sections` — Seções hierárquicas de DOCX
- `structured_data` — Dados importados de planilhas (schema_type, JSON)
- `knowledge_relations` — Grafo de relacionamentos multi-entidade
- `classification_feedback` — Feedback de classificação manual
- `contacts` — Contatos de imprensa (com 3 registros iniciais)
- `settings` — Configurações chave-valor (6 defaults: provider, API key, URL, modelo, potência, store_original)
- `file_blobs` — Blobs originais dos arquivos (até 200 MB cada)
- `simulator_scenarios` — Cenários do simulador de crise
- `talking_points_matrix` — Matriz de talking points por categoria
- `photo_events` — Eventos de fotos agrupados por mês
- `photos` — Metadados e thumbnails de fotos
- `photo_document_links` — Relação entre eventos de fotos e documentos
- `data_sources` — Diretórios configurados como fonte (com índice UNIQUE em `path` p/ evitar duplicatas)
- `scan_log` — Histórico de execuções do scanner (novos, modificados, removidos, total por fonte)
- `calendar_checks` — Check-in diário
- `processing_queue` — Fila de processamento (7 estágios, retry, dead letter)
- Tabelas dinâmicas — Criadas sob demanda pelo ImportManager

---

## Planos e Documentação

Na pasta `docs/planos/`:

| Documento | Descrição |
|---|---|---|
| `PLANO_OTIMIZACAO.md` | Plano de otimização geral em 6 fases (segurança, performance, frontend, qualidade, acessibilidade, DevOps) |
| `PLANO_DE_MELHORIAS.md` | Guia de UI/UX completo, design system e melhorias funcionais |
| `PLANO_IMPORTACAO_INTELIGENTE.md` | Motor de importação estilo Power BI (7 fases) |
| `PLANO_TRANSFORMACAO_NOTA_9.md` | Transformação de segurança, arquitetura e qualidade de código |
| `PLANO_IA_IMPORTACAO_INTELIGENTE.md` | IA para classificação semântica e importação inteligente |
| `PLANO_USO_IA.md` | Guia de uso dos provedores de IA (OpenCode/OpenAI) |

---

## Licença

Sistema interno — NOVACAP / ASCOM
