# Plano de Agentes de Atualização do Site ASCOM

## 1. Visão geral

Este plano propõe um terceiro lote de agentes para o sistema **Plano de Comunicação — NOVACAP / ASCOM**.

Depois dos agentes interativos e dos agentes de fila, esta nova camada tem como objetivo tratar os dados já processados e transformá-los em informações prontas para atualizar as três áreas principais do site/painel:

- páginas essenciais;
- ferramentas;
- base de dados.

A proposta é criar agentes de segundo plano que não apenas leem documentos ou respondem perguntas, mas organizam os dados processados em **snapshots inteligentes por página**, alimentando o frontend com resumos, alertas, sugestões e ações recomendadas.

---

## 2. Estrutura atual do frontend

O menu do frontend está dividido em três áreas principais:

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

A camada proposta deve atuar sobre essas áreas, gerando dados auxiliares para deixar cada página mais inteligente e atualizada.

---

## 3. Conceito da nova camada

Fluxo proposto:

```txt
Fila processa documentos
  ↓
Agentes de fila enriquecem os dados
  ↓
Agentes de atualização do site organizam os dados por página
  ↓
Frontend exibe páginas mais inteligentes e atualizadas
```

Essa camada funciona como um **cache inteligente do site**, onde cada agente gera um snapshot com:

- área;
- página;
- resumo;
- status;
- prioridade;
- risco;
- payload estruturado;
- fontes usadas;
- recomendações.

---

## 4. Nome sugerido

Nome técnico:

```txt
Site Agents
```

Nome institucional:

```txt
Agentes de Atualização do Site
```

Nome mais forte para apresentação:

```txt
Agentes de Inteligência das Páginas
```

Descrição institucional:

> Os Agentes de Inteligência das Páginas transformam os dados processados pela fila em informações acionáveis para cada área do painel, atualizando automaticamente páginas essenciais, ferramentas e base de dados com alertas, resumos, sugestões e indicadores.

---

## 5. Agentes para páginas essenciais

Área:

```txt
Essencial
├── Painel
├── Consulta
├── Crise
└── Busca
```

Essas páginas representam o centro operacional do sistema.

---

## 5.1 Essential Overview Agent

### Página relacionada

`Painel`

### Função

Atualizar o painel principal com indicadores interpretados.

### Responsabilidades

- gerar resumo executivo do estado da base;
- identificar principais mudanças desde a última atualização;
- destacar documentos novos relevantes;
- destacar documentos de risco alto ou crítico;
- apontar áreas com pouca cobertura;
- gerar cards de prioridade;
- sugerir ações imediatas.

### Exemplo de saída

```json
{
  "area": "essencial",
  "page": "dashboard",
  "title": "Painel atualizado",
  "summary": "A base recebeu 18 novos documentos, com 3 itens sensíveis e 2 protocolos antigos.",
  "priorityCards": [
    "Revisar documentos de risco alto",
    "Atualizar protocolo de crise antigo",
    "Completar base de porta-vozes"
  ]
}
```

---

## 5.2 Essential Alerts Agent

### Página relacionada

`Painel`

### Função

Aprimorar os alertas operacionais da tela inicial.

### Responsabilidades

- transformar logs de risco em alertas visíveis;
- detectar documentos sem resumo;
- detectar documentos sem texto extraído;
- detectar classificações com baixa confiança;
- detectar páginas sem dados suficientes;
- identificar lacunas institucionais;
- priorizar alertas por severidade.

### Exemplos de alertas

```txt
Documento de risco alto identificado.
Protocolo de crise sem atualização recente.
Nenhum documento de porta-voz encontrado.
Muitos documentos sem texto extraído.
Classificações com baixa confiança exigem revisão.
```

---

## 5.3 Crisis Readiness Agent

### Página relacionada

`Crise`

### Função

Atualizar o nível de prontidão da ASCOM para situações de crise.

### Responsabilidades

- medir disponibilidade de protocolos;
- medir disponibilidade de porta-vozes;
- identificar documentos sensíveis recentes;
- consultar talking points disponíveis;
- identificar documentos de risco alto ou crítico;
- sugerir atualização de protocolos;
- gerar score de prontidão.

### Score sugerido

```txt
Prontidão de crise =
30% protocolos encontrados
20% porta-vozes encontrados
20% documentos sensíveis mapeados
15% talking points disponíveis
15% documentos atualizados recentemente
```

### Exemplo de saída

```json
{
  "area": "essencial",
  "page": "crisis",
  "title": "Prontidão de crise",
  "status": "atenção",
  "score": 68,
  "summary": "Há protocolos disponíveis, mas a base de porta-vozes precisa ser reforçada.",
  "recommendedActions": [
    "Atualizar protocolo de crise",
    "Cadastrar porta-vozes por tema",
    "Revisar documentos sensíveis recentes"
  ]
}
```

---

## 5.4 Search Intelligence Agent

### Páginas relacionadas

`Consulta` e `Busca`

### Função

Preparar sugestões e expansão semântica para busca e consulta.

### Responsabilidades

- gerar perguntas rápidas;
- identificar termos mais recorrentes;
- criar sinônimos institucionais;
- mapear siglas e setores;
- sugerir buscas relacionadas;
- identificar documentos mais úteis;
- criar aliases de temas.

### Exemplo

```txt
Usuário busca: árvore caiu

Sistema também procura:
- queda de árvore
- arborização
- parques e jardins
- DPJ
- risco de queda
- imprensa no local
```

---

## 6. Agentes para ferramentas

Área:

```txt
Ferramentas
├── Rascunhar
├── Matriz
├── Mailing
├── Simulador
└── Calendário
```

Essas páginas representam ações práticas e produção da ASCOM.

---

## 6.1 Draft Preparation Agent

### Página relacionada

`Rascunhar`

### Função

Preparar sugestões de conteúdo com base em documentos recentes e dados estruturados.

### Responsabilidades

- identificar documentos que podem virar release;
- extrair fatos principais;
- identificar locais, obras, valores e prazos;
- sugerir pautas;
- sugerir notas oficiais;
- criar cards de contexto para redação;
- indicar documentos de apoio.

### Exemplo de saída

```json
{
  "page": "generator",
  "suggestions": [
    {
      "type": "release",
      "title": "Obras de drenagem no Paranoá",
      "sourceDocuments": [123, 124],
      "facts": ["investimento", "local", "benefício", "prazo"],
      "status": "pronto_para_rascunho"
    }
  ]
}
```

---

## 6.2 Talking Points Refresh Agent

### Página relacionada

`Matriz`

### Função

Atualizar a matriz de talking points.

### Responsabilidades

- identificar temas sensíveis sem matriz de fala;
- sugerir talking points;
- separar o que pode ser dito e o que deve ser evitado;
- vincular talking points a documentos de origem;
- marcar sugestões que exigem aprovação humana;
- atualizar categorias.

---

## 6.3 Mailing Intelligence Agent

### Página relacionada

`Mailing`

### Função

Melhorar a base de contatos e relacionamentos.

### Responsabilidades

- detectar contatos em documentos;
- sugerir novos contatos;
- identificar organizações recorrentes;
- separar imprensa, órgãos públicos, equipes internas e parceiros;
- apontar contatos incompletos;
- relacionar contatos a temas;
- sugerir enriquecimento do mailing.

### Exemplo

```txt
Contato citado em vários documentos, mas sem e-mail cadastrado.
Ação sugerida: completar mailing.
```

---

## 6.4 Simulator Seed Agent

### Página relacionada

`Simulador`

### Função

Selecionar documentos e temas que podem virar cenários de treinamento.

### Responsabilidades

- escolher documentos com potencial de simulação;
- priorizar documentos de risco alto;
- gerar sugestões de cenários;
- evitar duplicação;
- criar trilhas de treinamento;
- vincular cenário a documento de origem.

### Trilhas sugeridas

```txt
- Crise com imprensa
- Queda de árvore
- Obra atrasada
- Denúncia em rede social
- Porta-voz pressionado
```

---

## 6.5 Calendar Intelligence Agent

### Página relacionada

`Calendário`

### Função

Atualizar calendário e heatmap com datas extraídas dos documentos.

### Responsabilidades

- extrair datas de eventos;
- detectar prazos;
- identificar campanhas;
- identificar vencimentos;
- identificar reuniões e ações programadas;
- marcar datas sensíveis;
- criar eventos sugeridos;
- alimentar timeline e calendário.

---

## 7. Agentes para base de dados

Área:

```txt
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

Essa área representa a base de conhecimento institucional.

---

## 7.1 Data Catalog Agent

### Página relacionada

`Dados Estruturados`

### Função

Criar catálogo dos dados existentes.

### Responsabilidades

- listar tabelas importadas;
- identificar origem de cada tabela;
- identificar tipo de dado;
- calcular qualidade da tabela;
- listar colunas principais;
- sugerir usos;
- relacionar tabelas a documentos.

### Exemplo de saída

```json
{
  "table": "mailing_imprensa",
  "type": "contatos",
  "source": "planilha_mailing.xlsx",
  "quality": "boa",
  "suggestedUse": "alimentar página Mailing"
}
```

---

## 7.2 Data Quality Agent

### Páginas relacionadas

`Saúde`, `Documentos`, `Dados Estruturados`

### Função

Monitorar qualidade da base.

### Responsabilidades

- identificar documentos sem texto;
- identificar documentos sem resumo;
- identificar documentos sem classificação;
- identificar classificação com baixa confiança;
- identificar documentos sem entidades;
- detectar duplicados;
- detectar tabelas vazias;
- detectar fotos sem vínculo;
- detectar dados antigos;
- detectar protocolos desatualizados.

---

## 7.3 Graph Enrichment Agent

### Página relacionada

`Grafo`

### Função

Melhorar a leitura das conexões do grafo.

### Responsabilidades

- destacar conexões fortes;
- identificar nós centrais;
- separar clusters por tema;
- mostrar documentos órfãos;
- criar explicação textual das conexões;
- apontar áreas com pouca relação documental.

### Exemplo

```txt
O tema drenagem aparece conectado a obras, GDF na Sua Porta, investimento e regiões administrativas.
```

---

## 7.4 Document Curation Agent

### Página relacionada

`Documentos`

### Função

Fazer curadoria da base documental.

### Responsabilidades

- destacar documentos importantes;
- destacar documentos recentes;
- identificar duplicados;
- identificar documentos de baixa qualidade;
- identificar documentos estratégicos;
- listar documentos que precisam revisão;
- listar documentos com risco;
- marcar documentos prontos para uso público.

---

## 7.5 Timeline Narrative Agent

### Página relacionada

`Timeline`

### Função

Transformar dados e documentos em acontecimentos narrativos.

### Exemplos de acontecimentos

```txt
Nova obra iniciada.
Campanha lançada.
Protocolo atualizado.
Matéria sensível identificada.
Novo contato importado.
Relatório processado.
```

---

## 7.6 Report Insight Agent

### Página relacionada

`Relatórios`

### Função

Gerar insights executivos para relatórios.

### Responsabilidades

- gerar resumo executivo por cluster;
- apontar principais assuntos;
- destacar documentos mais importantes;
- identificar riscos;
- apontar lacunas;
- sugerir recomendação de comunicação;
- preparar versão imprimível.

---

## 7.7 Plan Coverage Agent

### Página relacionada

`Plano`

### Função

Calcular cobertura e maturidade do plano de comunicação.

### Responsabilidades

- medir quais partes do plano estão bem cobertas;
- detectar seções fracas;
- vincular documentos a cada seção;
- sugerir documentos necessários;
- gerar nível de maturidade da base.

### Exemplo

```txt
Gerenciamento de Crise: bom
Porta-vozes: fraco
Calendário de Eventos: médio
Materiais de Campanha: bom
```

---

## 7.8 Gallery Context Agent

### Página relacionada

`Galeria`

### Função

Organizar fotos com contexto documental.

### Responsabilidades

- relacionar fotos a documentos;
- sugerir legenda;
- identificar evento associado;
- organizar fotos por tema;
- indicar fotos úteis para releases;
- destacar imagens sem vínculo documental.

---

## 8. Arquitetura sugerida

Criar nova pasta:

```txt
backend/src/siteAgents/
├── types.ts
├── snapshots.ts
├── siteAgentRegistry.ts
├── siteAgentOrchestrator.ts
├── essentialOverviewAgent.ts
├── essentialAlertsAgent.ts
├── crisisReadinessAgent.ts
├── searchIntelligenceAgent.ts
├── draftPreparationAgent.ts
├── talkingPointsRefreshAgent.ts
├── mailingIntelligenceAgent.ts
├── simulatorSeedAgent.ts
├── calendarIntelligenceAgent.ts
├── dataCatalogAgent.ts
├── dataQualityAgent.ts
├── graphEnrichmentAgent.ts
├── documentCurationAgent.ts
├── timelineNarrativeAgent.ts
├── reportInsightAgent.ts
├── planCoverageAgent.ts
└── galleryContextAgent.ts
```

Adicionar novo estágio global da fila:

```txt
site_sync
```

A fila passaria a ter:

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

## 9. Banco sugerido

Criar tabela central:

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

Essa tabela será o cache inteligente das páginas.

---

## 10. Endpoints sugeridos

```txt
GET /api/site-agents
GET /api/site-agents/snapshots
GET /api/site-agents/snapshots/:area
GET /api/site-agents/snapshots/:area/:page
POST /api/site-agents/run
```

Exemplos:

```txt
/api/site-agents/snapshots/essencial
/api/site-agents/snapshots/ferramentas
/api/site-agents/snapshots/dados
/api/site-agents/snapshots/essencial/dashboard
```

---

## 11. Como isso atualiza as três áreas

## Essencial

Atualiza:

```txt
Painel
Consulta
Crise
Busca
```

Com:

```txt
alertas, risco, documentos prioritários, lacunas e sugestões.
```

## Ferramentas

Atualiza:

```txt
Rascunhar
Matriz
Mailing
Simulador
Calendário
```

Com:

```txt
sugestões de conteúdo, talking points, contatos, cenários e datas.
```

## Base de Dados

Atualiza:

```txt
Grafo
Dados Estruturados
Documentos
Saúde
Timeline
Relatórios
Plano
Galeria
```

Com:

```txt
catálogo, qualidade, relações, cobertura, relatórios, narrativa e curadoria.
```

---

## 12. Fases de implementação

## Fase 1 — Base dos Site Agents

Criar:

```txt
backend/src/siteAgents/types.ts
backend/src/siteAgents/snapshots.ts
backend/src/siteAgents/siteAgentRegistry.ts
backend/src/siteAgents/siteAgentOrchestrator.ts
```

Criar tabela:

```txt
site_area_snapshots
```

---

## Fase 2 — Primeiros agentes por área

Prioridade inicial:

```txt
Essencial:
- essentialOverviewAgent
- essentialAlertsAgent
- crisisReadinessAgent

Ferramentas:
- draftPreparationAgent
- talkingPointsRefreshAgent
- calendarIntelligenceAgent

Base de Dados:
- dataQualityAgent
- graphEnrichmentAgent
- planCoverageAgent
```

Esses 9 agentes já entregam impacto direto no painel.

---

## Fase 3 — Conectar à fila

Adicionar estágio global:

```txt
site_sync
```

Esse estágio deve rodar após:

```txt
relations
clusters
knowledge
simulator
```

---

## Fase 4 — Criar endpoints

Adicionar rota:

```txt
backend/src/routes/siteAgents.ts
```

Com:

```txt
GET /api/site-agents
GET /api/site-agents/snapshots
POST /api/site-agents/run
```

---

## Fase 5 — Atualizar frontend

Sem refazer as páginas atuais.

Cada página pode continuar consumindo os endpoints existentes e receber uma camada extra:

```txt
api.siteSnapshots.get('essencial', 'dashboard')
api.siteSnapshots.get('ferramentas', 'generator')
api.siteSnapshots.get('dados', 'health')
```

No visual, isso pode aparecer como:

```txt
Resumo inteligente
Alertas
Sugestões da IA
Última atualização
Ações recomendadas
```

---

## 13. Relação com as camadas anteriores

A arquitetura completa passa a ter três níveis:

```txt
1. Agentes de fila
   Processam documentos.

2. Agentes interativos
   Respondem perguntas e apoiam decisões.

3. Agentes de atualização do site
   Transformam os dados processados em painéis, alertas, sugestões e conteúdos prontos para cada página.
```

---

## 14. Benefícios esperados

- páginas sempre atualizadas com inteligência de contexto;
- painel inicial mais acionável;
- alertas melhores para ASCOM;
- ferramentas com sugestões prontas;
- base de dados com qualidade monitorada;
- relatórios mais úteis;
- melhor aproveitamento dos dados estruturados;
- maior valor institucional do sistema;
- redução de trabalho manual de curadoria.

---

## 15. Narrativa estratégica

Mensagem sugerida:

> O sistema não apenas lê documentos e responde perguntas. Ele processa a base em segundo plano, interpreta os dados e atualiza automaticamente as áreas essenciais, ferramentas e base de dados do painel, mantendo a ASCOM com informações operacionais, estratégicas e acionáveis.

---

## 16. Conclusão

Este terceiro lote completa a evolução do sistema para uma arquitetura de inteligência contínua.

Com os agentes de atualização do site, a ASCOM passa a ter um painel que não depende apenas de consultas manuais. O próprio sistema interpreta o estado da base e atualiza suas páginas com alertas, resumos, oportunidades, riscos e recomendações.

Isso fortalece a proposta do projeto como uma **central de inteligência operacional e documental para comunicação pública**.
