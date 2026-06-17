# BLUEPRINT — Sistema Plano de Comunicação (Novacap ASCOM)

> **Versão:** 1.4  
> **Propósito:** Blueprint arquitetural completo do sistema  
> **Última atualização:** Junho 2026  
> **Referência cruzada:** `docs/BLUEPRINT.md` + implementação de agentes, workers e perfis de IA

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Propósito

O **Plano de Comunicação** é uma plataforma full-stack de inteligência operacional construída para a Assessoria de Comunicação (ASCOM) da Novacap — Companhia de Urbanização da Nova Capital do Brasil / GDF.

O sistema transforma documentos institucionais brutos — PDFs, planilhas, ofícios, DOCX, imagens, fotos, dados tabulares e materiais de comunicação — em uma **base de conhecimento operacional, pesquisável, analisável e acionável**.

Ele não é um ERP nem um CRM. Em termos de mercado, funciona como uma:

```txt
Plataforma de Inteligência Operacional para Comunicação Institucional
```

Combinando:

- gestão documental inteligente;
- gestão do conhecimento;
- busca semântica;
- command center de comunicação;
- agentes de IA;
- processamento em fila;
- atualização automática das áreas do painel;
- suporte a crise, porta-voz, relatórios e produção de conteúdo.

---

### 1.2 Objetivo institucional

O sistema apoia a ASCOM a responder perguntas como:

- Qual protocolo usar em uma situação de crise?
- Quem é o porta-voz autorizado para determinado tema?
- Quais documentos sustentam uma resposta oficial?
- Que assuntos sensíveis estão surgindo na base?
- Quais documentos ainda precisam revisão?
- Quais dados podem virar pauta, release ou relatório?
- Como está a saúde do plano de comunicação?
- Quais páginas do painel precisam ser atualizadas automaticamente?

---

### 1.3 Grade de maturidade atual

| Dimensão | Nota | Descrição |
|---|---:|---|
| Segurança | ~8.5/10 | JWT, rate limit, criptografia de credenciais, não retorno de chaves abertas no Settings, fallback local, logs e isolamento por perfil de IA. |
| Arquitetura | ~9/10 | Monorepo modular, backend/frontend/python-service, agentes interativos, agentes de fila, Site Agents, workers e snapshots inteligentes. |
| Análise e IA | ~9/10 | Classificação híbrida, NLP local, embeddings, OCR, importação inteligente, schema inference, simulação, talking points, perfis de IA por camada. |
| UX/UI | ~8/10 | Design system OKLCH, dark/light, importador universal, Settings com três perfis de IA, múltiplas páginas e componentes compartilhados. |
| Qualidade de Código | ~7.5/10 | TypeScript estrito e modularização crescente. Pendente: build/testes automatizados após últimas integrações e cobertura ampliada. |

---

## 2. ARQUITETURA EM CAMADAS

A arquitetura atual consolidada segue o fluxo abaixo:

```txt
Fontes de dados
  ↓
Scanner incremental
  ↓
Processing Queue
  ↓
Queue Worker
  ↓
Queue Agents
  ↓
Banco enriquecido
  ↓
Site Agents / Site Sync Worker
  ↓
site_area_snapshots
  ↓
Frontend / Painel ASCOM
  ↓
Agentes interativos + usuários
```

---

## 3. DIAGRAMA DE CONTEXTO — C4 NÍVEL 1

```txt
┌─────────────────────────────────────────────────────────────┐
│                    OPERADOR ASCOM                            │
│          Jornalistas, RPs, Assessoria, Chefia                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA PLANO DE COMUNICAÇÃO                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Portal Web SPA (React + Vite)                           │ │
│  │ Painel, Consulta, Crise, Busca, Ferramentas, Base        │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         │ HTTP/JSON REST                     │
│  ┌──────────────────────▼──────────────────────────────────┐ │
│  │ API REST (Express + TypeScript)                         │ │
│  │ Rotas, autenticação, workers, agentes e IA               │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────────┐ │
│  │ SQLite sql.js + Processadores + IA + Python opcional     │ │
│  │ documentos, fila, logs, snapshots, grafo e dados         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SISTEMAS EXTERNOS                               │
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │ Rede ASCOM / pastas │  │ OpenCode / OpenAI compatível │   │
│  │ documentos e fotos  │  │ LLM por perfis de IA         │   │
│  └─────────────────────┘  └──────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Serviço Python opcional: spaCy + Sentence-Transformers │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DIAGRAMA DE CONTAINERS — C4 NÍVEL 2

```txt
┌─────────────────────────────────────────────────────────────────────┐
│  SPA React 18 + Vite 6                                               │
│                                                                     │
│  Essencial: Painel · Consulta · Crise · Busca                        │
│  Ferramentas: Rascunhar · Matriz · Mailing · Simulador · Calendário │
│  Base: Grafo · Dados Estruturados · Documentos · Saúde · Timeline    │
│        Relatórios · Plano · Galeria                                  │
│                                                                     │
│  api.ts centraliza chamadas REST                                     │
│  Settings.tsx configura 3 perfis de IA                               │
└─────────────────────────────────────────────────────────────────────┘
                            │ HTTP REST
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Server Express 4.21 + TypeScript 5.6                            │
│                                                                     │
│  Middleware: CORS → Rate Limit → JSON → JWT Auth → Routes            │
│                                                                     │
│  Rotas principais:                                                   │
│  files, dashboard, documents, search, operational, consult, crisis,  │
│  health, plan, graph, timeline, structuredData, import, settings,    │
│  contacts, calendar, photos, dataSources, generator, simulator,      │
│  reports, annualReport, queue, metrics, knowledge, advisor,          │
│  talkingPoints, scanner, agents, site-agents                         │
│                                                                     │
│  Módulos de inteligência:                                            │
│  analysis/, processors/, agents/, queueAgents/, siteAgents/, services│
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Banco SQLite via sql.js WASM                                        │
│                                                                     │
│  files, document_text, summaries, vectors, embeddings, relations,    │
│  clusters, sections, structured_data, knowledge_relations, queue,    │
│  queue_agent_logs, site_area_snapshots, settings, photos, contatos   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. CAMADAS DE AGENTES

A principal diferença em relação às versões anteriores do blueprint é que agora o sistema possui **três camadas de agentes**.

```txt
1. Agentes interativos
   Respondem perguntas e apoiam decisões em tempo real.

2. Agentes de fila
   Processam documentos e enriquecem a base em segundo plano.

3. Site Agents
   Atualizam automaticamente snapshots inteligentes para as páginas.
```

---

### 5.1 Agentes interativos

Pasta:

```txt
backend/src/agents/
```

Objetivo:

- receber uma pergunta ou demanda operacional;
- identificar intenção;
- acionar o agente especializado;
- consultar documentos, dados, grafo, crise, planejamento ou conteúdo;
- consolidar resposta para o usuário.

Arquivos principais:

```txt
types.ts
llmClient.ts
registry.ts
orchestrator.ts
documentAgent.ts
classifierAgent.ts
crisisAgent.ts
spokespersonAgent.ts
contentAgent.ts
dataAgent.ts
simulatorAgent.ts
graphAgent.ts
planningAgent.ts
riskAgent.ts
```

Endpoint:

```txt
POST /api/agents/ask
GET  /api/agents
```

Perfil de IA usado:

```txt
interactive_agents
```

Também usam esse perfil:

```txt
backend/src/services/consultService.ts
backend/src/agents/llmClient.ts
```

---

### 5.2 Agentes de fila

Pasta:

```txt
backend/src/queueAgents/
```

Objetivo:

- transformar cada estágio da fila em uma etapa rastreável;
- registrar logs por agente;
- gerar resumo, status, confiança, risco e ação recomendada;
- não bloquear o pipeline se houver fallback local.

Estágios atuais:

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

Agentes implementados:

```txt
extractQueueAgent
analyzeQueueAgent
riskQueueAgent
structureQueueAgent
relationQueueAgent
clusterQueueAgent
knowledgeQueueAgent
simulatorQueueAgent
siteSyncQueueAgent
```

Arquivos principais:

```txt
types.ts
logs.ts
queueAgentRegistry.ts
queueAgentOrchestrator.ts
```

Tabela relacionada:

```txt
queue_agent_logs
```

Endpoints:

```txt
GET /api/queue/agents
GET /api/queue/agent-logs
GET /api/queue/agent-logs?stage=site_sync
GET /api/queue/agent-logs?riskLevel=alto
```

Perfil de IA usado para rotinas LLM de processamento:

```txt
queue_agents
```

Módulos migrados para esse perfil:

```txt
backend/src/analysis/aiClassifier.ts
backend/src/processors/xlsxAnalyzer.ts
backend/src/analysis/schemaInferrer.ts
backend/src/services/simulatorAi.ts
```

---

### 5.3 Site Agents

Pasta:

```txt
backend/src/siteAgents/
```

Objetivo:

- ler o banco já enriquecido;
- gerar snapshots por área e página;
- manter o frontend com informações pré-processadas;
- reduzir cálculo pesado ao abrir páginas;
- transformar dados processados em alertas, resumos e recomendações.

Arquivos principais:

```txt
types.ts
dbUtils.ts
snapshots.ts
siteAgentRegistry.ts
siteAgentOrchestrator.ts
siteSyncWorker.ts
```

Subagentes implementados:

```txt
essentialOverviewAgent
essentialAlertsAgent
crisisReadinessAgent
draftPreparationAgent
dataQualityAgent
graphEnrichmentAgent
planCoverageAgent
```

Tabela relacionada:

```txt
site_area_snapshots
```

Endpoints:

```txt
GET  /api/site-agents
GET  /api/site-agents/snapshots
GET  /api/site-agents/snapshots/:area
GET  /api/site-agents/snapshots/:area/:page
POST /api/site-agents/run
```

Perfil reservado para uso LLM dos Site Agents:

```txt
site_agents
```

Observação: os primeiros Site Agents implementados usam principalmente SQL, métricas e regras locais. O perfil `site_agents` já está disponível para evoluções que precisem de síntese executiva por LLM.

---

## 6. PERFIS DE IA POR CAMADA

A implementação mais recente substitui o uso de uma configuração global única por uma camada de perfis de IA.

Arquivo central:

```txt
backend/src/services/aiProfile.ts
```

Escopos:

```txt
interactive_agents
queue_agents
site_agents
default
```

Cada perfil possui:

```txt
provider
credential criptografada
baseUrl
model
potency
enabled
maxConcurrency
fallbackUsed
```

A tela de configurações foi atualizada para três cards independentes em:

```txt
frontend/src/pages/Settings.tsx
```

Cada card permite configurar:

```txt
Provedor
Nova chave de API
Base URL
Modelo
Temperatura
Concorrência
Ativo/Inativo
Teste individual
```

---

### 6.1 Mapeamento de perfis

| Perfil | Uso | Arquivos principais |
|---|---|---|
| `interactive_agents` | Chat, consulta, conteúdo, crise, planejamento, agentes sob demanda | `agents/llmClient.ts`, `consultService.ts`, `backend/src/agents/*` |
| `queue_agents` | Classificação, schema, XLSX, simulação automática, fila | `aiClassifier.ts`, `xlsxAnalyzer.ts`, `schemaInferrer.ts`, `simulatorAi.ts` |
| `site_agents` | Síntese de snapshots, recomendações por página, painel automático | `backend/src/siteAgents/*` |
| `default` | Compatibilidade com configuração global antiga | `ai_provider`, `ai_base_url`, `ai_model`, `ai_potency` |

---

### 6.2 Rotas de perfis de IA

```txt
GET  /api/settings/ai-profiles
POST /api/settings/ai-profiles
POST /api/settings/ai-profiles/test
```

A rota antiga segue ativa para compatibilidade:

```txt
GET  /api/settings
POST /api/settings
POST /api/settings/test-model
```

Mudança de segurança:

```txt
GET /api/settings não retorna mais a chave aberta.
Retorna apenas indicador e máscara.
```

Exemplo conceitual de retorno:

```json
{
  "profiles": {
    "interactive_agents": {
      "label": "Agentes Interativos",
      "provider": "opencode",
      "hasCredential": true,
      "credentialMasked": "opsk****1234",
      "baseUrl": "https://opencode.ai/zen/v1",
      "model": "opencode/deepseek-v4-flash-free",
      "potency": 0.5,
      "enabled": true,
      "maxConcurrency": 3
    }
  }
}
```

---

### 6.3 Estratégia de fallback de IA

```txt
1. Tenta o perfil específico da camada.
2. Se o perfil ainda não existe, usa a configuração global antiga.
3. Se a chamada falhar, usa fallback local: regex, SQL, TF-IDF, heurísticas ou resposta local.
```

Isso preserva compatibilidade e evita quebrar o sistema durante a migração.

---

## 7. FLUXO PRINCIPAL DE PROCESSAMENTO

### 7.1 Pipeline documental

```txt
Scanner
  ↓
files
  ↓
enqueueFile
  ↓
processing_queue
  ↓
extract
  ↓
analyze
  ↓
risk
  ↓
structure
  ↓
enqueueGlobalStages
  ↓
relations
  ↓
clusters
  ↓
knowledge
  ↓
simulator
  ↓
site_sync
  ↓
site_area_snapshots
```

---

### 7.2 Sequência detalhada

```txt
1. Arquivo entra em uma fonte monitorada.
2. Scanner detecta arquivo novo, modificado ou removido.
3. Registro é criado/atualizado em files.
4. enqueueFile adiciona extract, analyze, risk e structure.
5. queueWorker processa extract.
6. extractQueueAgent registra resultado da extração.
7. queueWorker processa analyze.
8. analyzeQueueAgent registra resumo, classificação e entidades.
9. riskQueueAgent avalia risco institucional.
10. structureQueueAgent tenta estruturar dados, tabelas e seções.
11. enqueueGlobalStages adiciona relations, clusters, knowledge, simulator e site_sync.
12. relationQueueAgent, clusterQueueAgent e knowledgeQueueAgent enriquecem a rede.
13. simulatorQueueAgent gera cenários e talking points automáticos.
14. siteSyncQueueAgent chama runSiteAgentsSync.
15. Site Agents salvam snapshots em site_area_snapshots.
16. Frontend consome /api/site-agents/snapshots.
17. Agentes interativos usam a base enriquecida para responder perguntas.
```

---

## 8. MODELO DE DADOS

### 8.1 Tabelas centrais

```txt
files
document_text
document_text_fts
document_summary
document_vectors
document_embeddings
document_relations
document_clusters
document_sections
classification_feedback
schema_cache
structured_data
knowledge_relations
contacts
settings
file_blobs
simulator_scenarios
talking_points_matrix
photo_events
photos
photo_document_links
data_sources
scan_log
calendar_checks
processing_queue
queue_agent_logs
site_area_snapshots
```

Além dessas, o importador pode criar tabelas dinâmicas para dados estruturados importados.

---

### 8.2 processing_queue

Tabela da fila principal.

Campos-chave:

```txt
id
file_id
stage
status
priority
retry_count
max_retries
error_message
created_at
started_at
completed_at
```

Estágios válidos:

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

---

### 8.3 queue_agent_logs

Tabela de rastreabilidade dos agentes de fila.

Uso:

- registrar qual agente atuou;
- registrar estágio;
- registrar status;
- registrar confiança;
- registrar risco;
- registrar resumo;
- registrar ação recomendada;
- registrar metadados.

---

### 8.4 site_area_snapshots

Tabela de cache inteligente das páginas.

Campos:

```txt
id
area
page
agent
title
summary
status
priority
risk_level
payload
source_count
updated_at
```

Áreas:

```txt
essencial
ferramentas
dados
```

Exemplos:

```txt
essencial/dashboard/essentialOverviewAgent
essencial/dashboard/essentialAlertsAgent
essencial/crisis/crisisReadinessAgent
ferramentas/generator/draftPreparationAgent
dados/health/dataQualityAgent
dados/graph/graphEnrichmentAgent
dados/plan/planCoverageAgent
```

---

### 8.5 settings

A tabela `settings` agora guarda dois níveis de configuração de IA:

Configuração global legada:

```txt
ai_provider
ai_base_url
ai_model
ai_potency
credential global criptografada
```

Perfis por camada:

```txt
ai_interactive_provider
ai_interactive_base_url
ai_interactive_model
ai_interactive_potency
ai_interactive_enabled
ai_interactive_max_concurrency
credential interactive criptografada

ai_queue_provider
ai_queue_base_url
ai_queue_model
ai_queue_potency
ai_queue_enabled
ai_queue_max_concurrency
credential queue criptografada

ai_site_provider
ai_site_base_url
ai_site_model
ai_site_potency
ai_site_enabled
ai_site_max_concurrency
credential site criptografada
```

---

## 9. FRONTEND

Pasta:

```txt
frontend/src/
```

Principais arquivos:

```txt
App.tsx
api.ts
ThemeContext.tsx
theme.ts
pages/
components/
```

Áreas do menu:

```txt
Essencial
├── Painel
├── Consulta
├── Crise
└── Busca

Ferramentas
├── Rascunhar
├── Matriz
├── Mailing
├── Simulador
└── Calendário

Base de Dados
├── Grafo
├── Dados Estruturados
├── Documentos
├── Saúde
├── Timeline
├── Relatórios
├── Plano
└── Galeria
```

---

### 9.1 Cliente API

Arquivo:

```txt
frontend/src/api.ts
```

Clientes relevantes:

```ts
api.siteAgents.list()
api.siteAgents.snapshots()
api.siteAgents.byArea(area)
api.siteAgents.byPage(area, page)
api.siteAgents.run()
```

Os endpoints de perfis de IA são consumidos pela tela de Settings por meio de:

```ts
api.get('/api/settings/ai-profiles')
api.post('/api/settings/ai-profiles', payload)
api.post('/api/settings/ai-profiles/test', payload)
```

---

### 9.2 Settings de IA

Arquivo:

```txt
frontend/src/pages/Settings.tsx
```

A tela possui três cards:

```txt
Agentes Interativos
Agentes de Fila
Site Agents
```

Cada perfil permite:

```txt
selecionar provedor
inserir nova credencial
configurar base URL
configurar modelo
ajustar temperatura
ajustar concorrência
ativar/desativar
testar perfil individualmente
```

---

## 10. ROTAS DA API

### 10.1 Operação geral

```txt
GET  /api/ping
POST /api/auth/login
GET  /api/dashboard
GET  /api/files
GET  /api/documents/:id
GET  /api/search
```

### 10.2 Consulta e agentes

```txt
POST /api/consult
GET  /api/consult/quick-answers
GET  /api/agents
POST /api/agents/ask
```

### 10.3 Fila e agentes de fila

```txt
GET  /api/queue/status
GET  /api/queue/current
GET  /api/queue/agents
GET  /api/queue/agent-logs
POST /api/queue/start
POST /api/queue/pause
POST /api/queue/resume
```

### 10.4 Site Agents

```txt
GET  /api/site-agents
POST /api/site-agents/run
GET  /api/site-agents/snapshots
GET  /api/site-agents/snapshots/:area
GET  /api/site-agents/snapshots/:area/:page
```

### 10.5 Settings e perfis de IA

```txt
GET  /api/settings
POST /api/settings
POST /api/settings/test-model
GET  /api/settings/ai-profiles
POST /api/settings/ai-profiles
POST /api/settings/ai-profiles/test
```

### 10.6 Outros grupos funcionais

```txt
/api/crisis
/api/health
/api/plan
/api/graph
/api/knowledge-graph
/api/timeline
/api/structured-data
/api/import
/api/contacts
/api/calendar
/api/photos
/api/data-sources
/api/generator
/api/simulator
/api/reports
/api/annual-report
/api/metrics
/api/advisor
/api/talking-points
/api/scanner
```

---

## 11. DECISÕES ARQUITETURAIS

### 11.1 Por que SQLite sql.js?

| Fator | Decisão |
|---|---|
| Implantação | Banco local em arquivo, sem servidor externo. |
| Portabilidade | Facilita uso em ambiente interno/intranet. |
| Performance | Suficiente para milhares de documentos e dados estruturados. |
| Distribuição | Evita dependências nativas complexas. |

---

### 11.2 Por que classificação híbrida?

| Camada | Uso |
|---|---|
| LLM por perfil `queue_agents` | Classificação semântica e schema. |
| Regex local | Fallback quando IA falha ou confiança é baixa. |
| Feedback manual | Correções salvas para melhoria futura. |

---

### 11.3 Por que processamento em fila?

- evita travar o servidor durante análise em lote;
- permite pausar/retomar;
- permite retry e dead letter;
- cria rastreabilidade por estágio;
- separa processamento pesado do uso interativo;
- permite uso do perfil `queue_agents` sem impactar o chat.

---

### 11.4 Por que Site Agents?

Antes, cada página dependia de consultas diretas e cálculos no momento da abertura.

Com Site Agents:

```txt
processamento pesado acontece em segundo plano
↓
snapshots são salvos no banco
↓
frontend consome dados prontos
```

Benefícios:

- painel mais rápido;
- informações pré-processadas;
- alertas sempre disponíveis;
- menor carga no frontend;
- caminho para páginas mais inteligentes.

---

### 11.5 Por que perfis de IA?

Uma única chave/modelo não atende bem três tipos de uso:

```txt
chat sob demanda
processamento em lote
atualização automática de páginas
```

Com perfis separados:

```txt
interactive_agents → qualidade e resposta ao usuário
queue_agents       → volume, custo e robustez
site_agents        → síntese e atualização periódica
```

Isso permite paralelismo operacional sem uma camada consumir limite da outra.

---

## 12. SEGURANÇA

### 12.1 Implementado

- JWT com senha mestra via `.env`;
- rate limiting;
- rotas `/api/*` protegidas, exceto login e ping;
- criptografia de credenciais no banco;
- Settings não retorna credencial aberta;
- máscara visual da credencial cadastrada;
- fallback local quando IA falha;
- logs de fila e agentes;
- dead letter queue;
- validação recomendada para documentos de risco alto/crítico;
- proteção contra path traversal;
- scanner com execução segura.

---

## 13. MÉTRICAS E OBSERVABILIDADE

| Métrica | Descrição | Endpoint / origem |
|---|---|---|
| Total de documentos | Contagem de arquivos indexados | `/api/dashboard` |
| Taxa de extração | Documentos com texto extraído | `/api/health` |
| Taxa de classificação | Documentos classificados | `/api/health` |
| Score de saúde | Cobertura e atualização do plano | `/api/plan/health` |
| Gaps detectados | Protocolos, seções e lacunas | `/api/plan/gaps` |
| Progresso da fila | Pendentes, processando, concluídos e erros | `/api/queue/status` |
| Agentes de fila | Lista de agentes por estágio | `/api/queue/agents` |
| Logs dos agentes | Logs por estágio, risco e agente | `/api/queue/agent-logs` |
| Snapshots do site | Resumos e alertas por página | `/api/site-agents/snapshots` |
| Perfis de IA | Configurações por camada | `/api/settings/ai-profiles` |
| Scanner | Novos, modificados e removidos por fonte | `/api/scanner/stats` |

---

## 14. PLANOS DE EVOLUÇÃO

Os planos detalhados ficam em:

```txt
docs/planos/
```

| Plano | Foco | Estado |
|---|---|---|
| `PLANO_AGENTES_ASCOM.md` | Agentes interativos | Implementado base |
| `PLANO_AGENTES_FILA_ASCOM.md` | Agentes de fila | Implementado base |
| `PLANO_AGENTES_SITE_ASCOM.md` | Site Agents por área | Implementado base |
| `PLANO_WORKERS_SITE_AGENTS_ASCOM.md` | Worker e site_sync | Implementado base |
| `PLANO_PERFIS_IA_AGENTES_ASCOM.md` | Perfis de IA por camada | Implementado base |
| `PLANO_IMPORTACAO_INTELIGENTE.md` | Importação estilo Power BI | Implementado base |
| `PLANO_DE_MELHORIAS.md` | UI/UX e design system | Parcial |
| `PLANO_TRANSFORMACAO_NOTA_9.md` | Segurança e qualidade | Em evolução |
| `PLANO_USO_IA.md` | Guia de provedores de IA | Atualizar com perfis |

---

## 15. PRÓXIMAS EVOLUÇÕES RECOMENDADAS

### 15.1 Frontend

- criar componente `SmartSnapshotCard`;
- exibir snapshots no Painel;
- exibir score de crise na página Crise;
- exibir sugestões do `draftPreparationAgent` na página Rascunhar;
- exibir diagnóstico do `dataQualityAgent` na página Saúde;
- exibir leitura textual do `graphEnrichmentAgent` na página Grafo;
- exibir cobertura do `planCoverageAgent` na página Plano;
- adicionar painel visual de execução dos agentes.

---

### 15.2 Novos Site Agents

```txt
talkingPointsRefreshAgent
mailingIntelligenceAgent
calendarIntelligenceAgent
simulatorSeedAgent
dataCatalogAgent
documentCurationAgent
timelineNarrativeAgent
reportInsightAgent
galleryContextAgent
```

---

### 15.3 Observabilidade de IA

- histórico de chamadas por escopo;
- tempo médio por perfil;
- falhas por provedor/modelo;
- contagem de fallback;
- painel de custo/volume aproximado;
- aplicação efetiva de `maxConcurrency` por perfil.

---

### 15.4 Qualidade

- rodar `npm run build` após cada integração;
- adicionar testes unitários para `aiProfile.ts`;
- validar payloads de snapshots;
- testar rotas de perfis de IA;
- criar exemplos de snapshots para desenvolvimento frontend.

---

## 16. TESTES MANUAIS RECOMENDADOS

Backend:

```bash
cd backend
npm run build
```

Endpoints:

```txt
GET  /api/ping
GET  /api/settings/ai-profiles
POST /api/settings/ai-profiles/test
GET  /api/agents
POST /api/agents/ask
GET  /api/queue/agents
GET  /api/queue/agent-logs?stage=site_sync
POST /api/site-agents/run
GET  /api/site-agents/snapshots
GET  /api/site-agents/snapshots/essencial/dashboard
```

Frontend:

```txt
Abrir Configurações da IA
Configurar os 3 perfis
Testar cada perfil
Salvar
Reabrir a tela e verificar credenciais mascaradas
```

---

## 17. GLOSSÁRIO

| Termo | Significado |
|---|---|
| ASCOM | Assessoria de Comunicação |
| Novacap | Companhia de Urbanização da Nova Capital do Brasil |
| GDF | Governo do Distrito Federal |
| Agentes interativos | Agentes acionados por perguntas ou ações do usuário |
| Agentes de fila | Agentes que atuam nos estágios do processamento documental |
| Site Agents | Agentes que atualizam snapshots das páginas do painel |
| site_sync | Estágio global da fila que dispara os Site Agents |
| Snapshot | Registro pré-processado com resumo, status, prioridade, risco e payload |
| Perfil de IA | Configuração de provedor/modelo/credencial por camada de agentes |
| TF-IDF | Técnica local de ponderação e busca textual |
| OCR | Reconhecimento de texto em imagens |
| Knowledge Graph | Grafo de relações entre documentos, entidades e dados |

---

## 18. REFERÊNCIAS

- Express 4.x: https://expressjs.com/
- React 18: https://react.dev/
- Vite 6: https://vitejs.dev/
- sql.js: https://sql.js.org/
- vis-network: https://visjs.github.io/vis-network/
- tesseract.js: https://tesseract.projectnaptha.com/
- spaCy: https://spacy.io/
- Sentence-Transformers: https://www.sbert.net/
- OpenCode: https://opencode.ai/

---

## 19. RESUMO ARQUITETURAL

```txt
Sistema =
  Scanner incremental
  + Processing Queue
  + Queue Worker
  + Queue Agents
  + Site Agents Worker
  + Agentes Interativos
  + Perfis de IA por camada
  + Banco enriquecido
  + Snapshots inteligentes
  + Frontend operacional
```

Mensagem estratégica:

> O sistema não apenas armazena documentos. Ele lê, classifica, estrutura, relaciona, avalia risco, gera conhecimento, atualiza automaticamente o painel e permite que a ASCOM consulte e aja com base em inteligência institucional consolidada.
