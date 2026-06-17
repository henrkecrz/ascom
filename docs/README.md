# Documentação — Plano de Comunicação NOVACAP / ASCOM

Este diretório centraliza a documentação técnica, estratégica e evolutiva do sistema **Plano de Comunicação — NOVACAP / ASCOM**.

O projeto funciona como uma **Plataforma de Inteligência Operacional para Comunicação Institucional**, combinando gestão documental, IA, agentes, fila de processamento, grafo de conhecimento, simulador de crise e atualização automática das áreas do painel.

---

## Leitura recomendada

Para entender o sistema, siga esta ordem:

```txt
1. README.md da raiz
2. docs/BLUEPRINT.md
3. docs/planos/PLANO_AGENTES_ASCOM.md
4. docs/planos/PLANO_AGENTES_FILA_ASCOM.md
5. docs/planos/PLANO_AGENTES_SITE_ASCOM.md
6. docs/planos/PLANO_WORKERS_SITE_AGENTS_ASCOM.md
```

---

## Arquivos principais

| Arquivo | Finalidade |
|---|---|
| `../README.md` | Visão geral do projeto, instalação, arquitetura e rotas. |
| `BLUEPRINT.md` | Blueprint técnico da arquitetura atual. |
| `planos/PLANO_AGENTES_ASCOM.md` | Plano e estrutura dos agentes interativos. |
| `planos/PLANO_AGENTES_FILA_ASCOM.md` | Plano da esteira de agentes de fila. |
| `planos/PLANO_AGENTES_SITE_ASCOM.md` | Plano dos agentes de atualização do site/painel. |
| `planos/PLANO_WORKERS_SITE_AGENTS_ASCOM.md` | Plano de workers para executar Site Agents em segundo plano. |

---

## Planos anteriores e complementares

| Documento | Descrição |
|---|---|
| `planos/PLANO_OTIMIZACAO.md` | Plano de otimização geral em fases. |
| `planos/PLANO_DE_MELHORIAS.md` | Melhorias de UI/UX e design system. |
| `planos/PLANO_IMPORTACAO_INTELIGENTE.md` | Importação estilo Power BI e transformação de dados. |
| `planos/PLANO_TRANSFORMACAO_NOTA_9.md` | Segurança, arquitetura e qualidade. |
| `planos/PLANO_IA_IMPORTACAO_INTELIGENTE.md` | IA aplicada à importação inteligente. |
| `planos/PLANO_USO_IA.md` | Guia de provedores e configuração de IA. |

---

## Arquitetura atual em uma frase

```txt
Scanner + fila + IA + agentes + workers + snapshots = painel vivo de inteligência institucional.
```

O sistema possui três camadas principais de agentes:

```txt
Agentes interativos
  Respondem perguntas e apoiam decisões.

Agentes de fila
  Processam documentos e registram logs, risco e rastreabilidade.

Site Agents
  Atualizam páginas do painel com snapshots inteligentes.
```

---

## Mapa rápido por pasta

```txt
backend/src/agents/
  Agentes interativos e orquestrador ASCOM.

backend/src/queueAgents/
  Agentes de fila para estágios de processamento.

backend/src/siteAgents/
  Subagentes de atualização das páginas e worker periódico.

backend/src/routes/
  Rotas da API.

backend/src/analysis/
  Classificação, NLP, similaridade, clusters, grafo e importação inteligente.

backend/src/processors/
  Processadores de arquivos e formatos.

frontend/src/
  Painel React, páginas, componentes e cliente API.
```

---

## Estado atual da evolução

Implementado:

- camada de agentes interativos;
- endpoint `/api/agents/ask`;
- camada `queueAgents`;
- logs `queue_agent_logs`;
- estágio `risk`;
- estágio global `site_sync`;
- camada `siteAgents`;
- snapshots `site_area_snapshots`;
- worker periódico dos Site Agents;
- endpoint `/api/site-agents`;
- cliente frontend `api.siteAgents`.

Pendente/recomendado:

- rodar `npm run build` no backend;
- criar componentes visuais para exibir snapshots nas páginas;
- adicionar novos Site Agents para Matriz, Mailing, Calendário, Timeline, Relatórios e Galeria;
- adicionar testes automatizados para os novos agentes;
- criar tela administrativa para acompanhar execução dos agentes.

---

## Comandos úteis

```bash
npm run install:all
npm run dev
npm run scan
cd backend && npm run full
cd backend && npm run build
```

---

## Endpoints úteis para validação

```txt
GET /api/agents
POST /api/agents/ask

GET /api/queue/agents
GET /api/queue/agent-logs
GET /api/queue/agent-logs?stage=site_sync

GET /api/site-agents
POST /api/site-agents/run
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/essencial/dashboard
GET /api/site-agents/snapshots/dados/health
```

---

## Observação

Esta documentação deve ser mantida junto com a evolução do sistema. Sempre que novos agentes, workers, rotas ou tabelas forem criados, atualize:

```txt
README.md
docs/README.md
docs/BLUEPRINT.md
```
