---
description: "Fase 2 — Performance do Backend (docs/PLANO_OTIMIZACAO.md)"
mode: subagent
color: "#f97316"
temperature: 0.1
permission:
  edit: allow
  bash: allow
---

# Fase 2 — Performance do Backend

Baseado no documento `docs/PLANO_OTIMIZACAO.md`. Execute APENAS as tarefas abaixo.

## 2.1 Full-Text Search com FTS5

1. **backend/src/db/connection.ts** — Criar tabela virtual FTS5:
   ```sql
   CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(raw_text, summary, keywords, content=document_text)
   ```
   Adicionar triggers para sincronização automática.

2. **backend/src/routes/search.ts** — Substituir `LIKE '%query%'` por `documents_fts MATCH ?`.
   Impacto: busca 10-100x mais rápida em volumes grandes.

## 2.2 Scanner Assíncrono

3. **backend/src/scanner.ts** — Substituir `fs.readdirSync` / `fs.statSync` por `fs.promises.readdir` / `fs.promises.stat`.
   Processar hashes MD5 com `createReadStream` em vez de ler arquivo inteiro.
   Adicionar batching para não bloquear event loop.

## 2.3 Cache de Vetores TF-IDF

4. **backend/src/analysis/semanticSearch.ts** — Persistir vetores TF-IDF no banco (nova tabela `document_vectors`).
   Recalcular apenas para documentos novos/modificados.
   Impacto: busca semântica de O(n) recálculo para O(1) lookup.

5. **backend/src/analysis/nlpService.ts** — Cachear modelos TF-IDF treinados em memória com invalidação por timestamp.

## 2.4 Similaridade Otimizada

6. **backend/src/analysis/similarity.ts** — Calcular similaridade apenas para documentos do mesmo cluster/tipo.
   Alternativa: usar LSH (Locality-Sensitive Hashing) para approximate nearest neighbors.

## 2.5 Índices de Banco de Dados

7. **backend/src/db/connection.ts** — Adicionar índices compostos:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_files_doc_type ON files(doc_type);
   CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
   CREATE INDEX IF NOT EXISTS idx_files_last_modified ON files(last_modified);
   CREATE INDEX IF NOT EXISTS idx_document_text_status ON document_text(status);
   CREATE INDEX IF NOT EXISTS idx_knowledge_relations_source ON knowledge_relations(source_type, source_id);
   CREATE INDEX IF NOT EXISTS idx_knowledge_relations_target ON knowledge_relations(target_type, target_id);
   CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
   CREATE INDEX IF NOT EXISTS idx_document_relations_score ON document_relations(similarity_score);
   ```

## 2.6 Batching de Queries no Dashboard

8. **backend/src/routes/dashboard.ts** — Consolidar múltiplas queries sequenciais em uma única transação.
   Usar `db.transaction()` para agrupar reads.

9. **backend/src/routes/health.ts** — Mesmo padrão de batching.
