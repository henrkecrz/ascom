# PLANO — Calendário Inteligente e Galeria Inteligente ASCOM

> **Projeto:** Plano de Comunicação — NOVACAP / ASCOM  
> **Área:** Centro de Inteligência Comunicacional  
> **Módulos:** Calendário, Galeria de Fotos, Site Agents, Agentes de Conteúdo, Timeline, Relatórios  
> **Status:** Planejamento técnico e funcional  
> **Data:** Junho de 2026

---

## 1. Visão geral

O sistema já possui duas bases importantes que ainda podem evoluir muito dentro do Centro de Inteligência Comunicacional:

1. **Calendário** — hoje funciona como leitura temporal da base documental, com heatmap, dias analisados, KPIs, mês prioritário e acompanhamento de progresso.
2. **Galeria de Fotos** — hoje funciona como acervo visual por evento, com indexação de pastas, geração de thumbnails, visualização de eventos e vínculo aproximado com documentos.

A evolução proposta é transformar esses dois módulos em camadas inteligentes:

```txt
Calendário = eixo temporal da operação da ASCOM
Galeria    = eixo visual da atuação institucional
```

Juntos, eles devem cruzar:

```txt
data + documento + foto + pauta + risco + conteúdo + relatório
```

---

## 2. Objetivo estratégico

Criar uma camada capaz de responder automaticamente:

- O que aconteceu em determinada data?
- Quais documentos sustentam esse acontecimento?
- Quais fotos ilustram essa atuação?
- Isso pode virar pauta, release, card, relatório ou post?
- Há risco, pendência ou oportunidade editorial naquela data?
- Quais ações da Novacap têm registro visual e documental?
- Quais fotos ainda não foram utilizadas em conteúdos?
- Quais eventos têm fotos, mas não têm documentos associados?
- Quais documentos têm assunto relevante, mas não têm imagem associada?

---

## 3. Conceito operacional

### 3.1 Calendário Inteligente

O Calendário Inteligente deve deixar de ser apenas um heatmap de documentos e passar a funcionar como:

```txt
Painel temporal de análise, oportunidade e risco da comunicação.
```

Ele deve organizar:

- dias com documentos;
- dias com alto volume de demanda;
- dias analisados e não analisados;
- documentos por data;
- fotos por data;
- eventos relacionados;
- pautas sugeridas;
- riscos institucionais por período;
- oportunidades editoriais;
- produção realizada;
- pendências de análise.

### 3.2 Galeria Inteligente

A Galeria Inteligente deve deixar de ser apenas um álbum por evento e passar a funcionar como:

```txt
Acervo visual inteligente da atuação institucional.
```

Ela deve organizar:

- fotos por evento;
- fotos por data;
- fotos por tema;
- fotos por Região Administrativa;
- fotos por documento;
- fotos por campanha;
- fotos por área técnica;
- fotos com potencial de capa;
- fotos com potencial para Instagram;
- fotos com potencial para site;
- fotos já usadas e não usadas;
- fotos sem contexto documental;
- documentos sem foto associada.

---

## 4. Estado atual do sistema

### 4.1 Calendário atual

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

Funções já existentes:

- heatmap por ano;
- densidade de documentos por mês e dia;
- total de documentos por dia;
- total de documentos extraídos;
- marcação de dia como analisado;
- desmarcação de dia;
- marcação de mês inteiro;
- KPIs de extração, classificação, progresso e estimativa de conclusão.

### 4.2 Galeria atual

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

Funções já existentes:

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

---

## 5. Arquitetura proposta

```txt
Documentos + Fotos + Datas
        ↓
Scanner / Photo Indexer / Queue
        ↓
Banco enriquecido
        ↓
Calendar Intelligence Agent
Gallery Context Agent
        ↓
Snapshots inteligentes
        ↓
Frontend
        ↓
Conteúdo, relatório, timeline e decisão
```

---

## 6. Novos agentes propostos

### 6.1 calendarIntelligenceAgent

Responsável por analisar a camada temporal.

Funções:

- identificar dias críticos;
- identificar meses prioritários;
- apontar dias pendentes de análise;
- sugerir pautas por data;
- cruzar documentos e fotos por período;
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

Payload sugerido:

```json
{
  "year": 2026,
  "month": 6,
  "criticalDays": [],
  "pendingDays": [],
  "contentOpportunities": [],
  "riskPeriods": [],
  "topThemes": [],
  "recommendedActions": []
}
```

---

### 6.2 galleryContextAgent

Responsável por analisar o acervo visual.

Funções:

- identificar eventos com maior acervo;
- identificar eventos sem documentos relacionados;
- identificar documentos sem foto associada;
- sugerir foto de destaque por evento;
- sugerir fotos para cards, site e relatórios;
- identificar fotos não utilizadas;
- gerar contexto textual do evento fotográfico;
- cruzar fotos com temas, RAs, campanhas e datas.

Snapshot sugerido:

```txt
area: dados
page: galeria
tag: galleryContextAgent
```

Payload sugerido:

```json
{
  "eventsWithoutDocuments": [],
  "documentsWithoutPhotos": [],
  "highlightCandidates": [],
  "contentReadyEvents": [],
  "unusedPhotoEvents": [],
  "recommendedActions": []
}
```

---

### 6.3 visualContentAgent

Agente voltado à produção de conteúdo a partir de fotos + documentos.

Funções:

- sugerir card a partir de evento fotográfico;
- sugerir legenda de Instagram;
- sugerir release;
- sugerir carrossel;
- sugerir relatório visual;
- indicar imagem adequada para site;
- gerar lista de fotos por tema.

Pode atuar junto do módulo:

```txt
Rascunhar / Generator / Reports / Gallery
```

---

### 6.4 timelineFusionAgent

Agente para cruzar calendário, documentos e fotos na timeline.

Funções:

- criar linha do tempo visual-documental;
- transformar eventos em marcos institucionais;
- conectar entregas, obras, campanhas e registros fotográficos;
- destacar períodos de maior atuação.

---

## 7. Banco de dados — novas estruturas sugeridas

### 7.1 calendar_events

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
  status TEXT DEFAULT 'suggested',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Tipos possíveis:

```txt
pauta
evento_institucional
entrega_obra
campanha
risco
pendencia
aniversario_ra
relatorio
conteudo_sugerido
```

---

### 7.2 calendar_content_opportunities

Tabela para sugestões editoriais vinculadas a datas.

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
  created_at TEXT DEFAULT (datetime('now'))
);
```

Formatos possíveis:

```txt
post_instagram
card
carrossel
release
nota_site
relatorio
whatsapp_interno
campanha
```

---

### 7.3 photo_usage

Tabela para registrar uso das fotos.

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

Tipos de uso:

```txt
instagram
site
release
relatorio
card
campanha
whatsapp
impressao
```

---

### 7.4 photo_tags

Tabela para curadoria visual.

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

Tags possíveis:

```txt
obra
canteiro
drenagem
pavimentacao
parques_jardins
servidor
maquinario
autoridade
evento
antes_depois
capa
instagram
site
relatorio
```

---

### 7.5 photo_highlights

Tabela para destacar fotos candidatas.

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

Tipos:

```txt
capa_evento
instagram
site
relatorio
release
card
```

---

## 8. Novos endpoints sugeridos

### 8.1 Calendário

```txt
GET  /api/calendar/events
POST /api/calendar/events
PUT  /api/calendar/events/:id
DELETE /api/calendar/events/:id

GET  /api/calendar/opportunities
POST /api/calendar/opportunities/generate
PUT  /api/calendar/opportunities/:id/status

GET  /api/calendar/day/:date
GET  /api/calendar/month/:year/:month
GET  /api/calendar/week/:year/:week
```

### 8.2 Galeria

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
```

### 8.3 Agentes

```txt
POST /api/site-agents/run/calendar
POST /api/site-agents/run/gallery
GET  /api/site-agents/snapshots/ferramentas/calendario
GET  /api/site-agents/snapshots/dados/galeria
```

---

## 9. Frontend — evolução das páginas

### 9.1 Página Calendário

Componentes sugeridos:

```txt
CalendarHeatmap
CalendarKpiCards
CalendarDayDrawer
CalendarMonthPanel
CalendarOpportunityList
CalendarRiskList
CalendarEditorialSuggestions
CalendarAgentSnapshotCard
```

Funcionalidades:

- clicar em um dia e abrir drawer;
- mostrar documentos daquele dia;
- mostrar fotos daquele dia;
- mostrar eventos relacionados;
- marcar dia como analisado;
- gerar pauta a partir do dia;
- gerar resumo semanal;
- ver dias críticos e pendentes;
- transformar oportunidade em tarefa/conteúdo.

### 9.2 Página Galeria

Componentes sugeridos:

```txt
PhotoEventGrid
PhotoEventDetail
PhotoSearchBar
PhotoTagFilter
PhotoHighlightPicker
PhotoUsagePanel
PhotoDocumentLinks
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
- abrir evento fotográfico como base de conteúdo.

---

## 10. Integração com produção de conteúdo

Fluxo ideal:

```txt
Calendário identifica uma data relevante
      ↓
Galeria encontra fotos do evento/período
      ↓
Documentos explicam o contexto
      ↓
Agente de conteúdo sugere formato
      ↓
Usuário escolhe: card, release, legenda ou relatório
      ↓
Sistema gera rascunho e sugere imagens
```

Exemplos:

```txt
Dia com muitos documentos de drenagem + fotos de obra
→ sugestão de post sobre atuação da Novacap em águas pluviais

Evento com 80 fotos e documentos relacionados
→ sugestão de release com galeria de apoio

Mês com alta atividade em determinada RA
→ sugestão de relatório visual mensal por região
```

---

## 11. Integração com relatórios

O relatório anual/mensal pode incluir:

- quantidade de eventos fotográficos;
- quantidade de fotos indexadas;
- fotos usadas em conteúdos;
- fotos não utilizadas;
- principais temas visuais;
- principais períodos de atuação;
- mapa temporal de documentos;
- evidências visuais por tema;
- destaques do mês;
- galeria de apoio por ação.

---

## 12. Integração com timeline

A timeline deve ganhar uma camada visual:

```txt
Data
  ├── documentos
  ├── eventos fotográficos
  ├── fotos de destaque
  ├── conteúdos gerados
  ├── riscos ou pendências
  └── relatórios relacionados
```

Isso transforma a timeline em uma narrativa institucional completa.

---

## 13. Integração com Site Agents

Adicionar dois novos Site Agents:

```txt
calendarIntelligenceAgent
galleryContextAgent
```

### calendarIntelligenceAgent

Snapshot:

```txt
area: ferramentas
page: calendario
```

### galleryContextAgent

Snapshot:

```txt
area: dados
page: galeria
```

Os snapshots devem alimentar:

- Painel geral;
- Calendário;
- Galeria;
- Rascunhar;
- Relatórios;
- Timeline.

---

## 14. Regras de inteligência

### 14.1 Regras para calendário

- dia com muitos documentos = alta prioridade;
- dia com documentos sensíveis = risco;
- dia com fotos e documentos = oportunidade de conteúdo;
- dia com fotos sem documentos = pendência de contexto;
- dia com documentos sem fotos = oportunidade de buscar imagem;
- mês com muitos documentos = prioridade editorial/analítica;
- período não analisado = alerta operacional.

### 14.2 Regras para galeria

- evento com muitas fotos e documentos = pronto para conteúdo;
- evento com muitas fotos e nenhum documento = precisa de contexto;
- documento de alta relevância sem foto = precisa de apoio visual;
- foto já usada = marcar uso;
- foto com boa dimensão/qualidade = candidata a destaque;
- evento antigo sem uso = oportunidade de memória institucional;
- evento recente com fotos = candidato a pauta rápida.

---

## 15. Fases de implementação

### Fase 1 — Base de dados e rotas

- Criar tabelas `calendar_events`, `calendar_content_opportunities`, `photo_usage`, `photo_tags`, `photo_highlights`.
- Criar rotas para eventos de calendário.
- Criar rotas para uso, tags e destaques de fotos.
- Criar endpoint de detalhe por dia.

### Fase 2 — Agentes

- Implementar `calendarIntelligenceAgent`.
- Implementar `galleryContextAgent`.
- Registrar ambos em `siteAgentRegistry.ts`.
- Fazer snapshots entrarem em `site_area_snapshots`.

### Fase 3 — Frontend

- Evoluir página Calendário com drawer por dia.
- Evoluir página Galeria com tags, uso e destaques.
- Criar cards de snapshot dos agentes.
- Integrar com Rascunhar/Gerador.

### Fase 4 — Conteúdo e relatórios

- Criar geração de conteúdo a partir de dia/evento.
- Criar bloco de galeria no relatório mensal/anual.
- Criar timeline visual-documental.

### Fase 5 — Curadoria avançada

- Curadoria manual de foto de capa.
- Controle de uso de imagem.
- Marcação de fotos por tema.
- Correção manual de vínculos foto-documento.
- Sugestão automática de melhores fotos por evento.

---

## 16. Benefícios esperados

### Para a ASCOM

- mais velocidade para encontrar imagens;
- melhor aproveitamento do acervo fotográfico;
- mais facilidade para gerar conteúdo;
- menos risco de esquecer datas ou eventos relevantes;
- mais clareza sobre o que já foi analisado;
- mais visão sobre oportunidades editoriais;
- relatórios mais ricos e visuais.

### Para a gestão

- visão temporal da atuação;
- evidências visuais por período;
- identificação de gargalos;
- memória institucional organizada;
- capacidade de comprovar ações com documentos e fotos.

### Para produção de conteúdo

- sugestão automática de pauta;
- sugestão de foto;
- sugestão de legenda;
- sugestão de release;
- cruzamento entre evento, documento e imagem.

---

## 17. Riscos e cuidados

- Não usar IA para inventar contexto de foto sem documento associado.
- Sempre diferenciar vínculo automático de vínculo validado.
- Preservar caminho original da imagem.
- Registrar uso de imagem para evitar repetição excessiva.
- Cuidar de fotos sensíveis ou internas.
- Permitir correção manual de associações.
- Não apagar fotos originais; apenas indexar e referenciar.

---

## 18. Critérios de sucesso

O plano será considerado implementado quando:

- um dia do calendário mostrar documentos, fotos e oportunidades;
- um evento fotográfico mostrar documentos relacionados e sugestões de conteúdo;
- o sistema sugerir fotos para um release/card;
- o relatório conseguir incluir destaques visuais;
- o usuário conseguir marcar uso de uma foto;
- os Site Agents gerarem snapshots úteis para calendário e galeria;
- a timeline conseguir contar uma história com data + documento + foto.

---

## 19. Mensagem estratégica

> O calendário mostra quando a atuação aconteceu. A galeria mostra a evidência visual dessa atuação. Os documentos explicam o contexto. A IA conecta tudo isso e transforma em decisão, conteúdo e memória institucional.

---

## 20. Conclusão

A evolução do Calendário e da Galeria é essencial para transformar o sistema em um verdadeiro Centro de Inteligência Comunicacional.

O calendário deve orientar a operação no tempo.
A galeria deve fortalecer a prova visual da atuação.
Os agentes devem cruzar ambos com documentos, riscos, pautas e relatórios.

Com isso, a ASCOM passa a ter não apenas uma base documental, mas uma memória institucional viva, visual e orientada à produção de conteúdo.
