# Plano de Agentes ASCOM

## 1. Visão geral

Este plano propõe a evolução do sistema **Plano de Comunicação — NOVACAP / ASCOM** para uma arquitetura baseada em **agentes especializados de inteligência artificial**.

A ideia central é deixar de tratar a IA como um único chat genérico e passar a organizar a inteligência do sistema em agentes com funções institucionais claras.

O sistema atual já possui várias aplicações de IA e NLP, como:

- classificação automática de documentos;
- chat consultivo com base documental;
- geração de cenários de crise;
- talking points;
- importação inteligente de dados;
- análise de planilhas;
- embeddings e similaridade semântica;
- extração de entidades;
- OCR em imagens;
- grafo de conhecimento.

A proposta deste plano é criar uma camada de **orquestração**, onde uma LLM principal interpreta a solicitação do usuário e decide qual agente especializado deve atuar.

---

## 2. Objetivo

Criar uma rede de agentes especializados para apoiar a rotina da ASCOM da Novacap em atividades de consulta, análise, produção de conteúdo, crise, planejamento e estruturação de dados.

O objetivo não é criar agentes autônomos sem controle, mas sim **agentes controlados pelo backend**, com permissões, ferramentas e responsabilidades bem definidas.

---

## 3. Conceito da arquitetura

Fluxo conceitual:

```txt
Usuário
  ↓
Agente Orquestrador ASCOM
  ↓
Identificação da intenção
  ↓
Chamada de um ou mais agentes especializados
  ↓
Consulta às ferramentas internas do sistema
  ↓
Consolidação da resposta
  ↓
Resposta final ao usuário
```

Exemplo:

```txt
Pergunta do usuário:
"Teve uma matéria negativa sobre uma obra. O que a ASCOM deve fazer?"

O orquestrador pode chamar:
1. Agente de Crise
2. Agente Documental
3. Agente Porta-Voz
4. Agente Gerador de Conteúdo
5. Agente de Risco

Resposta final:
- diagnóstico da situação;
- protocolo recomendado;
- documentos relacionados;
- porta-voz indicado;
- minuta de nota;
- riscos de imagem;
- próximos passos.
```

---

## 4. Agente Orquestrador ASCOM

### Função

Receber a solicitação do usuário, interpretar a intenção e decidir qual agente deve ser chamado.

### Responsabilidades

- identificar intenção da pergunta;
- decidir agente principal;
- acionar agentes auxiliares quando necessário;
- consolidar respostas;
- evitar que a LLM execute ações não autorizadas;
- registrar fonte, contexto e justificativa da resposta.

### Possíveis intenções

- consulta documental;
- crise;
- porta-voz;
- geração de conteúdo;
- importação de dados;
- planejamento;
- simulação;
- análise de risco;
- grafo e relações;
- indicadores.

---

## 5. Agentes propostos

## 5.1 Agente Documental

### Função

Localizar, resumir, comparar e explicar documentos internos.

### Ferramentas usadas

- busca textual;
- busca semântica;
- resumos;
- palavras-chave;
- entidades;
- grafo de conhecimento;
- documentos relacionados.

### Exemplos de uso

```txt
"Quais documentos falam sobre comunicação interna?"
"Resuma o protocolo de atendimento à imprensa."
"Compare estes dois documentos."
"Onde está o fluxo de resposta para crise?"
```

---

## 5.2 Agente Classificador

### Função

Classificar documentos automaticamente por tipo, seção e nível de confiança.

### Tipos de documento

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

### Observação

Este agente deve continuar trabalhando com fallback local por regex, evitando dependência total da LLM.

---

## 5.3 Agente de Crise

### Função

Apoiar a ASCOM em situações de crise, riscos institucionais e demandas sensíveis.

### Responsabilidades

- buscar protocolos relacionados;
- identificar porta-voz autorizado;
- sugerir resposta inicial;
- apontar riscos de imagem;
- indicar próximos passos;
- sugerir nota oficial;
- consultar assuntos sensíveis e normativas.

### Exemplos de uso

```txt
"Houve queda de árvore com imprensa no local. O que fazer?"
"Uma obra recebeu crítica nas redes. Qual deve ser a resposta?"
"Qual protocolo seguir em caso de acidente com equipe?"
```

---

## 5.4 Agente Porta-Voz

### Função

Orientar discurso oficial e apoiar falas institucionais.

### Responsabilidades

- identificar quem deve falar;
- sugerir frases aprovadas;
- indicar o que evitar;
- gerar talking points;
- apontar riscos jurídicos ou de imagem;
- padronizar tom institucional.

### Exemplos de uso

```txt
"Quem deve falar sobre esse tema?"
"O que o porta-voz pode dizer?"
"Quais pontos devem ser evitados?"
"Crie uma matriz de fala sobre drenagem urbana."
```

---

## 5.5 Agente Gerador de Conteúdo

### Função

Produzir textos institucionais a partir de documentos, fatos e contexto.

### Conteúdos possíveis

- release;
- nota oficial;
- legenda para Instagram;
- texto para WhatsApp;
- comunicado interno;
- resposta à imprensa;
- resumo executivo;
- pauta;
- card textual;
- briefing.

### Observação

O gerador de press release atual usa template fixo. Este agente pode evoluir essa parte para geração por LLM com controle de tom, fonte e contexto.

---

## 5.6 Agente de Dados e Planilhas

### Função

Interpretar dados estruturados e planilhas importadas.

### Responsabilidades

- identificar tipo de planilha;
- inferir schema;
- mapear colunas;
- sugerir tabela;
- detectar contatos, calendários, indicadores, orçamento, clipping e cronogramas;
- sugerir dashboards;
- explicar dados em linguagem simples.

### Exemplos de uso

```txt
"Que tipo de planilha é essa?"
"Transforme essa planilha em contatos."
"Quais indicadores aparecem nesse arquivo?"
"Mostre os eventos importados deste documento."
```

---

## 5.7 Agente de Simulação

### Função

Criar e avaliar cenários de treinamento para comunicação de crise.

### Responsabilidades

- gerar cenários de crise;
- criar opções de resposta;
- atribuir pontuação;
- fornecer feedback;
- gerar cenários a partir de documentos reais;
- avaliar resposta textual do usuário.

### Evolução recomendada

Conectar a função de avaliação textual por IA ao endpoint principal do simulador, para que o usuário possa responder livremente, não apenas escolher alternativas.

---

## 5.8 Agente de Grafo e Relações

### Função

Explicar conexões entre documentos, pessoas, seções, clusters e dados estruturados.

### Responsabilidades

- mostrar documentos relacionados;
- explicar por que documentos estão conectados;
- identificar pessoas e órgãos ligados a um tema;
- navegar por clusters;
- cruzar documentos com contatos, seções e dados.

### Exemplos de uso

```txt
"Quais documentos se relacionam com este protocolo?"
"Que pessoas aparecem ligadas a este tema?"
"Mostre tudo conectado à comunicação interna."
```

---

## 5.9 Agente de Planejamento

### Função

Analisar volume documental, calendário, ritmo de processamento e prioridades.

### Responsabilidades

- identificar meses com maior volume de documentos;
- sugerir prioridades de análise;
- apontar gargalos;
- transformar métricas em recomendações;
- apoiar planejamento da ASCOM.

### Observação

O workload advisor atual já gera recomendações por regra. Este agente pode transformar os dados em explicações mais estratégicas.

---

## 5.10 Agente de Risco Institucional

### Função

Avaliar riscos de comunicação, imagem, exposição institucional e sensibilidade pública.

### Responsabilidades

- detectar assuntos sensíveis;
- apontar risco jurídico ou reputacional;
- sugerir tom adequado;
- indicar necessidade de aprovação superior;
- sinalizar temas que exigem porta-voz autorizado.

### Exemplos de uso

```txt
"Esse tema é sensível?"
"Podemos publicar isso?"
"Qual risco de imagem nessa resposta?"
```

---

## 6. Estrutura sugerida de arquivos

```txt
backend/src/agents/
├── types.ts
├── registry.ts
├── orchestrator.ts
├── documentAgent.ts
├── classifierAgent.ts
├── crisisAgent.ts
├── spokespersonAgent.ts
├── contentAgent.ts
├── dataAgent.ts
├── simulatorAgent.ts
├── graphAgent.ts
├── planningAgent.ts
└── riskAgent.ts
```

Nova rota:

```txt
backend/src/routes/agents.ts
```

Endpoint principal:

```txt
POST /api/agents/ask
```

Exemplo de payload:

```json
{
  "question": "Houve crítica na imprensa sobre uma obra. O que a ASCOM deve fazer?",
  "mode": "auto",
  "context": {
    "documentIds": [],
    "priority": "normal"
  }
}
```

Exemplo de resposta:

```json
{
  "agent": "crisis_agent",
  "agentsUsed": ["crisis_agent", "document_agent", "spokesperson_agent", "content_agent"],
  "answer": "...",
  "sources": [],
  "recommendedActions": [],
  "riskLevel": "medio"
}
```

---

## 7. Modelo de decisão do orquestrador

O orquestrador pode usar uma primeira chamada à LLM apenas para decidir o plano de execução.

Exemplo de resposta esperada da LLM:

```json
{
  "intent": "crisis_response",
  "primaryAgent": "crisis_agent",
  "secondaryAgents": ["document_agent", "spokesperson_agent", "content_agent"],
  "needsDocuments": true,
  "needsRiskAnalysis": true,
  "expectedOutput": "orientacao_operacional"
}
```

O backend valida essa decisão antes de executar qualquer ação.

---

## 8. Segurança e controle

A arquitetura deve evitar autonomia excessiva da LLM.

Regras recomendadas:

- a LLM não altera banco diretamente;
- a LLM não executa comandos livres;
- cada agente possui ferramentas permitidas;
- toda resposta importante deve citar documentos ou dados usados;
- ações críticas devem exigir confirmação;
- conteúdo de crise deve indicar nível de confiança;
- assuntos sensíveis devem ser marcados para validação humana.

---

## 9. Fases de implementação

## Fase 1 — Base dos agentes

- criar pasta `backend/src/agents`;
- criar `types.ts`;
- criar `registry.ts`;
- criar `orchestrator.ts`;
- criar rota `/api/agents/ask`;
- conectar o orquestrador aos serviços já existentes.

## Fase 2 — Primeiros agentes

Implementar inicialmente:

- `documentAgent`;
- `crisisAgent`;
- `contentAgent`;
- `spokespersonAgent`.

Esses quatro agentes já entregam valor direto para a rotina da ASCOM.

## Fase 3 — Agentes avançados

Implementar:

- `dataAgent`;
- `simulatorAgent`;
- `graphAgent`;
- `planningAgent`;
- `riskAgent`.

## Fase 4 — Interface no frontend

Criar página:

```txt
frontend/src/pages/AgentsPage.tsx
```

Nome sugerido:

```txt
Central de Agentes ASCOM
```

Funcionalidades:

- modo automático;
- escolha manual de agente;
- histórico de consultas;
- documentos usados;
- próximos passos sugeridos;
- nível de risco;
- geração de nota/release a partir da resposta.

---

## 10. Benefícios esperados

- transforma o sistema em um centro inteligente de decisão;
- organiza melhor as aplicações de IA já existentes;
- reduz respostas genéricas;
- melhora controle e segurança;
- permite evolução modular;
- facilita apresentação institucional do projeto;
- aproxima o sistema da rotina real da ASCOM;
- cria uma narrativa forte: agentes especializados de comunicação pública.

---

## 11. Mensagem estratégica do projeto

O sistema não deve ser apresentado apenas como um chatbot ou buscador de documentos.

A melhor descrição estratégica é:

> O sistema opera como uma central de inteligência institucional da ASCOM, estruturada por agentes especializados capazes de consultar documentos, classificar riscos, orientar porta-vozes, gerar conteúdos, estruturar dados e apoiar decisões em situações de rotina ou crise.

---

## 12. Prioridade recomendada

A prioridade inicial deve ser criar o **Agente Orquestrador** e conectar os serviços que já existem.

Não é necessário reescrever todo o sistema.

O melhor caminho é aproveitar o que já está pronto:

- `consultService` vira base do Agente Documental;
- `aiClassifier` vira base do Agente Classificador;
- `simulatorAi` vira base do Agente de Simulação;
- `schemaInferrer` e `xlsxAnalyzer` viram base do Agente de Dados;
- `knowledgeGraph` vira base do Agente de Grafo;
- `workloadAdvisor` vira base do Agente de Planejamento;
- `generator` pode evoluir para o Agente Gerador de Conteúdo.

---

## 13. Conclusão

A criação de agentes é uma evolução natural do projeto.

O sistema nasceu da ideia de fazer uma IA ler e entender documentos. Hoje, ele já possui mecanismos de leitura, classificação, estruturação, busca, geração e simulação.

A camada de agentes transforma essas funções em uma experiência mais clara, modular e estratégica.

Com essa arquitetura, o projeto deixa de ser apenas um sistema documental e passa a funcionar como uma **rede de agentes de comunicação pública para apoio operacional e estratégico da ASCOM/Novacap**.
