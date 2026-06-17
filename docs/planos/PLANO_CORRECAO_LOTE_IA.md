# Plano de Correção — Otimização e Lote da IA (Batch Processing)

> **Objetivo:** Refatorar o processamento em lote da IA e os estágios globais da fila para garantir que 100% dos documentos sejam analisados, usar processamento incremental em vez de recomputação total, e evitar gargalos de rede (HTTP) e de banco de dados (SQLite).

---

## User Review Required

> [!IMPORTANT]
> **Mudança de Paradigma: De Global para Incremental.** 
> Atualmente, quando a fila roda os estágios globais (`relations`, `clusters`, `knowledge`), ela tenta recalcular tudo para todos os documentos (ou, no caso atual por erro, os 200 mais recentes). 
> **A proposta:** Esses processos deixarão de ser "globais e massivos". Quando um documento novo for importado, as relações e clusters serão calculados *especificamente para ele* contra a base já existente. Isso torna o sistema instantâneo, não importa se você tem 10 ou 100.000 documentos.

> [!WARNING]
> **API do Serviço Python.** 
> Para otimizar os Embeddings, o backend Node enviará um array de textos para o Python. Assumiremos que a rota `POST /embeddings` do serviço Python aceitará `{ "texts": ["..."] }` em vez de apenas `{ "text": "..." }`. Se não aceitar, o Node rodará chamadas `Promise.all` em paralelo limitadas (concurrency), mas o ideal é atualizar o Python.

---

## Proposed Changes

A refatoração será dividida em 4 fases para tratar cada uma das inconsistências diagnosticadas.

---

### Fase 1 — Lote Real para Serviços de IA (Embeddings)

Em vez de bloquear o fluxo principal aguardando centenas de requisições sequenciais, vamos agrupar requisições ou fazê-las em paralelo controlado.

#### [MODIFY] [similarity.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/similarity.ts)
- Alterar o loop `for (const doc of documents)` que busca os embeddings.
- Implementar processamento em lotes (batch de 20 textos por vez).
- Enviar payload `{ texts: string[] }` para o Python (se a rota permitir) ou usar `Promise.all` mapeando com controle de concorrência (`Promise pool`) para não sobrecarregar a porta `:8000`.

---

### Fase 2 — Proteção do Banco de Dados (SQLite Limits)

O SQLite quebra se receber uma query com mais de 999 variáveis no `IN (?, ?, ...)`. Vamos proteger todos os módulos contra isso.

#### [MODIFY] [cluster.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/cluster.ts)
- Na função `getKeywordsBatch(db, fileIds)`, fatiar o array `fileIds` em pedaços de no máximo 100 itens.
- Fazer um loop fazendo a consulta `IN (...)` para cada pedaço e juntar os resultados no mapa.
- Evita falha catastrófica ao clusterizar mais de 999 documentos.

#### [MODIFY] [knowledgeGraph.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/knowledgeGraph.ts)
- Garantir que a extração de dados `getAllDocuments()` processe os cruzamentos de relacionamentos em chunks na memória, para não estourar a memória RAM da aplicação Node.

---

### Fase 3 — Processamento Incremental (Fim do "LIMIT 200")

Aqui corrigiremos a maior falha de todas: o limite dos 200 documentos mais recentes. Vamos substituir as recomputações globais por processamentos incrementais baseados no estado do documento.

#### [MODIFY] [queueWorker.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/queueWorker.ts)
- **Remover o `LIMIT 200`** da função `processGlobalStage()`.
- Mudar a abordagem: em vez de pegar "todos os documentos" e cruzar tudo, os estágios de similaridade devem cruzar os documentos que "ainda não processaram relações" contra todos os outros.
- Atualizar a função `handleSimulatorStage` para selecionar os melhores documentos de crise *aleatoriamente* ou baseados na relevância TF-IDF, sem se restringir aos últimos 200 importados.

#### [MODIFY] [database.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/database.ts) e [files.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/db/files.ts)
- Adicionar no SQLite as flags para sabermos o estado do documento:
  - `ALTER TABLE files ADD COLUMN relations_computed BOOLEAN DEFAULT 0`
  - `ALTER TABLE files ADD COLUMN graph_computed BOOLEAN DEFAULT 0`

#### [MODIFY] [similarity.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/similarity.ts)
- Refatorar `computeAllSimilarities`. Agora ele receberá dois parâmetros: os documentos *novos* e a base *existente*.
- Ele calculará os embeddings dos *novos*, buscará os embeddings antigos que deveriam estar cacheados no banco de dados, e fará o cruzamento `Novos x Base` e `Novos x Novos`, salvando as relações.
- Após isso, marca `relations_computed = 1`.

---

### Fase 4 — Persistência de Cache e Fim do Retrabalho

Recalcular as coisas toda vez que a fila roda destrói a performance.

#### [NEW] [embeddings.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/db/embeddings.ts) (Tabela no Banco)
- Criar a tabela `document_embeddings (file_id, embedding_json)` para **salvar os vetores da IA no SQLite**.
- Hoje eles existem apenas na memória RAM e somem a cada execução. Com os vetores salvos, cruzar documentos requer apenas uma conta matemática de cosseno local na CPU, sem chamar o serviço Python novamente.

#### [MODIFY] [knowledgeGraph.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/knowledgeGraph.ts)
- Remover a linha maléfica `clearKnowledgeRelations()`.
- O grafo de conhecimento deve apenas adicionar arestas (edges) que pertencem aos documentos recém-importados (onde `graph_computed = 0`).

---

## Verification Plan

### Testes Manuais
1. **Verificação do Limite (Inconsistência 1):** Subir um manual de crise de teste como o primeiro arquivo (mais antigo). Fazer upload de +200 documentos vazios. O simulador ainda deve ser capaz de criar cenários baseados no manual antigo.
2. **Crash SQLite (Inconsistência 3):** Criar um script para injetar rapidamente 1.100 mocks na tabela `document_summary`. Rodar a fila e confirmar que o `cluster.ts` não retorna erro `SQLITE_ERROR: too many SQL variables`.
3. **Persistência Embeddings (Inconsistência 5/6):** Importar um documento. Desligar o container Python `:8000`. Importar um segundo documento. Como o cache agora fica no banco de dados, o cruzamento do doc 2 com o doc 1 deve funcionar usando o cache do doc 1 sem precisar do serviço Python para ele.
