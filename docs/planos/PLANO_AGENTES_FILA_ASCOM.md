# Plano de Agentes de Fila ASCOM

## 1. Visão geral

Este plano propõe a criação de uma camada de **agentes de fila** para o sistema **Plano de Comunicação — NOVACAP / ASCOM**.

A ideia é aproveitar o processamento em fila já existente no projeto e transformar cada etapa de processamento em uma atuação mais organizada, rastreável e inteligente.

Hoje o sistema já trabalha com estágios como:

- `extract`;
- `analyze`;
- `structure`;
- `relations`;
- `clusters`;
- `knowledge`;
- `simulator`.

Esses estágios já funcionam como uma esteira de processamento. A evolução proposta é criar uma camada formal de agentes que atuem sobre essa fila, cada um com responsabilidade clara.

---

## 2. Conceito

Fluxo atual:

```txt
Arquivo entra
  ↓
Fila executa etapas fixas
  ↓
Resultado salvo no banco
```

Fluxo proposto com agentes de fila:

```txt
Arquivo entra
  ↓
Fila de processamento
  ↓
Orquestrador de agentes de fila
  ↓
Agentes especializados por etapa
  ↓
Banco enriquecido
  ↓
Grafo, busca, crise, relatórios e agentes interativos ficam mais inteligentes
```

A fila deixa de ser apenas técnica e passa a funcionar como uma **esteira inteligente de análise documental**.

---

## 3. Diferença entre agentes interativos e agentes de fila

## Agentes interativos

Respondem perguntas do usuário.

Exemplo:

```txt
"Teve uma crise, o que fazer?"
```

## Agentes de fila

Trabalham automaticamente quando arquivos entram ou quando estágios globais rodam.

Exemplo:

```txt
"Novo PDF entrou. Classificar, resumir, extrair entidades e avaliar risco."
```

Os dois tipos de agentes se complementam:

```txt
Agentes de fila → preparam e enriquecem a base automaticamente.
Agentes interativos → respondem e apoiam decisões com base nessa base enriquecida.
```

---

## 4. Objetivo

Criar uma arquitetura de processamento automatizado onde cada arquivo que entra na base passe por agentes especializados capazes de:

- extrair conteúdo;
- classificar documentos;
- gerar resumo;
- extrair entidades;
- estruturar dados;
- encontrar relações;
- agrupar por temas;
- atualizar grafo de conhecimento;
- avaliar risco institucional;
- gerar cenários de simulação quando aplicável.

---

## 5. Nome sugerido da camada

Nome institucional recomendado:

```txt
Esteira de Agentes ASCOM
```

Alternativas:

```txt
Pipeline Inteligente ASCOM
Central de Processamento Inteligente
Esteira de Inteligência Documental
```

Descrição institucional:

> A Esteira de Agentes ASCOM processa automaticamente cada documento recebido, acionando agentes especializados para leitura, classificação, resumo, extração de entidades, análise de risco, estruturação de dados, criação de relações e geração de conhecimento institucional.

---

## 6. Agentes de fila propostos

## 6.1 Extract Queue Agent

### Estágio relacionado

`extract`

### Função

Extrair conteúdo bruto de arquivos.

### Responsabilidades

- ler PDF, DOCX, XLSX, imagens e outros formatos suportados;
- aplicar OCR quando necessário;
- salvar texto bruto;
- identificar falhas de leitura;
- marcar documento como extraído;
- registrar metadados básicos do processamento.

### Observação

Este agente deve ser majoritariamente determinístico, sem depender de LLM para tarefas simples.

---

## 6.2 Classify Queue Agent

### Estágio relacionado

`analyze`

### Função

Classificar documentos automaticamente.

### Responsabilidades

- identificar tipo do documento;
- indicar seção do plano;
- calcular confiança;
- aplicar fallback por regras quando a IA falhar;
- salvar classificação no banco;
- registrar fonte da classificação: IA, regex ou híbrida.

### Tipos possíveis

- protocolo de crise;
- fluxo de trabalho;
- porta-voz;
- calendário/agenda;
- assunto sensível;
- relatório de atuação;
- clipping/monitoramento;
- material de campanha;
- normativa/diretriz;
- relacionamento;
- documento administrativo;
- outro.

---

## 6.3 Summary Queue Agent

### Estágio relacionado

`analyze`

### Função

Gerar resumos e metadados textuais.

### Responsabilidades

- gerar resumo curto;
- gerar resumo executivo quando necessário;
- extrair palavras-chave;
- identificar tópicos principais;
- preparar texto para busca;
- gerar metadados úteis para o painel.

### Estratégia recomendada

Usar NLP local como padrão e LLM apenas quando:

- o documento for estratégico;
- o texto for muito complexo;
- o documento tiver alta relevância;
- for necessário resumo executivo.

---

## 6.4 Entity Queue Agent

### Estágio relacionado

`analyze`

### Função

Extrair entidades relevantes dos documentos.

### Responsabilidades

- identificar pessoas;
- órgãos;
- empresas;
- regiões administrativas;
- datas;
- valores;
- programas;
- veículos de imprensa;
- locais;
- temas sensíveis.

### Estratégia recomendada

Combinar:

- regex local;
- listas institucionais;
- spaCy;
- enriquecimento posterior por LLM quando necessário.

---

## 6.5 Structure Queue Agent

### Estágio relacionado

`structure`

### Função

Transformar documentos e planilhas em dados estruturados.

### Responsabilidades

- detectar tabelas;
- entender planilhas;
- inferir schemas;
- mapear colunas;
- identificar contatos, agendas, indicadores, orçamento, clipping e cronogramas;
- sugerir dashboards;
- salvar tabelas dinâmicas.

### Exemplos

```txt
Planilha de contatos → tabela de mailing
Planilha de agenda → tabela de calendário
Planilha de métricas → tabela de indicadores
Documento com tabela → dados estruturados
```

---

## 6.6 Relation Queue Agent

### Estágio relacionado

`relations`

### Função

Encontrar relações entre documentos, tabelas e entidades.

### Responsabilidades

- identificar documentos relacionados;
- cruzar documentos por temas;
- cruzar documentos por entidades;
- encontrar vínculos entre planilhas, contatos e arquivos;
- salvar relações no banco.

---

## 6.7 Cluster Queue Agent

### Estágio relacionado

`clusters`

### Função

Agrupar documentos semelhantes.

### Responsabilidades

- criar grupos temáticos;
- identificar documentos parecidos;
- apoiar navegação por assunto;
- facilitar busca contextual;
- indicar temas recorrentes.

---

## 6.8 Knowledge Queue Agent

### Estágio relacionado

`knowledge`

### Função

Atualizar o grafo de conhecimento.

### Responsabilidades

- conectar documentos a seções;
- conectar documentos a contatos;
- conectar documentos a dados estruturados;
- conectar documentos a clusters;
- criar visão navegável do conhecimento institucional.

### Resultado esperado

Uma base de relações útil para:

- grafo visual;
- busca semântica;
- consulta documental;
- análise de contexto;
- agentes interativos.

---

## 6.9 Risk Queue Agent

### Estágio sugerido

Novo estágio ou subetapa de `analyze`.

### Função

Avaliar risco institucional automaticamente.

### Responsabilidades

- detectar temas sensíveis;
- identificar menções a crise;
- classificar risco como baixo, médio, alto ou crítico;
- sugerir validação humana quando necessário;
- alimentar painel de crise;
- destacar documentos que exigem atenção.

### Exemplos de termos de risco

```txt
acidente
queda de árvore
imprensa
denúncia
Ministério Público
TCDF
investigação
interdição
desabamento
óbito
fraude
corrupção
```

### Exemplo de saída

```json
{
  "agent": "riskQueueAgent",
  "status": "done",
  "confidence": 0.82,
  "riskLevel": "alto",
  "summary": "Documento menciona imprensa, denúncia e obra.",
  "recommendedAction": "Validar antes de publicar."
}
```

---

## 6.10 Simulator Queue Agent

### Estágio relacionado

`simulator`

### Função

Gerar cenários de treinamento com base em documentos reais.

### Responsabilidades

- identificar documentos com potencial de simulação;
- gerar cenários de crise;
- criar opções de resposta;
- atribuir pontuação;
- gerar feedback;
- salvar cenário no banco;
- indicar origem documental do cenário.

### Observação

Esse agente deve priorizar documentos de alta sensibilidade, protocolos, assuntos recorrentes ou situações com risco institucional.

---

## 7. Arquitetura sugerida

Criar uma nova pasta:

```txt
backend/src/queueAgents/
├── types.ts
├── queueAgentRegistry.ts
├── queueAgentOrchestrator.ts
├── extractQueueAgent.ts
├── classifyQueueAgent.ts
├── summaryQueueAgent.ts
├── entityQueueAgent.ts
├── structureQueueAgent.ts
├── relationQueueAgent.ts
├── clusterQueueAgent.ts
├── knowledgeQueueAgent.ts
├── riskQueueAgent.ts
└── simulatorQueueAgent.ts
```

O `queueWorker.ts` passaria a chamar o orquestrador:

```txt
queueWorker
  ↓
queueAgentOrchestrator
  ↓
agente certo para aquele estágio
  ↓
resultado salvo no banco
```

---

## 8. Modelo de tipos sugerido

```ts
export type QueueAgentStage =
  | 'extract'
  | 'analyze'
  | 'structure'
  | 'relations'
  | 'clusters'
  | 'knowledge'
  | 'risk'
  | 'simulator';

export interface QueueAgentJob {
  id: number;
  fileId?: number;
  stage: QueueAgentStage;
  payload?: Record<string, any>;
}

export interface QueueAgentResult {
  agent: string;
  stage: QueueAgentStage;
  status: 'done' | 'skipped' | 'error';
  confidence?: number;
  summary?: string;
  riskLevel?: 'baixo' | 'medio' | 'alto' | 'critico';
  recommendedAction?: string;
  metadata?: Record<string, any>;
}
```

---

## 9. Logs inteligentes

Cada agente de fila deve gerar um registro de execução.

Exemplo:

```json
{
  "fileId": 128,
  "stage": "risk",
  "agent": "riskQueueAgent",
  "status": "done",
  "confidence": 0.86,
  "summary": "Documento contém sinais de risco institucional médio.",
  "recommendedAction": "Revisar antes de divulgação externa.",
  "createdAt": "2026-06-17T10:00:00.000Z"
}
```

Esses logs podem alimentar:

- histórico do documento;
- painel de processamento;
- auditoria;
- indicadores de qualidade;
- alertas de crise.

---

## 10. Banco de dados sugerido

Criar tabela:

```sql
CREATE TABLE IF NOT EXISTS queue_agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_item_id INTEGER,
  file_id INTEGER,
  stage TEXT NOT NULL,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence REAL,
  risk_level TEXT,
  summary TEXT,
  recommended_action TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Índices recomendados:

```sql
CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_file ON queue_agent_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_stage ON queue_agent_logs(stage);
CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_agent ON queue_agent_logs(agent);
CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_risk ON queue_agent_logs(risk_level);
```

---

## 11. Integração com agentes interativos

Os agentes interativos criados na camada `backend/src/agents` podem consultar os resultados dos agentes de fila.

Exemplos:

### Agente de Crise

Pode consultar documentos marcados com risco alto ou crítico.

### Agente Documental

Pode usar resumos, entidades e logs para melhorar respostas.

### Agente de Planejamento

Pode usar logs para saber onde há gargalos.

### Agente de Conteúdo

Pode evitar gerar texto direto quando o documento tiver risco alto.

### Agente Porta-Voz

Pode indicar validação humana quando a fila marcou o documento como sensível.

---

## 12. Fases de implementação

## Fase 1 — Base da arquitetura

- criar pasta `backend/src/queueAgents`;
- criar `types.ts`;
- criar `queueAgentRegistry.ts`;
- criar `queueAgentOrchestrator.ts`;
- criar função de log de execução;
- criar tabela `queue_agent_logs`.

## Fase 2 — Encapsular etapas existentes

Transformar a lógica atual do `queueWorker` em agentes:

```txt
extract → extractQueueAgent
analyze → classifyQueueAgent + summaryQueueAgent + entityQueueAgent
structure → structureQueueAgent
relations → relationQueueAgent
clusters → clusterQueueAgent
knowledge → knowledgeQueueAgent
simulator → simulatorQueueAgent
```

Nessa fase, a lógica não precisa mudar muito. O principal objetivo é organizar e registrar melhor a execução.

## Fase 3 — Criar Risk Queue Agent

Adicionar análise automática de risco documental.

Prioridade alta, pois esse agente agrega valor direto para ASCOM.

Ele deve:

- classificar risco;
- salvar log;
- marcar documentos sensíveis;
- gerar recomendação de ação;
- alimentar futuramente painel de crise.

## Fase 4 — Melhorar painel da fila

Adicionar no frontend:

- agentes executados por documento;
- status de cada agente;
- confiança;
- risco;
- resumo da execução;
- recomendações;
- filtros por estágio, agente e risco.

## Fase 5 — Conectar com Central de Agentes ASCOM

Permitir que os agentes interativos consultem os resultados da fila.

Exemplo:

```txt
Usuário: "Quais documentos recentes exigem atenção da ASCOM?"

Agente interativo consulta:
- queue_agent_logs;
- documentos com riskLevel alto/crítico;
- classificações recentes;
- temas recorrentes.
```

---

## 13. Benefícios esperados

- organização mais clara do processamento;
- maior rastreabilidade;
- melhor auditoria;
- facilidade para evoluir cada etapa;
- documentação automática da atuação da IA;
- alerta precoce de temas sensíveis;
- base documental mais rica;
- agentes interativos mais precisos;
- melhor apresentação institucional do projeto.

---

## 14. Narrativa estratégica

A criação de agentes de fila fortalece a narrativa de que o sistema não apenas responde perguntas, mas também **trabalha continuamente sobre a base documental**.

Mensagem sugerida:

> Além dos agentes interativos, o sistema possui uma esteira de agentes de fila que processa automaticamente os documentos da ASCOM. Cada arquivo passa por leitura, classificação, resumo, extração de entidades, análise de risco, estruturação de dados e geração de conhecimento institucional.

---

## 15. Relação com o projeto atual

A proposta aproveita o que já existe:

- `queue.ts` já define estágios de processamento;
- `queueWorker.ts` já executa extração, análise, estruturação e estágios globais;
- `aiClassifier` já classifica documentos;
- `nlpService` já gera resumo e palavras-chave;
- `entityExtractor` já extrai entidades;
- `unifiedImporter` já estrutura dados;
- `relationshipFinder` já encontra relações;
- `knowledgeGraph` já gera relações de conhecimento;
- `simulatorAi` já gera cenários.

A implementação proposta não exige recomeçar o projeto. Ela apenas organiza a fila em uma arquitetura de agentes.

---

## 16. Prioridade recomendada

A prioridade inicial deve ser:

1. criar a pasta `queueAgents`;
2. criar os tipos base;
3. criar o orquestrador;
4. criar o log de execução;
5. encapsular `analyze` em agentes menores;
6. adicionar o `riskQueueAgent`.

O `riskQueueAgent` deve ser tratado como prioridade estratégica porque transforma a fila em um mecanismo de alerta institucional.

---

## 17. Conclusão

Sim, faz sentido criar agentes que atuem diretamente na fila.

Essa evolução transforma o processamento automático do sistema em uma **esteira inteligente de agentes**, onde cada documento é lido, classificado, resumido, estruturado, relacionado e avaliado quanto a risco institucional.

Com isso, o sistema passa a ter duas camadas de inteligência:

```txt
1. Agentes de fila
   Preparam e enriquecem a base automaticamente.

2. Agentes interativos
   Respondem, orientam e apoiam decisões com base na base enriquecida.
```

Essa combinação fortalece o sistema como uma central de inteligência documental e operacional para a ASCOM/Novacap.
