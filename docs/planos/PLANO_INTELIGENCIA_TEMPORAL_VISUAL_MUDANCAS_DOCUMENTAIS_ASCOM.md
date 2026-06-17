# PLANO — Inteligência Temporal, Visual e de Mudanças Documentais ASCOM

> **Projeto:** Plano de Comunicação — NOVACAP / ASCOM  
> **Área:** Centro de Inteligência Comunicacional  
> **Módulos:** Calendário, Galeria de Fotos, Scanner, Fila, Site Agents, Agentes de Conteúdo, Timeline, Relatórios  
> **Status:** Planejamento técnico e funcional  
> **Data:** Junho de 2026  
> **Substitui:** `PLANO_CALENDARIO_GALERIA_INTELIGENTE_ASCOM.md`

---

## 1. Visão geral

Este plano une três evoluções centrais do sistema:

1. **Calendário Inteligente** — eixo temporal da operação da ASCOM.
2. **Galeria Inteligente** — eixo visual da atuação institucional.
3. **Inteligência de Mudanças Documentais** — eixo de sincronização, versionamento, impacto e atualização contínua da base.

A lógica geral passa a ser:

```txt
Documento mudou na fonte
      ↓
Sistema detecta alteração
      ↓
Sistema cria versão e compara com a anterior
      ↓
Sistema entende o impacto da mudança
      ↓
Calendário, galeria, timeline, relatórios e agentes são atualizados
```

O objetivo é transformar o sistema de uma base documental inteligente para uma plataforma viva de acompanhamento institucional.

---

## 2. Conceito estratégico

```txt
Calendário = quando aconteceu
Galeria    = como aconteceu visualmente
Documento  = o que explica e comprova
Mudança    = o que foi alterado e qual impacto causa
IA         = conecta tudo isso em decisão, conteúdo e memória institucional
```

O sistema deve deixar de apenas indexar arquivos e passar a responder:

- O que mudou?
- Quando mudou?
- O que essa mudança afeta?
- Que documentos, fotos, datas e relatórios precisam ser atualizados?
- A alteração gera risco, oportunidade ou necessidade de ação?
- A mudança exige atualização em conteúdo, resposta oficial ou protocolo?

---

## 3. Estado atual do sistema

### 3.1 Scanner e sincronização atual

O sistema já possui scanner de fontes configuradas em `data_sources`.

Hoje ele:

- percorre as pastas configuradas;
- calcula hash MD5 do arquivo;
- compara com o hash salvo em `files.md5_hash`;
- detecta arquivo novo;
- detecta arquivo alterado;
- detecta arquivo removido;
- atualiza metadados do arquivo;
- reenfileira processamento por documento;
- registra estatísticas em `scan_log`;
- dispara etapas globais da fila.

Fluxo atual:

```txt
Fonte local configurada
      ↓
scanner.ts
      ↓
files.md5_hash
      ↓
novo / modificado / removido
      ↓
enqueueFile
      ↓
extract → analyze → risk → structure
      ↓
enqueueGlobalStages
      ↓
relations → clusters → knowledge → simulator → site_sync
```

### 3.2 Limitação atual

O sistema já detecta que um arquivo mudou, mas ainda não entende semanticamente **o que mudou**.

Hoje:

```txt
Detecta alteração? Sim.
Reprocessa? Sim.
Compara versão antiga e nova? Ainda não.
Mostra impacto da alteração? Ainda não.
Guarda histórico de versões? Ainda não.
Gera alerta sobre mudança crítica? Ainda não.
```

---

## 4. Estado atual do calendário

Rotas atuais:

```txt
GET    /api/calendar/heatmap
PUT    /api/calendar/check-day
DELETE /api/calendar/check-day
PUT    /api/calendar/check-month
GET    /api/calendar/kpi
```

Tabela atual:

```txt
calendar_checks
```

Funções existentes:

- heatmap por ano;
- densidade de documentos por mês e dia;
- total de documentos por dia;
- total de documentos extraídos;
- marcação de dia como analisado;
- desmarcação de dia;
- marcação de mês inteiro;
- KPIs de extração, classificação, progresso e estimativa de conclusão.

Evolução desejada:

```txt
Calendário = painel temporal de análise, oportunidade, risco e mudanças.
```

---

## 5. Estado atual da galeria

Rotas atuais:

```txt
GET  /api/photos/events
GET  /api/photos/events/:id
GET  /api/photos/by-document/:docId
GET  /api/photos/thumbnail
GET  /api/photos/serve
POST /api/photos/index
POST /api/photos/reindex
```

Tabelas atuais:

```txt
photo_events
photos
photo_document_links
```

Funções existentes:

- indexação de fontes do tipo `fotos`;
- leitura de pastas por mês e evento;
- extração de data pelo nome da pasta;
- limpeza do nome do evento;
- geração de thumbnails com `sharp`;
- cadastro de eventos fotográficos;
- cadastro de fotos;
- associação por similaridade entre eventos fotográficos e documentos;
- visualização de fotos por evento;
- visualização de fotos associadas a documentos;
- servir thumbnail e imagem original.

Evolução desejada:

```txt
Galeria = acervo visual inteligente da atuação institucional.
```

---

## 6. Arquitetura proposta

```txt
Fontes configuradas
  ├── documentos
  └── fotos
        ↓
Scanner / Photo Indexer
        ↓
Detecção de novo, alterado ou removido
        ↓
Versionamento e comparação semântica
        ↓
Fila de processamento
        ↓
Agentes de documento, calendário, galeria e mudanças
        ↓
Banco enriquecido
        ↓
Site Agents e snapshots
        ↓
Frontend
        ↓
Conteúdo, relatório, timeline, alerta e decisão
```

---

## 7. Nova camada: Document Change Intelligence

### 7.1 Objetivo

Criar uma camada responsável por transformar uma alteração física em uma análise institucional.

Em vez de apenas dizer:

```txt
Arquivo modificado.
```

O sistema deve dizer:

```txt
O documento foi alterado.
O tema principal mudou.
O risco subiu.
A orientação de porta-voz foi modificada.
Essa mudança afeta o calendário, a galeria e o plano de comunicação.
```

---

### 7.2 Funções principais

- criar versão do documento antes do reprocessamento;
- comparar versão anterior e nova;
- detectar diferença textual;
- detectar diferença semântica;
- classificar impacto da mudança;
- registrar histórico;
- gerar alerta se a mudança for crítica;
- indicar módulos afetados;
- disparar reprocessamento direcionado;
- atualizar calendário, galeria, grafo, timeline, relatórios e snapshots.

---

### 7.3 Tipos de mudança

```txt
conteudo_textual
metadado
classificacao
porta_voz
protocolo_crise
data_evento
valor_orcamentario
localidade
status_obra
risco_institucional
conteudo_visual_relacionado
remocao_documento
novo_documento
```

---

### 7.4 Níveis de impacto

```txt
baixo
medio
alto
critico
```

Exemplos:

```txt
Baixo    → correção de texto ou metadado sem impacto operacional.
Médio    → mudança de tema, data, status ou resumo.
Alto     → alteração que afeta resposta oficial, relatório ou planejamento.
Crítico  → mudança em protocolo, porta-voz, crise, risco ou informação sensível.
```

---

## 8. Novas tabelas propostas

### 8.1 document_versions

Guarda histórico das versões extraídas de um documento.

```sql
CREATE TABLE IF NOT EXISTS document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  md5_hash TEXT,
  source_path TEXT,
  cache_path TEXT,
  size_bytes INTEGER,
  last_modified TEXT,
  raw_text TEXT,
  summary TEXT,
  keywords TEXT,
  doc_type TEXT,
  plan_section TEXT,
  entities TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

---

### 8.2 document_change_events

Registra eventos de mudança detectados pelo scanner ou pela fila.

```sql
CREATE TABLE IF NOT EXISTS document_change_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  old_version_id INTEGER,
  new_version_id INTEGER,
  change_type TEXT NOT NULL,
  impact_level TEXT DEFAULT 'baixo',
  summary TEXT,
  diff_payload TEXT,
  affected_modules TEXT,
  recommended_action TEXT,
  status TEXT DEFAULT 'detected',
  detected_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

---

### 8.3 document_change_alerts

Fila de alertas operacionais derivados de mudanças.

```sql
CREATE TABLE IF NOT EXISTS document_change_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_event_id INTEGER NOT NULL,
  alert_title TEXT NOT NULL,
  alert_message TEXT,
  alert_level TEXT DEFAULT 'info',
  target_area TEXT,
  target_page TEXT,
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY(change_event_id) REFERENCES document_change_events(id) ON DELETE CASCADE
);
```

---

### 8.4 source_file_state

Tabela opcional para separar o caminho original do caminho cacheado.

```sql
CREATE TABLE IF NOT EXISTS source_file_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  source_id INTEGER,
  source_path TEXT NOT NULL,
  cache_path TEXT,
  md5_hash TEXT,
  last_seen_at TEXT,
  last_modified TEXT,
  exists_on_source INTEGER DEFAULT 1,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

Essa tabela corrige uma fragilidade atual: arquivos importáveis podem ser copiados para cache e o caminho salvo no banco pode deixar de representar exatamente o caminho original da fonte.

---

### 8.5 calendar_events

Tabela para eventos operacionais ou editoriais extraídos/gerados.

```sql
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  source TEXT,
  risk_level TEXT,
  opportunity_level TEXT,
  related_file_ids TEXT,
  related_photo_event_ids TEXT,
  related_change_event_ids TEXT,
  status TEXT DEFAULT 'suggested',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

### 8.6 calendar_content_opportunities

```sql
CREATE TABLE IF NOT EXISTS calendar_content_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_date TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  suggested_format TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'suggested',
  source_payload TEXT,
  related_change_event_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

### 8.7 photo_usage

```sql
CREATE TABLE IF NOT EXISTS photo_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER,
  event_id INTEGER,
  usage_type TEXT NOT NULL,
  usage_title TEXT,
  usage_url TEXT,
  used_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(event_id) REFERENCES photo_events(id)
);
```

---

### 8.8 photo_tags

```sql
CREATE TABLE IF NOT EXISTS photo_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  confidence REAL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(photo_id) REFERENCES photos(id)
);
```

---

### 8.9 photo_highlights

```sql
CREATE TABLE IF NOT EXISTS photo_highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  event_id INTEGER,
  highlight_type TEXT NOT NULL,
  score REAL DEFAULT 0,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(event_id) REFERENCES photo_events(id)
);
```

---

## 9. Novos agentes propostos

### 9.1 documentChangeAgent

Responsável por entender o impacto de uma alteração documental.

Funções:

- comparar texto anterior e novo;
- resumir o que mudou;
- detectar mudança de classificação;
- detectar mudança de entidade, porta-voz, data, local, obra ou valor;
- calcular impacto institucional;
- gerar ação recomendada;
- indicar módulos afetados;
- gerar alerta para revisão humana.

Snapshot sugerido:

```txt
area: essencial
page: painel
agent: documentChangeAgent
```

Payload sugerido:

```json
{
  "recentChanges": [],
  "criticalChanges": [],
  "affectedModules": [],
  "recommendedActions": []
}
```

---

### 9.2 sourceSyncAgent

Responsável por analisar a saúde das fontes configuradas.

Funções:

- identificar fonte offline;
- identificar muitos arquivos removidos;
- identificar mudança massiva;
- identificar caminhos cacheados inconsistentes;
- gerar alerta de sincronização;
- sugerir reindexação.

---

### 9.3 calendarIntelligenceAgent

Responsável por analisar a camada temporal.

Funções:

- identificar dias críticos;
- identificar meses prioritários;
- apontar dias pendentes de análise;
- sugerir pautas por data;
- cruzar documentos, fotos e mudanças por período;
- detectar concentração de assuntos sensíveis;
- sugerir agenda editorial;
- gerar resumo semanal/mensal;
- gerar alertas para o Painel.

Snapshot sugerido:

```txt
area: ferramentas
page: calendario
agent: calendarIntelligenceAgent
```

---

### 9.4 galleryContextAgent

Responsável por analisar o acervo visual.

Funções:

- identificar eventos com maior acervo;
- identificar eventos sem documentos relacionados;
- identificar documentos sem foto associada;
- identificar fotos relacionadas a documentos alterados;
- sugerir foto de destaque por evento;
- sugerir fotos para cards, site e relatórios;
- identificar fotos não utilizadas;
- gerar contexto textual do evento fotográfico;
- cruzar fotos com temas, RAs, campanhas e datas.

Snapshot sugerido:

```txt
area: dados
page: galeria
agent: galleryContextAgent
```

---

### 9.5 visualContentAgent

Agente voltado à produção de conteúdo a partir de fotos + documentos + mudanças.

Funções:

- sugerir card a partir de evento fotográfico;
- sugerir legenda de Instagram;
- sugerir release;
- sugerir carrossel;
- sugerir relatório visual;
- indicar imagem adequada para site;
- indicar quando uma mudança documental exige atualização de conteúdo já produzido.

---

### 9.6 timelineFusionAgent

Agente para cruzar calendário, documentos, fotos e mudanças na timeline.

Funções:

- criar linha do tempo visual-documental;
- transformar eventos em marcos institucionais;
- conectar entregas, obras, campanhas, registros fotográficos e alterações documentais;
- destacar períodos de maior atuação;
- mostrar evolução de um tema ao longo do tempo.

---

## 10. Novos endpoints sugeridos

### 10.1 Mudanças documentais

```txt
GET  /api/document-changes
GET  /api/document-changes/:id
GET  /api/document-changes/by-file/:fileId
POST /api/document-changes/:id/review
POST /api/document-changes/:id/resolve
GET  /api/document-changes/alerts
POST /api/document-changes/alerts/:id/resolve
```

### 10.2 Versões documentais

```txt
GET  /api/documents/:id/versions
GET  /api/documents/:id/versions/:versionId
GET  /api/documents/:id/diff/:oldVersionId/:newVersionId
POST /api/documents/:id/reprocess
```

### 10.3 Calendário

```txt
GET    /api/calendar/events
POST   /api/calendar/events
PUT    /api/calendar/events/:id
DELETE /api/calendar/events/:id

GET  /api/calendar/opportunities
POST /api/calendar/opportunities/generate
PUT  /api/calendar/opportunities/:id/status

GET  /api/calendar/day/:date
GET  /api/calendar/month/:year/:month
GET  /api/calendar/week/:year/:week
GET  /api/calendar/changes/:date
```

### 10.4 Galeria

```txt
GET  /api/photos/search
GET  /api/photos/tags
POST /api/photos/:id/tags
DELETE /api/photos/:id/tags/:tag

POST /api/photos/:id/use
GET  /api/photos/usage
GET  /api/photos/unused

GET  /api/photos/highlights
POST /api/photos/highlights/generate
PUT  /api/photos/highlights/:id/approve

GET  /api/photos/events/:id/content-suggestions
GET  /api/photos/events/:id/related-timeline
GET  /api/photos/events/:id/related-changes
```

### 10.5 Site Agents

```txt
POST /api/site-agents/run/calendar
POST /api/site-agents/run/gallery
POST /api/site-agents/run/changes

GET /api/site-agents/snapshots/ferramentas/calendario
GET /api/site-agents/snapshots/dados/galeria
GET /api/site-agents/snapshots/essencial/mudancas
```

---

## 11. Frontend — evolução das páginas

### 11.1 Página Calendário

Componentes sugeridos:

```txt
CalendarHeatmap
CalendarKpiCards
CalendarDayDrawer
CalendarMonthPanel
CalendarOpportunityList
CalendarRiskList
CalendarChangeList
CalendarEditorialSuggestions
CalendarAgentSnapshotCard
```

Funcionalidades:

- clicar em um dia e abrir drawer;
- mostrar documentos daquele dia;
- mostrar fotos daquele dia;
- mostrar eventos relacionados;
- mostrar mudanças documentais daquele dia;
- marcar dia como analisado;
- gerar pauta a partir do dia;
- gerar resumo semanal;
- ver dias críticos e pendentes;
- transformar oportunidade em tarefa/conteúdo.

---

### 11.2 Página Galeria

Componentes sugeridos:

```txt
PhotoEventGrid
PhotoEventDetail
PhotoSearchBar
PhotoTagFilter
PhotoHighlightPicker
PhotoUsagePanel
PhotoDocumentLinks
PhotoRelatedChanges
PhotoContentSuggestions
GalleryAgentSnapshotCard
```

Funcionalidades:

- busca por evento, data, tema, RA e documento;
- filtros por tags;
- foto de destaque por evento;
- registrar uso da foto;
- ver fotos ainda não usadas;
- sugerir card/release/legenda;
- associar ou corrigir vínculo com documentos;
- mostrar documentos alterados relacionados ao evento fotográfico;
- abrir evento fotográfico como base de conteúdo.

---

### 11.3 Página de Mudanças Documentais

Nova página sugerida:

```txt
Base de Dados > Mudanças
```

Componentes:

```txt
DocumentChangeInbox
DocumentVersionTimeline
DocumentDiffViewer
ChangeImpactCard
AffectedModulesList
ChangeReviewActions
```

Funcionalidades:

- ver alterações recentes;
- filtrar por impacto;
- abrir diff textual;
- ver resumo semântico da mudança;
- ver módulos afetados;
- marcar alteração como revisada;
- disparar reprocessamento;
- aceitar ou rejeitar alerta.

---

## 12. Integração com produção de conteúdo

Fluxo ideal:

```txt
Calendário identifica uma data relevante
      ↓
Galeria encontra fotos do evento/período
      ↓
Documentos explicam o contexto
      ↓
Mudança documental indica novidade ou risco
      ↓
Agente de conteúdo sugere formato
      ↓
Usuário escolhe: card, release, legenda ou relatório
      ↓
Sistema gera rascunho e sugere imagens
```

Exemplos:

```txt
Documento sobre drenagem foi alterado + fotos de obra existem
→ sugestão de post atualizado sobre atuação da Novacap

Protocolo de crise mudou
→ alerta para ASCOM revisar respostas padrão

Evento com 80 fotos e documento atualizado
→ sugestão de release com contexto novo

Documento de relatório mensal mudou
→ relatório e timeline precisam ser atualizados
```

---

## 13. Integração com relatórios

O relatório anual/mensal pode incluir:

- quantidade de eventos fotográficos;
- quantidade de fotos indexadas;
- fotos usadas em conteúdos;
- fotos não utilizadas;
- principais temas visuais;
- principais períodos de atuação;
- mapa temporal de documentos;
- mudanças documentais relevantes no período;
- documentos reprocessados;
- alertas resolvidos;
- evidências visuais por tema;
- destaques do mês;
- galeria de apoio por ação.

---

## 14. Integração com timeline

A timeline deve ganhar uma camada visual e de mudanças:

```txt
Data
  ├── documentos
  ├── versões documentais
  ├── mudanças detectadas
  ├── eventos fotográficos
  ├── fotos de destaque
  ├── conteúdos gerados
  ├── riscos ou pendências
  └── relatórios relacionados
```

Isso transforma a timeline em uma narrativa institucional completa e auditável.

---

## 15. Regras de inteligência

### 15.1 Regras para mudanças documentais

- mudança em protocolo de crise = impacto alto/crítico;
- mudança em porta-voz = impacto alto;
- mudança em valor, data ou local = impacto médio/alto;
- mudança em documento sensível = alerta para revisão;
- remoção de documento com alto relacionamento = alerta;
- alteração que muda classificação = reprocessar relações e snapshots;
- alteração que muda entidade principal = atualizar grafo e timeline;
- alteração com fotos relacionadas = sugerir revisão de conteúdo visual.

### 15.2 Regras para calendário

- dia com muitos documentos = alta prioridade;
- dia com documentos sensíveis = risco;
- dia com muitas mudanças = alerta operacional;
- dia com fotos e documentos = oportunidade de conteúdo;
- dia com fotos sem documentos = pendência de contexto;
- dia com documentos sem fotos = oportunidade de buscar imagem;
- mês com muitos documentos = prioridade editorial/analítica;
- período não analisado = alerta operacional.

### 15.3 Regras para galeria

- evento com muitas fotos e documentos = pronto para conteúdo;
- evento com muitas fotos e nenhum documento = precisa de contexto;
- documento alterado com fotos associadas = revisar conteúdo visual;
- documento de alta relevância sem foto = precisa de apoio visual;
- foto já usada = marcar uso;
- foto com boa dimensão/qualidade = candidata a destaque;
- evento antigo sem uso = oportunidade de memória institucional;
- evento recente com fotos = candidato a pauta rápida.

---

## 16. Fases de implementação

### Fase 1 — Robustez do scanner e caminhos

- Separar `source_path` e `cache_path`.
- Criar `source_file_state`.
- Evitar que o caminho cacheado substitua o caminho original da fonte.
- Garantir detecção confiável de removidos e alterados.
- Registrar eventos de scan com detalhes por arquivo.

### Fase 2 — Versionamento documental

- Criar `document_versions`.
- Antes de sobrescrever `document_text` e `document_summary`, salvar versão anterior.
- Criar endpoint de versões por documento.
- Criar diff textual simples.

### Fase 3 — Inteligência de mudanças

- Criar `document_change_events`.
- Criar `document_change_alerts`.
- Implementar `documentChangeAgent`.
- Classificar impacto da alteração.
- Gerar ações recomendadas.

### Fase 4 — Calendário e galeria

- Criar tabelas `calendar_events`, `calendar_content_opportunities`, `photo_usage`, `photo_tags`, `photo_highlights`.
- Criar rotas para eventos de calendário.
- Criar rotas para uso, tags e destaques de fotos.
- Criar endpoint de detalhe por dia com documentos, fotos e mudanças.

### Fase 5 — Site Agents

- Implementar `calendarIntelligenceAgent`.
- Implementar `galleryContextAgent`.
- Implementar `sourceSyncAgent`.
- Registrar agentes no `siteAgentRegistry.ts`.
- Gerar snapshots em `site_area_snapshots`.

### Fase 6 — Frontend

- Evoluir página Calendário com drawer por dia.
- Evoluir página Galeria com tags, uso, destaques e mudanças relacionadas.
- Criar página de Mudanças Documentais.
- Criar cards de snapshot dos agentes.
- Integrar com Rascunhar/Gerador.

### Fase 7 — Conteúdo, relatórios e timeline

- Criar geração de conteúdo a partir de dia/evento/mudança.
- Criar bloco de galeria no relatório mensal/anual.
- Criar bloco de mudanças relevantes no relatório.
- Criar timeline visual-documental com versões.

---

## 17. Benefícios esperados

### Para a ASCOM

- mais velocidade para encontrar imagens;
- melhor aproveitamento do acervo fotográfico;
- mais facilidade para gerar conteúdo;
- menos risco de esquecer datas ou eventos relevantes;
- mais clareza sobre o que já foi analisado;
- mais visão sobre oportunidades editoriais;
- alertas quando documentos críticos forem alterados;
- rastreabilidade das mudanças de informação;
- relatórios mais ricos, visuais e auditáveis.

### Para a gestão

- visão temporal da atuação;
- evidências visuais por período;
- identificação de gargalos;
- memória institucional organizada;
- capacidade de comprovar ações com documentos e fotos;
- histórico de mudanças e decisões.

### Para produção de conteúdo

- sugestão automática de pauta;
- sugestão de foto;
- sugestão de legenda;
- sugestão de release;
- cruzamento entre evento, documento, imagem e mudança.

---

## 18. Riscos e cuidados

- Não usar IA para inventar contexto de foto sem documento associado.
- Sempre diferenciar vínculo automático de vínculo validado.
- Preservar caminho original da imagem e do documento.
- Não substituir `source_path` por `cache_path`.
- Registrar uso de imagem para evitar repetição excessiva.
- Cuidar de fotos sensíveis ou internas.
- Permitir correção manual de associações.
- Não apagar fotos originais; apenas indexar e referenciar.
- Não tratar toda mudança como crise.
- Manter revisão humana para mudanças críticas.
- Guardar histórico sem expor informação sensível indevidamente.

---

## 19. Critérios de sucesso

O plano será considerado implementado quando:

- o sistema detectar documento novo, alterado e removido de forma confiável;
- alterações criarem versões documentais;
- o usuário conseguir ver o que mudou entre versões;
- mudanças críticas gerarem alerta;
- um dia do calendário mostrar documentos, fotos, mudanças e oportunidades;
- um evento fotográfico mostrar documentos relacionados, mudanças relacionadas e sugestões de conteúdo;
- o sistema sugerir fotos para um release/card;
- o relatório conseguir incluir destaques visuais e mudanças relevantes;
- o usuário conseguir marcar uso de uma foto;
- os Site Agents gerarem snapshots úteis para calendário, galeria e mudanças;
- a timeline conseguir contar uma história com data + documento + versão + foto.

---

## 20. Mensagem estratégica

> O calendário mostra quando a atuação aconteceu. A galeria mostra a evidência visual dessa atuação. Os documentos explicam o contexto. A inteligência de mudanças mostra o que foi atualizado e qual impacto isso causa. A IA conecta tudo isso e transforma em decisão, conteúdo, memória e rastreabilidade institucional.

---

## 21. Conclusão

A evolução integrada de Calendário, Galeria e Mudanças Documentais é essencial para transformar o sistema em um verdadeiro Centro de Inteligência Comunicacional.

O calendário orienta a operação no tempo.
A galeria fortalece a prova visual da atuação.
A inteligência de mudanças garante que a base não fique estática ou desatualizada.
Os agentes cruzam tudo com documentos, riscos, pautas, relatórios e timeline.

Com isso, a ASCOM passa a ter não apenas uma base documental e visual, mas uma memória institucional viva, auditável, sincronizada e orientada à produção de conteúdo.
