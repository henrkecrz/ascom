# Blueprint Técnico — Plano de Comunicação NOVACAP / ASCOM

Este blueprint descreve a arquitetura atual do sistema **Plano de Comunicação — NOVACAP / ASCOM** após a implementação das camadas de agentes interativos, agentes de fila e Site Agents.

---

## 1. Objetivo do sistema

O sistema atua como uma **Plataforma de Inteligência Operacional para Comunicação Institucional**.

Seu objetivo é transformar documentos, planilhas, imagens, fotos e dados institucionais em uma base de conhecimento capaz de apoiar:

- consulta rápida;
- produção de conteúdo;
- gestão de crise;
- análise documental;
- estruturação de dados;
- inteligência de risco;
- relatórios executivos;
- atualização automática das páginas do painel.

---

## 2. Arquitetura em camadas

```txt
Fontes de dados
  ↓
Scanner
  ↓
Processing Queue
  ↓
Queue Worker
  ↓
Queue Agents
  ↓
Banco enriquecido
  ↓
Site Agents / Workers
  ↓
Snapshots inteligentes
  ↓
Frontend / Painel ASCOM
  ↓
Agentes interativos e usuários
```

---

## 3. Camadas principais

## 3.1 Fontes de dados

Fontes possíveis:

- pastas de rede;
- PDFs;
- DOCX;
- XLSX;
- CSV;
- JSON;
- XML;
- HTML;
- imagens;
- fotos;
- dados estruturados;
- documentos administrativos;
- relatórios;
- materiais de campanha;
- protocolos de crise;
- matrizes de fala.

Tabela relacionada:

```txt
data_sources
```

---

## 3.2 Scanner

Responsável por varrer fontes configuradas, detectar arquivos novos, modificados ou removidos e alimentar a base `files`.

Arquivos centrais:

```txt
backend/src/scanner.ts
backend/src/routes/scanner.ts
```

Tabelas relacionadas:

```txt
files
scan_log
data_sources
```

---

## 3.3 Fila de processamento

A fila organiza o processamento em estágios.

Arquivo central:

```txt
backend/src/queue.ts
```

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

Tabela relacionada:

```txt
processing_queue
```

---

## 3.4 Worker principal da fila

Arquivo:

```txt
backend/src/queueWorker.ts
```

Função:

- busca o próximo item pendente;
- processa com timeout;
- chama o estágio correto;
- registra conclusão, erro ou dead letter;
- aciona o orquestrador de agentes de fila;
- executa estágios globais;
- chama `site_sync` quando necessário.

---

## 3.5 Agentes de fila

Pasta:

```txt
backend/src/queueAgents/
```

Objetivo:

Transformar etapas da fila em agentes rastreáveis, com logs, resumo, confiança, risco e ações recomendadas.

Arquivos principais:

```txt
queueAgentOrchestrator.ts
queueAgentRegistry.ts
types.ts
logs.ts
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

Tabela relacionada:

```txt
queue_agent_logs
```

Endpoints:

```txt
GET /api/queue/agents
GET /api/queue/agent-logs
```

---

## 3.6 Banco enriquecido

O banco SQLite concentra todos os resultados do processamento.

Arquivo principal:

```txt
backend/src/database.ts
```

Tabelas centrais:

```txt
files
document_text
document_summary
document_vectors
document_embeddings
document_relations
document_clusters
document_sections
structured_data
knowledge_relations
contacts
settings
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

---

## 3.7 Site Agents

Pasta:

```txt
backend/src/siteAgents/
```

Objetivo:

Gerar snapshots inteligentes para as páginas do painel.

Diferente dos agentes interativos, os Site Agents não respondem diretamente ao usuário. Eles processam dados já existentes e atualizam o estado das áreas do frontend.

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
GET /api/site-agents
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/:area
GET /api/site-agents/snapshots/:area/:page
POST /api/site-agents/run
```

---

## 3.8 Worker dos Site Agents

Arquivo:

```txt
backend/src/siteAgents/siteSyncWorker.ts
```

Função:

- executar Site Agents periodicamente;
- impedir execuções simultâneas;
- atualizar snapshots;
- registrar logs;
- permitir execução manual via API;
- manter as páginas atualizadas mesmo sem novos documentos.

Periodicidade inicial:

```txt
10 minutos
```

Também pode ser disparado pelo estágio global:

```txt
site_sync
```

---

## 3.9 Agentes interativos

Pasta:

```txt
backend/src/agents/
```

Objetivo:

Responder perguntas, executar consultas, gerar conteúdo e apoiar decisões por meio de um orquestrador de agentes especializados.

Arquivos principais:

```txt
orchestrator.ts
registry.ts
llmClient.ts
types.ts
```

Agentes implementados:

```txt
documentAgent
classifierAgent
crisisAgent
spokespersonAgent
contentAgent
dataAgent
simulatorAgent
graphAgent
planningAgent
riskAgent
```

Endpoint principal:

```txt
POST /api/agents/ask
```

Exemplo:

```json
{
  "question": "Houve uma matéria negativa sobre uma obra. O que a ASCOM deve fazer?",
  "mode": "auto",
  "context": {}
}
```

---

## 4. Frontend

Pasta:

```txt
frontend/src/
```

O frontend é uma SPA React com HashRouter.

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

Arquivo central de API:

```txt
frontend/src/api.ts
```

Cliente para Site Agents:

```ts
api.siteAgents.list()
api.siteAgents.snapshots()
api.siteAgents.byArea(area)
api.siteAgents.byPage(area, page)
api.siteAgents.run()
```

---

## 5. Fluxo completo de um documento

```txt
1. Arquivo entra em uma pasta monitorada.
2. Scanner identifica novo arquivo.
3. Registro é criado em files.
4. enqueueFile adiciona estágios extract, analyze, risk e structure.
5. queueWorker processa extract.
6. extractQueueAgent registra log da extração.
7. queueWorker processa analyze.
8. analyzeQueueAgent registra classificação, resumo e entidades.
9. riskQueueAgent avalia risco institucional.
10. structureQueueAgent tenta estruturar tabelas, planilhas ou seções.
11. enqueueGlobalStages adiciona relations, clusters, knowledge, simulator e site_sync.
12. relationQueueAgent, clusterQueueAgent e knowledgeQueueAgent enriquecem a base.
13. simulatorQueueAgent gera ou avalia cenários de treinamento.
14. siteSyncQueueAgent executa Site Agents.
15. site_area_snapshots recebe resumo por página.
16. Frontend exibe informações tratadas.
17. Agentes interativos usam a base enriquecida para responder perguntas.
```

---

## 6. Fluxo dos Site Agents

```txt
runSiteAgentsSync
  ↓
siteAgentRegistry
  ↓
subagentes por área
  ↓
saveSiteSnapshots
  ↓
site_area_snapshots
  ↓
/api/site-agents/snapshots
  ↓
frontend
```

Snapshots possuem:

```txt
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

---

## 7. Áreas atualizadas pelos Site Agents

## 7.1 Essencial

Páginas:

```txt
Painel
Crise
```

Agentes implementados:

```txt
essentialOverviewAgent
essentialAlertsAgent
crisisReadinessAgent
```

Saídas:

- visão geral da base;
- alertas operacionais;
- documentos sensíveis;
- score de crise;
- ações recomendadas.

---

## 7.2 Ferramentas

Página inicial implementada:

```txt
Rascunhar
```

Agente:

```txt
draftPreparationAgent
```

Saídas:

- sugestões de release;
- sugestões de nota;
- documentos candidatos a pauta;
- fatos principais.

Próximos agentes recomendados:

```txt
talkingPointsRefreshAgent
mailingIntelligenceAgent
calendarIntelligenceAgent
simulatorSeedAgent
```

---

## 7.3 Base de Dados

Páginas:

```txt
Saúde
Grafo
Plano
Documentos
```

Agentes implementados:

```txt
dataQualityAgent
graphEnrichmentAgent
planCoverageAgent
```

Saídas:

- qualidade da base;
- problemas de extração;
- baixa confiança;
- documentos sem resumo;
- conexões fortes;
- documentos órfãos;
- cobertura por seção do plano.

Próximos agentes recomendados:

```txt
dataCatalogAgent
documentCurationAgent
timelineNarrativeAgent
reportInsightAgent
galleryContextAgent
```

---

## 8. IA aplicada

A IA aparece em várias camadas:

```txt
Classificação documental
Chat consultivo
Importação inteligente
Schema inference
XLSX inteligente
Simulação de crise
Talking points
Agentes interativos
Geração de conteúdo
Embeddings e similaridade
NER com serviço Python opcional
OCR com Tesseract
```

Nem tudo usa LLM externa. O sistema combina:

- LLM via endpoint compatível com OpenAI;
- regex e regras locais;
- NLP local com TF-IDF;
- spaCy;
- sentence-transformers;
- OCR;
- heurísticas de importação;
- SQL e métricas internas.

---

## 9. Segurança e controle

Controles existentes ou previstos:

- autenticação JWT;
- senha mestre;
- criptografia de chave de API;
- rate limit;
- fallback local quando a IA falha;
- logs de processamento;
- dead letter queue;
- revisão humana para baixa confiança;
- validação recomendada para documentos de risco alto ou crítico.

---

## 10. Principais endpoints de operação

```txt
GET  /api/ping
POST /api/auth/login

POST /api/agents/ask
GET  /api/queue/status
GET  /api/queue/agents
GET  /api/queue/agent-logs
POST /api/queue/start

GET  /api/site-agents
POST /api/site-agents/run
GET  /api/site-agents/snapshots
GET  /api/site-agents/snapshots/:area
GET  /api/site-agents/snapshots/:area/:page
```

---

## 11. Testes manuais recomendados

Após alterações relevantes, rodar:

```bash
cd backend
npm run build
```

Depois testar no backend:

```txt
GET /api/ping
GET /api/queue/agents
GET /api/site-agents
POST /api/site-agents/run
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/essencial/dashboard
GET /api/queue/agent-logs?stage=site_sync
```

---

## 12. Próximas evoluções recomendadas

## 12.1 Frontend

- criar componente `SmartSnapshotCard`;
- exibir snapshots no Painel;
- exibir score de crise na tela Crise;
- exibir sugestões em Rascunhar;
- exibir qualidade da base em Saúde;
- exibir leitura do grafo em Grafo;
- exibir cobertura por seção em Plano.

## 12.2 Novos Site Agents

- `talkingPointsRefreshAgent`;
- `mailingIntelligenceAgent`;
- `calendarIntelligenceAgent`;
- `simulatorSeedAgent`;
- `dataCatalogAgent`;
- `documentCurationAgent`;
- `timelineNarrativeAgent`;
- `reportInsightAgent`;
- `galleryContextAgent`.

## 12.3 Observabilidade

- painel de execução de agentes;
- histórico de snapshots;
- status do worker de Site Agents;
- filtros por risco, área e página;
- logs por agente.

## 12.4 Qualidade

- testes unitários para agentes;
- validação de schema dos payloads;
- build check no CI;
- snapshots de exemplo para desenvolvimento frontend.

---

## 13. Resumo arquitetural

```txt
Sistema =
  Scanner
  + Fila
  + Queue Worker
  + Queue Agents
  + Site Agents Worker
  + Agentes Interativos
  + Banco enriquecido
  + Frontend operacional
```

Mensagem estratégica:

> O sistema não apenas armazena documentos. Ele lê, classifica, relaciona, avalia risco, estrutura dados e atualiza automaticamente o painel da ASCOM com informações operacionais e estratégicas.
