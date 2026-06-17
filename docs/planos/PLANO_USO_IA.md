# Plano de Uso de IA no Sistema

> **Status:** Junho 2026
> **Objetivo:** Mapear uso atual da IA, corrigir gargalos e planejar evolução

---

## 1. Onde a IA É Usada Hoje

```
┌──────────────────────────────────────────────────────────────────┐
│                      USO ATUAL DE IA                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🧠 CLASSIFICADOR DE DOCUMENTOS                                  │
│  ────────────────────────────────────────────────                 │
│  Arquivo:  backend/src/analysis/aiClassifier.ts                  │
│  Chamado:  queueWorker.ts (na etapa "analyze")                   │
│  Provider: OpenCode Free API (ou OpenAI-compatível)              │
│  Modelo:   deepseek-v4-flash-free (padrão)                       │
│                                                                   │
│  Fluxo:                                                           │
│  1. Para cada documento sem classificação:                        │
│     a. Tenta LLM → { docType, confidence, section }             │
│     b. Se LLM falha ou confidence < 0.6 → fallback regex         │
│     c. Salva classificação híbrida em `files` tabela             │
│                                                                   │
│  Acionamento: Automático (queue) ou manual (reclassify-all)      │
│  Fallback:   classifier.ts (regex com 12 tipos documentais)       │
│  Cache:      Nenhum (cada documento é classificado 1x)           │
│                                                                   │
│  💬 CHAT DE CONSULTA                                              │
│  ────────────────────────────────────────────────                 │
│  Arquivo:  backend/src/routes/consult.ts                          │
│  Chamado:  POST /api/consult                                      │
│                                                                   │
│  Fluxo:                                                           │
│  1. Recebe pergunta do usuário                                    │
│  2. Detecta intenção (regex, 8 intents)                           │
│  3. Busca documentos relevantes (TF-IDF via LIKE)                │
│  4. Se encontrou documentos:                                      │
│     a. Tenta LLM com contexto dos documentos                     │
│     b. LLM gera resposta baseada nos documentos                  │
│     c. Se LLM falha → fallback para template local               │
│  5. Retorna resposta + documentos de referência                  │
│                                                                   │
│  🔧 CLASSIFICAÇÃO HÍBRIDA (aiClassifier.ts)                       │
│  ────────────────────────────────────────────────                 │
│  Sempre que confidence < 0.6, usa resultado do regex como        │
│  fallback com confidence ajustada (0.8 do valor original)        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Problemas Corrigidos

| Problema | Antes | Depois |
|----------|-------|--------|
| API key obrigatória | Exigia key mesmo para provedores gratuitos | Aceita requisição sem `Authorization` |
| Fallback silencioso | Quando IA falhava, caía em `local_ml_fallback` sem aviso | Ainda cai, mas com log mais claro |
| Model name stripping | Regex aplicado mas inconsistente entre módulos | Unificado em `consult.ts`, `aiClassifier.ts`, `settings.ts` |
| Erro confuso no test-model | Dizia "API key não configurada" e impedia teste | Permite testar sem key (free providers) |

## 3. Onde a IA PODE Ser Usada (Oportunidades)

### 3.1 Alta Prioridade 🔴

| Funcionalidade | Impacto | Complexidade |
|---|---|---|
| **Busca Semântica** (`semanticSearch.ts`) | Permite encontrar docs por significado, não só keyword | Média |
| **Resposta do Chat com fonte** | Mostrar qual documento gerou cada parte da resposta | Baixa |
| **Reclassificação automática** | Aprender com feedback do usuário (`classification_feedback`) | Média |

### 3.2 Média Prioridade 🔵

| Funcionalidade | Impacto | Complexidade |
|---|---|---|
| **Auto-classificador** (`autoClassifier.ts`) | Aprender padrões de reclassificação manual | Alta |
| **Detector de Novos Tipos** (`noveltyDetector.ts`) | Sugerir novos tipos documentais não mapeados | Alta |
| **Sumário Inteligente** | Resumir documentos grandes com IA (vs TF-IDF atual) | Baixa |
| **Extração de Entidades com IA** | Complementar regex do `entityExtractor.ts` com NER via LLM | Média |

### 3.3 Baixa Prioridade 🟢

| Funcionalidade | Impacto | Complexidade |
|---|---|---|
| **Auto-import de Contatos** (`autoContactImporter.ts`) | Extrair contatos automaticamente de DOCX/PDF | Média |
| **Sugestões de Classificação** (UI) | Painel para aprovar/recusar sugestões da IA | Média |
| **Análise de Sentimento em Clipping** | Classificar tom de matérias (positivo/neutro/negativo) | Alta |
| **Geração Automática de Release** | Preencher template de release com dados de documentos | Média |

---

## 4. Plano de Evolução da IA

### Fase 1 — Estabilização (agora) ✅

| Tarefa | Status |
|--------|--------|
| Remover exigência de API key para provedores gratuitos | ✅ Corrigido |
| Unificar stripping de model name entre módulos | ✅ Corrigido |
| Logging mais claro de falhas de IA | ✅ Corrigido |

### Fase 2 — Busca Semântica (próximo)

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUSCA SEMÂNTICA                          │
│                                                                   │
│  Fluxo proposto:                                                  │
│                                                                   │
│  user: "protocolo de crise com imprensa"                          │
│         │                                                         │
│         ▼                                                         │
│  1. Gerar embedding da pergunta (LLM API)                         │
│  2. Buscar similaridade cosseno com embeddings dos docs           │
│  3. Combinar com resultados TF-IDF (busca híbrida)                │
│  4. Retornar top 10 ranqueados por relevância                     │
│                                                                   │
│  Arquivos:                                                        │
│  - backend/src/analysis/semanticSearch.ts (CRIAR)                │
│  - backend/src/routes/consult.ts (MODIFICAR)                     │
│  - backend/src/database.ts (ADICIONAR coluna embedding)          │
│                                                                   │
│  Estimativa: 2-3 dias                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 3 — Aprendizado com Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO-CLASSIFICADOR                             │
│                                                                   │
│  Fluxo proposto:                                                  │
│                                                                   │
│  1. Usuário reclassifica documento manualmente                    │
│  2. Sistema salva em classification_feedback                      │
│     { file_id, original_type, corrected_type, text_sample }       │
│  3. autoClassifier.ts analisa padrões:                            │
│     - Se 5+ correções iguais para mesma regex pattern → ajusta   │
│     - Se 10+ correções para tipo novo → sugere novo docType      │
│  4. Sistema notifica admin via painel de sugestões               │
│                                                                   │
│  Arquivos:                                                        │
│  - backend/src/analysis/autoClassifier.ts (CRIAR)                │
│  - backend/src/analysis/noveltyDetector.ts (CRIAR)              │
│  - frontend/src/pages/ClassificationFeedback.tsx (CRIAR)        │
│                                                                   │
│  Estimativa: 3-5 dias                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 4 — Chat Aprimorado

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT COM RAG (Retrieval Augmented)             │
│                                                                   │
│  Melhorias no POST /api/consult:                                  │
│                                                                   │
│  □ Busca semântica + TF-IDF híbrido                              │
│  □ Citar fonte exata com destaque no documento                   │
│  □ Perguntas de acompanhamento ("O que mais...?")                │
│  □ Histórico da conversa (últimas 5 trocas)                      │
│  □ Detecção de intenção por IA (em vez de regex)                 │
│  □ Fallback explicativo ("Não encontrei, tente...")              │
│                                                                   │
│  Estimativa: 4-6 dias                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 5 — Autonomia Total

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUGESTÕES AUTOMÁTICAS                          │
│                                                                   │
│  Frontend: painel em Settings > Sugestões da IA                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🤖 Sugestões da IA (3 pendentes)                             │ │
│  │                                                               │ │
│  │ 📄 Orcamento_2026.xlsx                                       │ │
│  │   IA detectou: "orcamento" (74% confiança)                    │ │
│  │   Anterior: "não classificado"                                │ │
│  │   [✓ Aceitar] [✕ Ignorar]                                     │ │
│  │                                                               │ │
│  │ 📄 Relatorio_Mensal_Marco.docx                                │ │
│  │   IA sugere NOVO tipo: "relatorio_mensal"                     │ │
│  │   Padrão detectado em 3 documentos similares                  │ │
│  │   [✓ Aceitar como novo tipo] [✕ Ignorar]                     │ │
│  │                                                               │ │
│  │ 📄 Contatos_Imprensa.xlsx                                     │ │
│  │   IA detectou 12 contatos novos para cadastro                │ │
│  │   [✓ Importar contatos] [✕ Ignorar]                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Arquivos:                                                        │
│  - backend/src/routes/autonomy.ts (CRIAR)                        │
│  - frontend/src/components/AISuggestions.tsx (CRIAR)            │
│  - backend/src/analysis/noveltyDetector.ts (CRIAR)              │
│                                                                   │
│  Estimativa: 5-7 dias                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Arquitetura da IA (Diagrama)

```
┌────────────────────────────────────────────────────────────────────────┐
│                           LLM PROVIDER                                 │
│                                                                         │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐    │
│  │ OpenCode Free (default)    │  │ OpenAI / Outros (configurável)  │    │
│  │ Sem API key necessária     │  │ Requer API key                  │    │
│  │ Modelos gratuitos          │  │ Modelo configurável via UI      │    │
│  └────────────────────────────┘  └────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                         │
│                                                                         │
│  ┌──────────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ aiClassifier.ts      │  │ consult.ts   │  │ settings.ts          │  │
│  │ Classificação doc    │  │ Chat RAG      │  │ Teste de conexão    │  │
│  └──────────┬───────────┘  └──────┬───────┘  └──────────────────────┘  │
│             │                     │                                     │
│             ▼                     ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    FALLBACK LOCAL (NLP)                          │  │
│  │                                                                   │  │
│  │  classifier.ts (regex)         entityExtractor.ts (regex)         │  │
│  │  nlpService.ts (TF-IDF)        similarity.ts (cosseno)           │  │
│  │  buildResponse (templates)                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                     │
│                                                                         │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ ConsultChat.tsx    │  │ Settings.tsx     │  │ (futuro)         │   │
│  │ Interface de chat  │  │ Config. de IA    │  │ AISuggestions.tsx │   │
│  │ + doc preview      │  │ Testar modelo    │  │ Painel sugestões │   │
│  └────────────────────┘  └──────────────────┘  └──────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Configuração de IA (Interface)

```
┌──────────────────────────────────────────────────────────────────┐
│  CONFIGURAÇÕES DA IA - Settings.tsx                               │
│                                                                   │
│  Provedor: [OpenCode ▼]                                          │
│  API Key:  [··························] 👁️                       │
│            (vazio = usa provedor gratuito)                        │
│  Base URL: https://opencode.ai/zen/v1                             │
│  Modelo:   [deepseek-v4-flash-free ▼]                            │
│  Potência: [━━━━━━●━━━━━━━━━] 0.7 (Balanceado)                   │
│                                                                   │
│  [🔌 Testar Conexão]  ✅ Modelo respondeu: "OK"                  │
│                                                                   │
│  [Salvar Configurações]                                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Métricas de IA para Monitorar

| Métrica | Onde | Valor Atual |
|---------|------|-------------|
| Precisão da classificação | `files.doc_type_confidence` | ~60-85% (híbrido) |
| Taxa de uso da IA vs fallback | Logs | Desconhecido (sem métrica) |
| Tempo médio de resposta do chat | Logs | ~2-5s (com IA) |
| Taxa de aceitação de sugestões | Futuro | N/A |
| Modelos disponíveis | modelCache | 5 gratuitos |
