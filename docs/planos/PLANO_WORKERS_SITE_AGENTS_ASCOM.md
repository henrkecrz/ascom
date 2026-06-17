# Plano de Workers para Site Agents ASCOM

## 1. Visão geral

Este plano complementa o `PLANO_AGENTES_SITE_ASCOM.md` e descreve como implementar os **Agentes de Atualização do Site** usando workers em segundo plano.

A ideia é permitir que o sistema atualize automaticamente as três áreas principais do painel:

- páginas essenciais;
- ferramentas;
- base de dados.

Os workers devem agir sobre os dados já processados pela fila documental e pelos agentes de fila, criando snapshots inteligentes para o frontend.

---

## 2. Por que usar workers

Workers são o caminho ideal para este plano porque as páginas do painel não devem recalcular tudo sempre que o usuário acessa uma tela.

Com workers, o sistema pode:

- atualizar dados periodicamente;
- gerar snapshots em segundo plano;
- reduzir lentidão no frontend;
- evitar processamento pesado durante a navegação;
- manter páginas prontas para consulta;
- rodar sincronizações após grandes processamentos;
- organizar alertas, resumos e recomendações antes do usuário precisar deles.

---

## 3. Arquitetura recomendada

A implementação deve usar dois níveis de worker:

```txt
1. Worker principal da fila
   Já existe no projeto e processa arquivos e estágios globais.

2. Worker específico dos Site Agents
   Novo worker responsável por atualizar snapshots das páginas.
```

---

## 4. Worker principal da fila

O `queueWorker` continua sendo responsável pelo processamento principal.

Fluxo atual com agentes de fila:

```txt
extract
↓
analyze
↓
risk
↓
structure
↓
relations
↓
clusters
↓
knowledge
↓
simulator
```

A evolução proposta é adicionar um novo estágio global:

```txt
site_sync
```

Fluxo completo:

```txt
extract
↓
analyze
↓
risk
↓
structure
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
```

O estágio `site_sync` deve chamar os Site Agents e atualizar a tabela `site_area_snapshots`.

---

## 5. Worker específico de atualização do site

Criar o arquivo:

```txt
backend/src/siteAgents/siteSyncWorker.ts
```

Esse worker deve rodar periodicamente, por exemplo:

```txt
a cada 5 ou 10 minutos
```

Ele não processa arquivos diretamente. Ele lê dados já tratados e atualiza snapshots para as páginas.

### Responsabilidades

- verificar se já existe banco inicializado;
- rodar orquestrador dos Site Agents;
- atualizar snapshots por área e página;
- registrar horário da última sincronização;
- evitar execuções simultâneas;
- permitir pausa ou execução manual futura.

---

## 6. Fluxo geral

```txt
Documentos entram
  ↓
queueWorker processa arquivos
  ↓
queueAgents geram logs, risco e estrutura
  ↓
site_sync dispara
  ↓
siteAgents atualizam snapshots
  ↓
site_area_snapshots salva dados prontos
  ↓
frontend exibe resumos, alertas e sugestões
```

---

## 7. Estrutura inicial de arquivos

Criar:

```txt
backend/src/siteAgents/
├── types.ts
├── snapshots.ts
├── siteAgentRegistry.ts
├── siteAgentOrchestrator.ts
├── siteSyncWorker.ts
├── essentialOverviewAgent.ts
├── essentialAlertsAgent.ts
├── crisisReadinessAgent.ts
├── draftPreparationAgent.ts
├── dataQualityAgent.ts
├── graphEnrichmentAgent.ts
└── planCoverageAgent.ts
```

Essa primeira versão não precisa implementar todos os agentes do plano completo. Ela deve começar com os agentes de maior impacto.

---

## 8. Primeiros agentes recomendados

## 8.1 Essential Overview Agent

Atualiza a página:

```txt
Essencial / Painel
```

Gera:

- resumo da base;
- total de documentos;
- documentos com texto;
- documentos de risco;
- documentos recentes;
- áreas com pouca cobertura;
- ações recomendadas.

---

## 8.2 Essential Alerts Agent

Atualiza:

```txt
Essencial / Painel
```

Gera:

- alertas operacionais;
- documentos de risco alto;
- documentos sem texto;
- documentos sem resumo;
- classificação com baixa confiança;
- protocolos antigos;
- ausência de porta-vozes.

---

## 8.3 Crisis Readiness Agent

Atualiza:

```txt
Essencial / Crise
```

Gera:

- score de prontidão;
- status da área de crise;
- protocolos disponíveis;
- porta-vozes disponíveis;
- documentos sensíveis;
- talking points disponíveis;
- recomendações.

---

## 8.4 Draft Preparation Agent

Atualiza:

```txt
Ferramentas / Rascunhar
```

Gera:

- sugestões de release;
- sugestões de nota;
- documentos que podem virar conteúdo;
- fatos principais;
- temas com potencial de pauta.

---

## 8.5 Data Quality Agent

Atualiza:

```txt
Base de Dados / Saúde
Base de Dados / Documentos
```

Gera:

- diagnóstico da base;
- documentos sem texto;
- documentos sem resumo;
- documentos sem entidades;
- documentos com baixa confiança;
- tabelas vazias;
- fotos sem vínculo;
- problemas de qualidade.

---

## 8.6 Graph Enrichment Agent

Atualiza:

```txt
Base de Dados / Grafo
```

Gera:

- conexões fortes;
- nós centrais;
- documentos órfãos;
- temas mais conectados;
- explicação textual das relações.

---

## 8.7 Plan Coverage Agent

Atualiza:

```txt
Base de Dados / Plano
```

Gera:

- cobertura por seção do plano;
- seções fortes;
- seções fracas;
- documentos de suporte;
- maturidade da base;
- recomendações de preenchimento.

---

## 9. Tabela de snapshots

Criar tabela:

```sql
CREATE TABLE IF NOT EXISTS site_area_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area TEXT NOT NULL,
  page TEXT NOT NULL,
  agent TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  status TEXT,
  priority INTEGER DEFAULT 0,
  risk_level TEXT,
  payload TEXT,
  source_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Índices:

```sql
CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_area ON site_area_snapshots(area);
CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_page ON site_area_snapshots(page);
CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_agent ON site_area_snapshots(agent);
CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_risk ON site_area_snapshots(risk_level);
```

Essa tabela deve funcionar como cache inteligente das páginas.

---

## 10. Novo estágio global da fila

Adicionar ao tipo de estágio:

```ts
export type QueueStage =
  | 'extract'
  | 'analyze'
  | 'risk'
  | 'structure'
  | 'relations'
  | 'clusters'
  | 'knowledge'
  | 'simulator'
  | 'site_sync';
```

Adicionar `site_sync` em `enqueueGlobalStages`.

Exemplo:

```ts
const stages = ['relations', 'clusters', 'knowledge', 'simulator', 'site_sync'] as QueueStage[];
```

No `queueWorker`, adicionar:

```ts
case 'site_sync':
  await runSiteAgentsSync();
  break;
```

---

## 11. Worker periódico

Criar função:

```ts
startSiteSyncWorker(intervalMs: number = 10 * 60 * 1000)
```

Esse worker deve:

- evitar dupla execução com flag `isRunning`;
- rodar `runSiteAgentsSync()`;
- salvar logs;
- capturar erros sem derrubar o servidor.

Exemplo conceitual:

```ts
let siteSyncInterval: any = null;
let isSiteSyncRunning = false;

export function startSiteSyncWorker(intervalMs = 10 * 60 * 1000) {
  if (siteSyncInterval) return;
  siteSyncInterval = setInterval(runSafeSiteSync, intervalMs);
  setTimeout(runSafeSiteSync, 15000);
}

async function runSafeSiteSync() {
  if (isSiteSyncRunning) return;
  isSiteSyncRunning = true;
  try {
    await runSiteAgentsSync();
  } finally {
    isSiteSyncRunning = false;
  }
}
```

---

## 12. Integração com o servidor

Alterar:

```txt
backend/src/index.ts
```

Adicionar import:

```ts
import { startSiteSyncWorker } from './siteAgents/siteSyncWorker';
```

No startup:

```ts
startSiteSyncWorker(10 * 60 * 1000);
```

Assim o site fica atualizado mesmo quando não há novo arquivo entrando.

---

## 13. Endpoints recomendados

Criar rota:

```txt
backend/src/routes/siteAgents.ts
```

Endpoints:

```txt
GET /api/site-agents
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/:area
GET /api/site-agents/snapshots/:area/:page
POST /api/site-agents/run
```

### Uso esperado

```txt
GET /api/site-agents/snapshots/essencial
GET /api/site-agents/snapshots/ferramentas
GET /api/site-agents/snapshots/dados
GET /api/site-agents/snapshots/essencial/dashboard
```

---

## 14. Atualização do frontend

O frontend pode continuar usando os endpoints atuais.

A nova camada entra como complemento visual:

```txt
Resumo inteligente
Alertas
Sugestões da IA
Última atualização
Ações recomendadas
```

Cada página poderia buscar seu snapshot:

```ts
api.siteSnapshots.get('essencial', 'dashboard')
api.siteSnapshots.get('ferramentas', 'generator')
api.siteSnapshots.get('dados', 'health')
```

---

## 15. Estratégia de implementação segura

A implementação deve ser incremental.

### Fase 1

- criar `siteAgents/types.ts`;
- criar `siteAgents/snapshots.ts`;
- criar tabela `site_area_snapshots`;
- criar 3 agentes iniciais:
  - `essentialOverviewAgent`;
  - `essentialAlertsAgent`;
  - `dataQualityAgent`.

### Fase 2

- criar `siteAgentRegistry.ts`;
- criar `siteAgentOrchestrator.ts`;
- criar `siteSyncWorker.ts`;
- criar endpoint manual `POST /api/site-agents/run`.

### Fase 3

- conectar `site_sync` na fila;
- adicionar `startSiteSyncWorker` no startup;
- criar endpoints de consulta dos snapshots.

### Fase 4

- adicionar agentes restantes:
  - `crisisReadinessAgent`;
  - `draftPreparationAgent`;
  - `graphEnrichmentAgent`;
  - `planCoverageAgent`.

### Fase 5

- atualizar frontend para exibir snapshots nas páginas.

---

## 16. Benefícios esperados

Com workers para Site Agents, o sistema passa a ter atualização contínua das páginas.

Benefícios:

- painel mais rápido;
- informações pré-processadas;
- alertas sempre prontos;
- páginas mais inteligentes;
- menor carga no frontend;
- melhor experiência para a ASCOM;
- dados de risco e qualidade sempre disponíveis;
- integração natural entre fila, agentes e site.

---

## 17. Resultado esperado

Após a implementação, o sistema terá três camadas trabalhando juntas:

```txt
1. Queue Worker
   Processa arquivos e estágios globais.

2. Queue Agents
   Enriquecem cada etapa com logs, risco e rastreabilidade.

3. Site Agents Worker
   Atualiza snapshots inteligentes para as áreas do site.
```

O painel passa a exibir dados tratados e prontos, em vez de depender apenas de consultas diretas ao banco a cada abertura de página.

---

## 18. Conclusão

Trabalhar com workers é o modelo mais adequado para implementar os Agentes de Atualização do Site.

O `site_sync` dentro da fila garante atualização após processamentos relevantes.

O `siteSyncWorker` periódico garante que o painel continue atualizado mesmo quando não há novos documentos.

Essa abordagem transforma o sistema em uma central viva de inteligência operacional, onde as páginas essenciais, ferramentas e base de dados são alimentadas continuamente por agentes em segundo plano.
