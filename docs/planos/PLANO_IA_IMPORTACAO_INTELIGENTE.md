# Plano de IA para Importação Inteligente e Classificação de Documentos

## 1. Problema Atual

- Classificador usa **apenas regex** (`classifier.ts:25-37`) — 0% de IA
- XLSX virado **texto plano** (`xlsxProcessor.ts:3-28`) — estrutura perdida
- DOCX vira **texto bruto** (`docxProcessor.ts:3-12`) — entidades jogadas fora
- Banco de dados único não reflete a **riqueza semântica** dos documentos
- Consulta ao plano depende de keywords, não de **entendimento real do conteúdo**

---

## 2. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE ENTRADA                        │
│                                                                 │
│  Scanner (pasta de rede)     Upload Manual    API Externa       │
│         │                         │               │             │
└─────────┼─────────────────────────┼───────────────┼─────────────┘
          │                         │               │
          ▼                         ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ORQUESTRADOR DE CLASSIFICAÇÃO                   │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐     │
│  │  Classifier v1 (regex)│  │  AI Classifier (OpenCode)    │     │
│  │  (fallback rápido)   │  │  (embedding + LLM)           │     │
│  └──────────────────────┘  └──────────────────────────────┘     │
│         │                           │                           │
│         └───────────┬───────────────┘                           │
│                     ▼                                           │
│          ┌──────────────────────┐                               │
│          │  Resultado Final     │  (docType + seção + confiança)│
│          └──────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                PROCESSADORES INTELIGENTES                        │
│                                                                 │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ XLSX Inteligente  │  │ DOCX Estruturado │  │ PDF + Imagem │  │
│  │ (detecta schema,  │  │ (extrai tabelas, │  │ (OCR + IA    │  │
│  │  mapeia colunas,  │  │  seções, metada- │  │  para extra- │  │
│  │  extrai temas)    │  │  dos, entidades) │  │  ção)        │  │
│  └────────┬──────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                      │                    │         │
└───────────┼──────────────────────┼────────────────────┼─────────┘
            │                      │                    │
            ▼                      ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BANCO DE DADOS ESTRUTURADOS                    │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ files (atual)  │  │ structured_  │  │ knowledge_graph    │   │
│  │ (índice de     │  │ data (NOVO)  │  │ (NOVO)             │   │
│  │  arquivos)     │  │ eventos,     │  │ relações entre     │   │
│  │                │  │ contatos,    │  │ entidades, docs,   │   │
│  │                │  │ protocolos,  │  │ pessoas            │   │
│  │                │  │ orçamentos   │  │                    │   │
│  └────────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMIA DO SISTEMA                          │
│                                                                 │
│  • Feedback loop: reclassificação manual → treina modelo        │
│  • Detecção automática de novos tipos documentais               │
│  • Sugestão de temas com base em similaridade semântica         │
│  • Re-análise periódica inteligente                             │
│  • Alertas de documentos órfãos ou desatualizados               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Motor de Classificação com IA

### 3.1 — Classificador Híbrido (substituir `classifier.ts`)

**Como funciona:**
1. **Tenta AI primeiro** (se API configurada) — envia nome + resumo + trecho para LLM
2. **Se falhar ou não tiver API** — usa o classificador regex atual como fallback
3. **Se confiança da AI < 0.6** — usa resultado do regex e marca para revisão

**Prompt de classificação:**
```
Sistema: Você é um classificador de documentos da ASCOM/Novacap.
Classifique o documento abaixo em um dos tipos:
- protocolo_crise, fluxo_trabalho, porta_voz, calendario_agenda,
  assunto_sensivel, relatorio_atuacao, clipping_monitoramento,
  material_campanha, normativa_diretriz, relacionamento,
  documento_administrativo, outro

Documento: {nome}
Conteúdo: {texto_resumido}

Responda APENAS com o JSON: {"docType": "...", "confidence": 0.xx, "section": "..."}
```

### 3.2 — Embeddings para Similaridade Semântica

Substituir TF-IDF (`nlpService.ts:64-89`) por embeddings via API:
```typescript
// Novo: semanticSearch.ts
async function getEmbedding(text: string): Promise<number[]> {
  // usa a API do OpenCode para gerar embedding do texto
}

function cosineSimilarity(a: number[], b: number[]): number {
  // similaridade entre embeddings
}
```

Isso permite:
- Busca semântica real (não só por keywords)
- Agrupamento inteligente por tema
- Detecção de documentos duplicados ou relacionados

---

## 4. Importação Inteligente de XLSX

### 4.1 — Detector de Schema (NOVO: `processors/xlsxAnalyzer.ts`)

O sistema analisa estrutura da planilha para determinar o tipo:

```typescript
interface XlsxSchema {
  type: 'calendario' | 'contatos' | 'orcamento' | 'relatorio' | 'indicadores' | 'cronograma' | 'desconhecido';
  columns: { header: string; type: 'text' | 'date' | 'number' | 'currency' }[];
  confidence: number;
  suggestedSection: string;
}
```

**Lógica:**
- Lê cabeçalhos (primeira linha)
- Usa IA para interpretar colunas
- Mapeia para schemas conhecidos
- Extrai linhas como objetos estruturados

### 4.2 — Mapeamento de Colunas com IA

Quando a IA detecta colunas como:
- `nome`, `contato`, `telefone`, `email` → schema `contatos`
- `data`, `evento`, `local`, `horário` → schema `calendario`
- `valor`, `rubrica`, `centro_custo` → schema `orcamento`

A IA sugere o mapeamento e o usuário confirma (ou o sistema faz auto-mapping com confiança > 0.8)

### 4.3 — Nova Tabela: `structured_data`

```sql
CREATE TABLE IF NOT EXISTS structured_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_file_id INTEGER NOT NULL,       -- FK para files.id
  schema_type TEXT NOT NULL,              -- 'contatos' | 'calendario' | 'orcamento' | ...
  data JSON NOT NULL,                     -- linha inteira como JSON estruturado
  theme TEXT,                             -- tema extraído ('crise', 'fluxo', etc.)
  confidence REAL DEFAULT 0,
  imported_at TEXT,
  FOREIGN KEY (source_file_id) REFERENCES files(id)
);

CREATE INDEX idx_sd_schema_type ON structured_data(schema_type);
CREATE INDEX idx_sd_theme ON structured_data(theme);
CREATE INDEX idx_sd_source_file ON structured_data(source_file_id);
```

### 4.4 — Exemplo de Funcionamento

Planilha `Contatos_Imprensa_2026.xlsx`:

| Nome | Veículo | Telefone | Email | Assunto |
|------|---------|----------|-------|---------|
| João Silva | Correio Braziliense | 9999-0001 | joao@cb.com.br | Obras |

**Resultado no banco:**
```json
{
  "source_file_id": 42,
  "schema_type": "contatos",
  "data": {
    "nome": "João Silva",
    "veiculo": "Correio Braziliense",
    "telefone": "9999-0001",
    "email": "joao@cb.com.br",
    "assunto": "Obras"
  },
  "theme": "relacionamento_imprensa"
}
```

E também alimenta a **tabela contacts** automaticamente.

---

## 5. Importação Inteligente de DOCX

### 5.1 — Extrator Estruturado (substituir `docxProcessor.ts`)

Além de extrair texto plano, o novo processador:

1. **Extrai estrutura do documento** (seções, cabeçalhos, parágrafos, listas, tabelas)
2. **Detecta tipo de documento** (protocolo, fluxo, normativa, etc.)
3. **Extrai metadados** (data de criação, autor, título)
4. **Extrai tabelas** como dados estruturados
5. **Chama IA para extração semântica** quando disponível

### 5.2 — Nova Tabela: `document_sections`

```sql
CREATE TABLE IF NOT EXISTS document_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  section_title TEXT,
  section_level INTEGER DEFAULT 1,
  content TEXT,
  has_table INTEGER DEFAULT 0,
  table_data TEXT,          -- JSON com dados da tabela
  extracted_entities TEXT,  -- JSON com entidades extraídas
  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### 5.3 — Extrator de Conteúdo Estruturado por Tipo

**Para protocolos de crise:**
```json
{
  "type": "protocolo_crise",
  "steps": [
    {"order": 1, "action": "Comunicar presidente", "responsible": "Assessor Chefe", "deadline": "imediato"},
    {"order": 2, "action": "Reunir equipe ASCOM", "responsible": "Todos", "deadline": "15 min"}
  ],
  "spokespersons": ["João Silva (Presidente)", "Maria Santos (ASCOM)"],
  "entities": ["Novacap", "ASCOM", "GDF"],
  "checklist": ["Presidente comunicado", "Nota oficial preparada", "Porta-voz designado"]
}
```

**Para fluxos de trabalho:**
```json
{
  "type": "fluxo_trabalho",
  "steps": [
    {"order": 1, "action": "Recebimento de demanda", "area": "Recepção", "system": "Sistema de Protocolo"},
    {"order": 2, "action": "Triagem", "area": "ASCOM", "criteria": "urgência e tema"}
  ],
  "decision_points": ["Se urgente → crise", "Se rotina → fluxo normal"],
  "responsible_areas": ["ASCOM", "Diretoria", "Presidência"]
}
```

### 5.4 — Pipeline de Processamento de DOCX

```
DOCX recebido
    │
    ▼
1. Extrair texto + estrutura (mammoth + xml)
    │
    ▼
2. Detectar tipo via IA (ou regex fallback)
    │
    ▼
3. Extrair seções do documento
    │
    ▼
4. Para cada seção com tabela → extrair como structured_data
    │
    ▼
5. Extrair entidades (pessoas, orgs, datas, valores)
    │
    ▼
6. Popular:
   ├── files (metadados do arquivo)
   ├── document_text (texto bruto)
   ├── document_summary (resumo + keywords)
   ├── document_sections (seções estruturadas)  ⬅ NOVO
   ├── structured_data (dados de tabelas)        ⬅ NOVO
   └── contacts (se detectar contatos)           ⬅ existente
```

---

## 6. Base de Conhecimento (Knowledge Graph)

### 6.1 — Nova Tabela: `knowledge_relations`

```sql
CREATE TABLE IF NOT EXISTS knowledge_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,        -- 'file' | 'structured_data' | 'contact' | 'section'
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL,      -- 'contem' | 'referencia' | 'responsavel' | 'relacionado'
  confidence REAL DEFAULT 1.0,
  metadata TEXT                     -- JSON extra
);

CREATE INDEX idx_kr_source ON knowledge_relations(source_type, source_id);
CREATE INDEX idx_kr_target ON knowledge_relations(target_type, target_id);
CREATE INDEX idx_kr_type ON knowledge_relations(relation_type);
```

### 6.2 — Exemplo de Relações

```
Documento "Protocolo_Crise_2026.pdf"
  ├── contem → Seção "Procedimentos"
  ├── contem → Tabela "Passos da Crise"
  ├── referencia → Contato "João Silva (Presidente)"
  ├── referencia → Documento "Lista_Contatos.xlsx"
  └── responsavel → "Maria Santos (ASCOM)"
```

---

## 7. Autonomia do Sistema

### 7.1 — Feedback Loop de Classificação

Quando o usuário **reclassifica** um documento manualmente (já existe botão "Reclassificar" no frontend), o sistema:

1. Salva a correção em uma nova tabela `classification_feedback`
2. Periodicamente, usa esses exemplos para refinar o prompt da IA
3. Se houver exemplos suficientes (>20 por tipo), gera um fine-tuning set

```sql
CREATE TABLE IF NOT EXISTS classification_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  original_type TEXT,
  corrected_type TEXT,
  corrected_by TEXT DEFAULT 'user',
  created_at TEXT,
  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### 7.2 — Detecção de Novos Tipos

O sistema analisa periodicamente documentos classificados como `outro`:
- Calcula similaridade entre eles
- Se formar clusters com >3 documentos, sugere novo tipo
- Envia notificação para o usuário: "Detectamos 5 documentos sobre 'Licitações' — criar novo tipo?"

### 7.3 — Re-análise Inteligente

Quando novos documentos são adicionados, o sistema:
1. Não re-analisa tudo — apenas os novos documentos
2. Recalcula similaridades apenas com os novos vs existentes (incremental)
3. Atualiza clusters incrementalmente

### 7.4 — Auto-Preenchimento de Cadastros

Quando um DOCX ou XLSX menciona pessoas com cargos, o sistema:
1. Verifica se já existe na tabela `contacts`
2. Se não existe, cria um novo contato com os dados disponíveis
3. Se existe, atualiza se houver informações novas
4. Marca para revisão se confiança < 0.8

---

## 8. Plano de Implementação

### Fase 1 — Base de IA ✅ Concluída

| Tarefa | Status | Arquivos | Descrição |
|--------|--------|----------|-----------|
| 1.1 | ✅ | `backend/src/analysis/aiClassifier.ts` | Classificador usando LLM via OpenCode API |
| 1.2 | ❌ | `backend/src/analysis/semanticSearch.ts` | Embeddings e busca semântica — **NÃO CRIADO** (similarity.ts faz cosseno sem embeddings) |
| 1.3 | ✅ | `backend/src/analysis/classifier.ts` | Modificado para modo híbrido (AI + regex) |
| 1.4 | ❌ | Testes | Validar classificação com exemplos reais — **NÃO EXISTEM** |

### Fase 2 — XLSX Inteligente ✅ Concluída

| Tarefa | Status | Arquivos | Descrição |
|--------|--------|----------|-----------|
| 2.1 | ✅ | `backend/src/processors/xlsxAnalyzer.ts` | Detector de schema de planilhas |
| 2.2 | ✅ | `backend/src/processors/xlsxIntelligentImporter.ts` | Importador de dados estruturados |
| 2.3 | ✅ | `db/structuredData.ts` | Nova tabela `structured_data` |
| 2.4 | ✅ | `backend/src/routes/structuredData.ts` | API para consultar dados estruturados |
| 2.5 | ✅ | `analyzer.ts` | Integrar importação no pipeline de análise |

### Fase 3 — DOCX Estruturado 🟡 Quase concluída

| Tarefa | Status | Arquivos | Descrição |
|--------|--------|----------|-----------|
| 3.1 | ✅ | `backend/src/processors/docxStructureExtractor.ts` | Extração de seções, tabelas, metadados |
| 3.2 | 🟡 | — | Extração de entidades com IA — **substituído por** `analysis/entityExtractor.ts` (regex) |
| 3.3 | ✅ | `db/sections.ts` | Nova tabela `document_sections` |
| 3.4 | ✅ | `backend/src/routes/documents.ts` | API para consultar seções (dentro de documents) |
| 3.5 | ✅ | `analyzer.ts` | Integrar extração estruturada no pipeline |

### Fase 4 — Knowledge Graph ✅ Concluída

| Tarefa | Status | Arquivos | Descrição |
|--------|--------|----------|-----------|
| 4.1 | ✅ | `db/knowledge.ts` | Nova tabela `knowledge_relations` |
| 4.2 | ✅ | `backend/src/analysis/knowledgeGraph.ts` | Gerador de relações automáticas |
| 4.3 | ✅ | `backend/src/routes/graph.ts` + `routes/knowledge.ts` | API expandida com knowledge graph |

### Fase 5 — Autonomia ❌ Pendente

| Tarefa | Status | Arquivos | Descrição |
|--------|--------|----------|-----------|
| 5.1 | ✅ | `database.ts` | Tabela `classification_feedback` existe |
| 5.2 | ❌ | `backend/src/analysis/autoClassifier.ts` | Aprendizado com feedback — **NÃO CRIADO** |
| 5.3 | ❌ | `backend/src/analysis/noveltyDetector.ts` | Detecção de novos tipos — **NÃO CRIADO** |
| 5.4 | 🟡 | — | Auto-preenchimento — **parcial** (contacts criados via docxStructureExtractor) |
| 5.5 | ❌ | Frontend | UI para sugestões — **NÃO CRIADA** |

### Fase 6 — Frontend 🟡 Quase concluída

| Tarefa | Status | Descrição |
|--------|--------|-----------|
| 6.1 | ✅ | Página "Dados Estruturados" — `StructuredData.tsx` |
| 6.2 | ✅ | Componente "Seções do Documento" — `DocumentStructure.tsx` |
| 6.3 | ✅ | "Grafo de Conhecimento" — `GraphView.tsx` |
| 6.4 | ❌ | "Sugestões Automáticas" — **NÃO CRIADO** |
| 6.5 | ✅ | Indicador de "Confiança da IA" nos cards de documento |

---

## 9. APIs — Novas Rotas

```typescript
// ✅ structured_data — IMPLEMENTADO
GET    /api/structured-data?schema_type=contatos&theme=crise   ✅
GET    /api/structured-data/:id                                 ✅
POST   /api/structured-data/import                              ✅ (via /api/import/preview)
DELETE /api/structured-data/:id                                 ✅

// ✅ document_sections — IMPLEMENTADO
GET    /api/documents/:id/sections                              ✅ (dentro de routes/documents.ts)

// ✅ knowledge_graph — IMPLEMENTADO
GET    /api/knowledge-graph?source_type=file&source_id=42       ✅
GET    /api/knowledge-graph/network                             ✅

// ❌ autonomy — NÃO IMPLEMENTADO
GET    /api/autonomy/suggestions                                ❌
POST   /api/autonomy/feedback                                   ❌
GET    /api/autonomy/novel-types                                ❌
POST   /api/autonomy/approve-type                               ❌

// ❌ AI-powered search — NÃO IMPLEMENTADO
POST   /api/ai/search                                           ❌
POST   /api/ai/classify                                         ❌
POST   /api/ai/analyze                                          ❌
```

---

## 10. Diagrama de Fluxo da Importação de XLSX

```
Usuário faz upload / Scanner encontra XLSX
                    │
                    ▼
         ┌─────────────────────┐
         │  Extrator de Texto  │  (atual, mantido)
         │  + Tabela JSON      │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  Detector de Schema │  NOVO: xlsxAnalyzer.ts
         │  (IA ou heurística) │
         └─────────┬───────────┘
                   │
          ┌────────┴────────┐
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ Schema       │   │ Schema       │
   │ Conhecido    │   │ Desconhecido │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │ Extrair como │   │ Pedir ajuda  │
   │ structured   │   │ ao usuário   │
   │ data + tema  │   │ (UI)         │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          └──────┬───────────┘
                 ▼
         ┌─────────────────┐
         │  Popular DB:    │
         │  • structured   │
         │  • contacts     │
         │  • knowledge    │
         └─────────────────┘
```

---

## 11. Diagrama de Fluxo da Importação de DOCX

```
DOCX encontrado no scan
           │
           ▼
   ┌──────────────────┐
   │ Extract raw text │  (mammoth, mantido)
   │ + tables + meta  │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Detect type via  │  AI Classifier
   │ IA (ou regex)    │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Extract sections │  NOVO: docxStructureExtractor
   │ (headers + body) │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Extract entities │  IA + regex (entityExtractor aprimorado)
   │ pessoas, orgs,   │
   │ datas, valores   │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Build knowledge  │  Relacionar com outros documentos
   │ relations        │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │ Popular em paralelo:         │
   │ • document_text              │
   │ • document_summary           │
   │ • document_sections (NOVO)   │
   │ • structured_data (se tabela)│
   │ • contacts (se pessoas)      │
   │ • knowledge_relations (NOVO) │
   └──────────────────────────────┘
```

---

## 12. Configuração e Variáveis de Ambiente

Novas entradas em `settings` (já existe tabela de settings no banco):

| Key | Default | Descrição |
|-----|---------|-----------|
| `ai_classifier_enabled` | `true` | Usar IA para classificação (se disponível) |
| `ai_classifier_min_confidence` | `0.6` | Confiança mínima para aceitar classificação da IA |
| `ai_embedding_model` | `opencode/deepseek-v4-flash-free` | Modelo para embeddings |
| `auto_import_contacts` | `true` | Importar automaticamente contatos de DOCX/XLSX |
| `auto_discover_types` | `true` | Detectar automaticamente novos tipos documentais |
| `feedback_learning_enabled` | `true` | Aprender com feedback do usuário |

---

## 13. Benefícios Esperados

| Métrica | Hoje | Com IA |
|---------|------|--------|
| Precisão da classificação | ~60% (regex puro) | ~85%+ (IA + feedback) |
| Dados extraídos de XLSX | Texto bruto | JSON estruturado por schema |
| Dados extraídos de DOCX | Texto bruto | Seções + entidades + tabelas |
| Busca | Keyword matching | Semântica + vetorial |
| Autonomia | 0% (tudo manual) | 70% das classificações automáticas |
| Cadastro de contatos | Manual | Automático via documentos |
| Descoberta de novos tipos | Nunca | Detecta e sugere |

---

## 14. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| API de IA indisponível | Fallback automático para regex |
| Custo de API | Usar modelos gratuitos (OpenCode free models) |
| Precisão baixa em documentos muito específicos | Feedback loop + confiança mínima configurável |
| Performance comprometida | Processamento em lote, análise incremental |
| Dados duplicados na importação | Verificação por hash + similaridade antes de inserir |

---

## 15. Exemplo de Uso — Cenário Completo

### Cenário: Upload de planilha de contatos

1. Usuário faz upload de `Contatos_Imprensa_2026.xlsx`
2. Scanner detecta e insere em `files`
3. Analyzer processa:
   - Extrai texto (mantido)
   - **NOVO:** XLSX Analyzer detecta schema `contatos` (colunas: Nome, Veículo, Telefone, Email)
   - Extrai 47 linhas como `structured_data` com theme `relacionamento_imprensa`
   - Para cada linha, verifica se contato já existe em `contacts`
   - 12 contatos novos → insere em `contacts`
   - 5 contatos existentes → atualiza se houver novos dados
4. Knowledge Graph cria relações:
   - Arquivo → cada contato importado
   - Contatos → tema "relacionamento_imprensa"
5. Sistema notifica: "47 contatos importados da planilha Contatos_Imprensa_2026.xlsx"

### Cenário: DOCX de protocolo de crise

1. Scanner detecta `Protocolo_Crise_Obras_2026.docx`
2. Analyzer processa:
   - Extrai texto (mantido)
   - **NOVO:** AI Classifier → `protocolo_crise` com 92% confiança
   - **NOVO:** DOCX Structure Extractor → 5 seções, 2 tabelas
   - **NOVO:** Extrai steps do protocolo como JSON estruturado
   - **NOVO:** Detecta 3 pessoas mencionadas → verifica/atualiza `contacts`
   - **NOVO:** Cria checklist automático com 8 itens
3. Knowledge Graph:
   - Documento → cada seção
   - Documento → cada contato (como responsável)
   - Documento → theme "crise_obras"
   - Documento → similar com "Protocolo_Crise_Imprensa.pdf" (82% similaridade)

---

## 16. Início Imediato — O Que Fazer Primeiro

### Status Atual

| Prioridade | Item | Status |
|---|---|---|
| 🔴 1 | `aiClassifier.ts` | ✅ Concluído |
| 🔴 2 | `xlsxAnalyzer.ts` | ✅ Concluído |
| 🔴 3 | Tabela `structured_data` | ✅ Concluído |
| 🔴 4 | `analyzer.ts` integrado | ✅ Concluído |
| 🔵 5 | `docxStructureExtractor.ts` | ✅ Concluído |
| 🔵 6 | Tabela `document_sections` | ✅ Concluído |
| 🔵 7 | `knowledgeGraph.ts` | ✅ Concluído |
| 🔵 8 | Tabela `knowledge_relations` | ✅ Concluído |
| 🟢 9 | Feedback loop | 🟡 Parcial (tabela existe, UI não) |
| 🟢 10 | Auto-discovery | ❌ Pendente |
| 🟢 11 | Frontend dados/grafo | ✅ Concluído (StructuredData, GraphView) |
