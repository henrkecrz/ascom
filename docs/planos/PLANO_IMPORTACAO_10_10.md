# Plano 10/10 — Importação Universal estilo Power BI

> **Versão:** 2.0
> **Objetivo:** Transformar a importação em um motor universal que lê e cadastra dados estruturados de **qualquer tipo de arquivo**, como o Power BI faz — PDFs com tabelas, JSON hierárquico, XML, HTML, planilhas multi-sheet, CSV brasileiro, DOCX com tabelas, PPTX com dados, e imagens com OCR tabular.
> **Última atualização:** Junho 2026

---

## Diagnóstico: O que falta para ser Power BI?

### O que o Power BI faz que o sistema NÃO faz hoje

| Capacidade Power BI | Estado Atual | Gap |
|---|---|---|
| **Extrai tabelas de PDF** | ❌ Só extrai texto corrido (pdf-parse) | Precisa detectar estrutura tabular no texto do PDF |
| **Importa JSON** | ❌ Lê como texto puro (fs.readFileSync) | Precisa flatten de JSON hierárquico → tabela |
| **Importa XML** | ❌ Lê como texto puro | Precisa parser XML → tabela |
| **Importa HTML (tabelas)** | ❌ Lê como texto puro | Precisa extrair `<table>` de HTML |
| **Multi-sheet XLSX** | ⚠️ smartImporter lê só a 1ª sheet | xlsxIntelligentImporter lê todas, mas são pipelines separados |
| **Tabelas de DOCX** | ⚠️ Extrai mas só salva em structured_data | Precisa criar tabelas dinâmicas também |
| **Tabelas de PPTX** | ❌ Só extrai texto de slides | Precisa extrair tabelas dos slides |
| **CSV brasileiro (`;` latin1)** | ❌ Parsing simplista, split por `,` | Precisa RFC 4180 + auto-encoding |
| **Preview de dados** | ⚠️ Funciona para XLSX/CSV | Precisa funcionar para todos os formatos |
| **Schema editável** | ❌ Bug: edições são ignoradas na importação | Bug crítico |
| **Deduplicação** | ❌ Reimportar duplica dados | Precisa limpeza por source_file_id |
| **Histórico/Undo** | ❌ Não existe | Precisa import_history com rollback |
| **Detecção de ODS** | ❌ LibreOffice Calc não suportado | xlsx pode ler ODS com flag |

### O que já funciona bem ✅

- Inferência de schema por IA com fallback heurístico
- Classificação em 9 categorias de dados
- Criação dinâmica de tabelas SQLite
- Detecção de FK por nome + overlap de valores
- Auto-import de contatos de planilhas
- Preview com seleção de arquivos no frontend
- Pipeline de fila com 7 estágios e retry

---

## Proposed Changes

Organizadas em **7 fases**.

---

### Fase 1 — Correção de 3 Bugs Críticos

---

#### [MODIFY] [ImportManager.tsx](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/frontend/src/components/ImportManager.tsx)

**Bug 1: Schema overrides ignorados.**
O `handleImport` não envia `schemaOverrides` ao backend. Edições de nome/tipo de coluna são silenciosamente descartadas.

```diff
- const result = await api.importApi.confirm(preview.sourceId, selectedIndices)
+ const result = await api.importApi.confirm(preview.sourceId, selectedIndices, schemaOverrides)
```

---

#### [MODIFY] [import.ts (route)](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/routes/import.ts) + [importService.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/services/importService.ts)

Receber e propagar `schemaOverrides` até o `importFile`.

---

#### [MODIFY] [smartImporter.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/smartImporter.ts)

**Bug 2: CSV parsing simplista** — `split(',')` não trata aspas, vírgulas internas, nem encoding.

**Bug 3: Apenas primeira sheet** — `workbook.SheetNames[0]` ignora as demais abas do XLSX.

---

### Fase 2 — Motor Universal de Extração Tabular 🚀

A mudança principal. Criar um extrator que transforma **qualquer arquivo** em dados tabulares.

---

#### [NEW] [tableExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/tableExtractor.ts)

Ponto de entrada universal. Dado um arquivo, retorna todas as tabelas encontradas:

```typescript
interface ExtractedTable {
  sheetName: string;         // nome da aba/seção/tabela
  headers: string[];
  rows: string[][];
  sourceFormat: string;      // 'xlsx', 'csv', 'pdf_table', 'json', 'xml', etc.
  confidence: number;        // quão confiável é a extração
  metadata?: {
    pageNumber?: number;     // para PDFs
    jsonPath?: string;       // para JSON hierárquico
    xmlPath?: string;        // para XML
    sectionTitle?: string;   // para DOCX/PPTX
  };
}

async function extractTables(filePath: string, extension: string): Promise<ExtractedTable[]>
```

Delega para sub-extractors por tipo:

| Formato | Extractor | Como funciona |
|---|---|---|
| `.xlsx` `.xls` `.ods` | `xlsxTableExtractor` | Lê TODAS as sheets via `xlsx`, incluindo ODS |
| `.csv` `.tsv` `.txt` | `csvTableExtractor` | Novo parser RFC 4180 com auto-encoding/delimitador |
| `.pdf` | `pdfTableExtractor` | Detecta estrutura tabular no texto extraído |
| `.json` | `jsonTableExtractor` | Flatten de JSON hierárquico e arrays de objetos |
| `.xml` | `xmlTableExtractor` | Parser XML → tabelas por nós repetidos |
| `.html` `.htm` | `htmlTableExtractor` | Extrai `<table>` elements |
| `.docx` | `docxTableExtractor` | Reaproveita `extractTablesFromDocxXml` existente |
| `.pptx` | `pptxTableExtractor` | Extrai tabelas do XML dos slides |
| `.jpg` `.png` (imagem) | `ocrTableExtractor` | OCR via tesseract + detecção de grid tabular |

---

#### [NEW] [pdfTableExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/pdfTableExtractor.ts)

Extrai tabelas de PDFs analisando a estrutura do texto:

1. **Detectar colunas por alinhamento**: texto extraído do PDF mantém espaçamento — detectar colunas por posição de whitespace consistente entre linhas
2. **Detectar header**: primeira linha com padrão diferente (bold, caps, separador)
3. **Detectar separadores**: linhas de `---`, `===`, ou espaços largos entre blocos
4. **Fallback IA**: se heurística falha (confidence < 0.5), enviar amostra do texto ao LLM pedindo para identificar tabelas e retornar como JSON
5. **Suporte ao serviço Python** (`pdfplumber`): se o serviço Python estiver ativo em `:8000`, delegar a extração tabular a ele (pdfplumber é superior para tabelas)

---

#### [NEW] [jsonTableExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/jsonTableExtractor.ts)

Importa JSON como tabela, estilo Power BI:

1. **Array de objetos** (caso mais comum):
   ```json
   [{"nome": "João", "cargo": "Assessor"}, {"nome": "Maria", "cargo": "Chefe"}]
   ```
   → Direto: keys = headers, values = rows

2. **Objeto com array aninhado**:
   ```json
   {"departamento": "ASCOM", "funcionarios": [{"nome": "João"}, {"nome": "Maria"}]}
   ```
   → Flatten: encontrar o maior array e achatá-lo, prefixando campos pai

3. **JSON hierárquico profundo**:
   → Flatten recursivo com `dot.notation`: `{"a": {"b": {"c": 1}}}` → `{"a.b.c": 1}`

4. **Auto-detecção de encoding** e validação JSON (JSON5 para JSONs com trailing commas)

---

#### [NEW] [xmlTableExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/xmlTableExtractor.ts)

Importa XML como tabela:

1. **Detectar nós repetidos**: encontrar o elemento XML com mais filhos repetidos (= as "linhas")
2. **Extrair atributos + texto**: cada nó-filho vira uma linha, atributos + sub-elementos viram colunas
3. **Flatten hierárquico**: similar ao JSON flatten para XMLs complexos
4. **Dependência**: `fast-xml-parser` (leve, sem deps nativas)

---

#### [NEW] [htmlTableExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/htmlTableExtractor.ts)

Extrai tabelas `<table>` de HTML:

1. Usar `htmlparser2` (já é dependência transitiva do ecossistema Node) para parsear
2. Extrair `<thead>` → headers, `<tbody>` → rows
3. Suportar tabelas sem `<thead>` (primeira `<tr>` = header)
4. Múltiplas tabelas por arquivo → múltiplas sheets
5. Tratar `colspan`/`rowspan` básicos
6. Limpar tags HTML internas das células

---

#### [MODIFY] [pptxProcessor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/pptxProcessor.ts)

Adicionar extração de tabelas PPTX além de texto. Tabelas em PPTX ficam em `<a:tbl>` no XML do slide.

---

#### [MODIFY] [textExtractor.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/textExtractor.ts)

Registrar os novos formatos como "importáveis" em `isExtractable()`.

---

#### [MODIFY] [smartImporter.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/smartImporter.ts)

Substituir `readFileAsRows` pelo novo `tableExtractor.extractTables()`.
Expandir `collectImportableFiles` para incluir TODOS os formatos.

---

### Fase 3 — Parser CSV/TSV Profissional

---

#### [NEW] [csvParser.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/csvParser.ts)

Parser completo:

- **RFC 4180**: aspas, delimitadores internos, aspas escapadas (`""`)
- **Auto-detecção de delimitador**: `,` `;` `\t` `|` — conta ocorrências nas primeiras 5 linhas
- **Auto-detecção de encoding**: UTF-8, UTF-8 BOM, ISO-8859-1 (latin1), Windows-1252 — detecta por BOM e bytes inválidos
- **Auto-detecção de header**: compara tipos da primeira linha vs demais
- **Preview mode**: ler apenas N primeiras linhas sem carregar arquivo inteiro
- **Tratamento de edge cases**: linhas vazias, trailing delimiters, espaços em volta de campos

---

### Fase 4 — Unificação dos Pipelines Duplicados

---

#### [NEW] [unifiedImporter.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/unifiedImporter.ts)

Substitui a duplicação entre `smartImporter` e `xlsxIntelligentImporter`. Pipeline único:

```
Arquivo → tableExtractor.extractTables()
       → schemaInferrer.inferSchema()     (por sheet/tabela)
       → dynamicTableGenerator.ensureTable()
       → dynamicTableGenerator.insertData()
       → insertStructuredData()            (normalizado em structured_data)
       → autoImportContacts()              (se tipo = contatos)
       → relationshipFinder.findAllRelationships()
       → insertKnowledgeRelation()
       → insertImportHistory()
```

---

#### [MODIFY] [queueWorker.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/queueWorker.ts)

O estágio `structure` chama o `unifiedImporter` em vez dos dois pipelines separados.
O novo `unifiedStructureImport` processa QUALQUER formato.

---

#### [MODIFY] [scanner.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/scanner.ts)

Remover o auto-import duplicado (linhas 291-324). A importação é 100% via fila.

---

### Fase 5 — Deduplicação + Histórico com Undo

---

#### [MODIFY] [dynamicTableGenerator.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/dynamicTableGenerator.ts)

Deduplicação antes de inserir limpando dados anteriores do mesmo `source_file_id`.

---

#### [MODIFY] [xlsxIntelligentImporter.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/processors/xlsxIntelligentImporter.ts)

Deduplicação na tabela `structured_data`.

---

#### [NEW] [importHistory.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/db/importHistory.ts)

Tabela `import_history` e funções para registro, listagem e desfazimento (`undoImport`).

---

### Fase 6 — Inteligência de Schema Avançada

---

#### [MODIFY] [schemaInferrer.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/schemaInferrer.ts)

1. **Novos tipos brasileiros** detectados por regex (CPF, CNPJ, CEP, PHONE_BR, EMAIL, URL).
2. **Expandir categorias** de 9 para 14 (licitacao, legislacao, patrimonio, rh, comunicado).
3. **Prompt de IA melhorado** com contexto ASCOM/GDF e exemplos.
4. **Confidence ajustada por volume**.

---

#### [NEW] [schemaCache.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/schemaCache.ts)

Cache in-memory de schemas já inferidos por hash dos nomes de colunas.

---

#### [MODIFY] [relationshipFinder.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/analysis/relationshipFinder.ts)

1. **Scan completo**: incluir TODAS as tabelas do sistema no scan.
2. **Strategy 4**: similaridade semântica entre nomes de colunas.
3. **Persistir relações** na tabela `knowledge_relations`.

---

### Fase 7 — UX Premium no Frontend

---

#### [MODIFY] [ImportManager.tsx](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/frontend/src/components/ImportManager.tsx)

Redesign completo: wizard em etapas, badges de formato, seletor de sheets, validação em tempo real, barra de progresso, histórico de importações com undo, mini-diagrama de relações.

---

#### [MODIFY] [api.ts](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/frontend/src/api.ts)

Novos endpoints para import history e undo.

---

#### [MODIFY] [import.ts (route)](file:///g:/@GIT%20REPOSITORIES/PLANO%20DE%20COMUNICA%C3%87AO/backend/src/routes/import.ts)

Novos endpoints para o backend.

---

## Resumo: Antes vs Depois

| Capacidade | Antes | Depois |
|---|---|---|
| Formatos importáveis | XLSX, CSV (básico) | **XLSX, XLS, ODS, CSV, TSV, JSON, XML, HTML, PDF (tabelas), DOCX (tabelas), PPTX (tabelas), imagens (OCR tabular)** |
| Sheets por arquivo | 1 (smartImporter) | **Todas, com seletor** |
| CSV parsing | Split por vírgula | **RFC 4180, auto-encoding (UTF-8/latin1), auto-delimitador (,;|\t)** |
| Pipelines de import | 2 duplicados | **1 unificado** |
| Deduplicação | Nenhuma | **Por source_file_id + hash** |
| Schema overrides | Bug (ignorados) | **Funcionais, aplicados na importação** |
| Tipos de coluna | 5 | **11 (+ CPF, CNPJ, CEP, PHONE_BR, EMAIL, URL)** |
| Categorias de dados | 9 | **14** |
| Histórico | Não existe | **import_history com undo** |
| Cache de schema | Não existe | **Por hash de colunas** |
| Relações detectadas | FK + nome + overlap | **+ semântica** |
| UX de importação | Lista simples | **Wizard em 5 etapas** |

---

## Dependências Novas

```bash
cd backend && npm install fast-xml-parser htmlparser2
```

## Verification Plan

### Testes Automatizados

```bash
cd backend && npm test
```

### Verificação Manual

1. Importar um PDF do GDF com tabela de contatos → verificar extração tabular
2. Importar um JSON de API pública → verificar flatten e importação
3. Importar um CSV com encoding latin1 e `;` → verificar detecção automática
4. Importar XLSX com 4 sheets → verificar seletor de sheets no frontend
5. Editar schema no preview e confirmar → verificar que é aplicado
6. Reimportar o mesmo arquivo → verificar deduplicação (sem dados duplicados)
7. Reverter importação pelo histórico → verificar que dados são removidos
8. Importar HTML de página web com tabela → verificar extração
