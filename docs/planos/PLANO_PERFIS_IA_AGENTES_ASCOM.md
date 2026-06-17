# Plano de Perfis de IA por Camada de Agentes ASCOM

## 1. Visão geral

Este plano propõe a evolução da configuração de IA do sistema **Plano de Comunicação — NOVACAP / ASCOM** para suportar **múltiplos perfis de IA**, vinculados às três camadas de agentes já existentes:

```txt
1. Agentes Interativos
2. Agentes de Fila
3. Site Agents
```

A ideia é permitir que o usuário configure até **3 chaves de API diferentes**, cada uma associada a uma etapa/camada de agentes, permitindo paralelismo, isolamento de custo, isolamento de limite e maior estabilidade operacional.

---

## 2. Situação atual

Hoje o sistema usa uma configuração global de IA:

```txt
ai_provider
ai_api_key
ai_base_url
ai_model
ai_potency
```

Essa configuração atende todos os usos de IA, incluindo:

- chat consultivo;
- agentes interativos;
- classificação documental;
- importação inteligente;
- schema inference;
- simulador;
- geração de conteúdo;
- eventuais rotinas de agentes.

O problema é que, com a evolução do sistema para múltiplas camadas de agentes, uma única chave e um único modelo deixam de ser ideais.

---

## 3. Objetivo

Criar uma arquitetura de **perfis de IA por escopo**, onde cada camada de agentes possa usar seu próprio provedor, chave, modelo, temperatura e configuração de execução.

Objetivos principais:

- permitir 3 chaves de API independentes;
- vincular cada chave a uma camada de agentes;
- manter compatibilidade com a configuração global atual;
- evitar que a fila consuma limite do chat;
- permitir modelos diferentes para cada finalidade;
- melhorar custo, performance e estabilidade;
- permitir execução paralela controlada;
- melhorar segurança na exibição das chaves.

---

## 4. Perfis propostos

## 4.1 Perfil 1 — Agentes Interativos

### Escopo técnico

```txt
interactive_agents
```

### Usado por

```txt
backend/src/agents/
backend/src/services/consultService.ts
```

### Exemplos de uso

- chat consultivo;
- agente documental;
- agente de crise;
- agente de conteúdo;
- agente de planejamento;
- agente de risco;
- apoio a porta-voz;
- respostas sob demanda do usuário.

### Recomendação

Esse perfil deve usar o melhor modelo disponível, pois responde diretamente ao usuário e apoia decisões.

```txt
Temperatura: 0.4 a 0.7
Timeout: 25s
Modelo: maior qualidade
Prioridade: alta
Concorrência sugerida: 3
```

---

## 4.2 Perfil 2 — Agentes de Fila

### Escopo técnico

```txt
queue_agents
```

### Usado por

```txt
backend/src/queueAgents/
backend/src/analysis/aiClassifier.ts
backend/src/processors/xlsxAnalyzer.ts
backend/src/analysis/schemaInferrer.ts
backend/src/services/simulatorAi.ts
```

### Exemplos de uso

- classificação documental;
- análise de documentos em lote;
- estruturação de planilhas;
- inferência de schema;
- geração automática de cenários;
- geração de talking points automáticos;
- avaliação de risco avançado;
- processamento em segundo plano.

### Recomendação

Esse perfil deve ser rápido, barato e robusto. Ele deve priorizar respostas estruturadas e confiáveis, não criatividade.

```txt
Temperatura: 0.1 a 0.3
Timeout: 15s a 25s
Modelo: rápido/barato
Prioridade: média
Concorrência sugerida: 2
```

---

## 4.3 Perfil 3 — Site Agents

### Escopo técnico

```txt
site_agents
```

### Usado por

```txt
backend/src/siteAgents/
```

### Exemplos de uso

- snapshots inteligentes do painel;
- resumo executivo da base;
- alertas interpretados;
- recomendações por página;
- cobertura do plano;
- sugestões para rascunhos;
- síntese da saúde da base;
- leitura contextual do grafo.

### Recomendação

Esse perfil deve ser bom em síntese, resumo e recomendações. Pode usar um modelo intermediário.

```txt
Temperatura: 0.2 a 0.5
Timeout: 20s
Modelo: bom em resumo/síntese
Prioridade: baixa/média
Concorrência sugerida: 1
```

---

## 5. Dois provedores atuais

A interface deve manter os dois provedores já existentes:

```txt
OpenCode
OpenAI Compatível
```

Cada perfil poderá escolher independentemente um desses provedores.

Exemplo:

```txt
Agentes Interativos
Provider: OpenAI Compatível
Model: gpt-4.1-mini
API Key: chave 1

Agentes de Fila
Provider: OpenCode
Model: opencode/deepseek-v4-flash-free
API Key: chave 2

Site Agents
Provider: OpenCode
Model: opencode/deepseek-v4-flash-free
API Key: chave 3
```

---

## 6. Modelo de configuração

Criar chaves de configuração por perfil:

```txt
ai_interactive_provider
ai_interactive_api_key
ai_interactive_base_url
ai_interactive_model
ai_interactive_potency
ai_interactive_enabled
ai_interactive_max_concurrency

ai_queue_provider
ai_queue_api_key
ai_queue_base_url
ai_queue_model
ai_queue_potency
ai_queue_enabled
ai_queue_max_concurrency

ai_site_provider
ai_site_api_key
ai_site_base_url
ai_site_model
ai_site_potency
ai_site_enabled
ai_site_max_concurrency
```

Manter as chaves antigas como fallback:

```txt
ai_provider
ai_api_key
ai_base_url
ai_model
ai_potency
```

---

## 7. Resolvedor central de IA

Criar arquivo:

```txt
backend/src/services/aiProfile.ts
```

Responsabilidades:

- ler configuração do perfil;
- descriptografar chave correta;
- aplicar fallback para configuração global;
- normalizar base URL;
- normalizar model ID;
- aplicar temperatura/potência;
- validar se o perfil está ativo;
- expor chamada de LLM por escopo.

Tipos sugeridos:

```ts
export type AIPipelineScope =
  | 'interactive_agents'
  | 'queue_agents'
  | 'site_agents'
  | 'default';

export interface AIProfile {
  scope: AIPipelineScope;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  potency: number;
  enabled: boolean;
  maxConcurrency: number;
}
```

Funções sugeridas:

```ts
getAIProfile(scope: AIPipelineScope): AIProfile
callScopedLLM(scope: AIPipelineScope, messages, options): Promise<string | null>
testAIProfile(profile): Promise<{ success: boolean; reply?: string; error?: string }>
```

---

## 8. Fallback inteligente

A resolução de perfil deve seguir esta ordem:

```txt
1. Perfil específico da camada
2. Perfil global antigo
3. Fallback local/regras/regex
```

Exemplo:

```txt
Site Agents sem chave própria
  ↓
usa configuração global antiga
  ↓
se falhar, gera snapshot por SQL e regras locais
```

Esse fallback é importante para evitar quebrar o sistema durante a migração.

---

## 9. Segurança das chaves

A API de settings não deve retornar as chaves descriptografadas para o frontend.

Novo comportamento recomendado:

```txt
GET /api/settings/ai-profiles
retorna apenas:
- provider
- base_url
- model
- potency
- enabled
- max_concurrency
- hasApiKey
- apiKeyMasked
```

O frontend deve mostrar:

```txt
Chave cadastrada: sk-****abcd
[Inserir nova chave]
```

No POST, a chave só deve ser alterada se o campo vier preenchido.

Isso evita reenviar chaves sensíveis a cada abertura da tela de Settings.

---

## 10. API proposta

Manter a rota antiga para compatibilidade:

```txt
GET /api/settings
POST /api/settings
POST /api/settings/test-model
```

Adicionar novas rotas:

```txt
GET /api/settings/ai-profiles
POST /api/settings/ai-profiles
POST /api/settings/ai-profiles/test
```

### GET `/api/settings/ai-profiles`

Exemplo de resposta:

```json
{
  "profiles": {
    "interactive_agents": {
      "label": "Agentes Interativos",
      "provider": "openai",
      "hasApiKey": true,
      "apiKeyMasked": "sk-****1234",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4.1-mini",
      "potency": 0.5,
      "enabled": true,
      "maxConcurrency": 3
    },
    "queue_agents": {
      "label": "Agentes de Fila",
      "provider": "opencode",
      "hasApiKey": true,
      "apiKeyMasked": "op-****7890",
      "baseUrl": "https://opencode.ai/zen/v1",
      "model": "opencode/deepseek-v4-flash-free",
      "potency": 0.2,
      "enabled": true,
      "maxConcurrency": 2
    },
    "site_agents": {
      "label": "Site Agents",
      "provider": "opencode",
      "hasApiKey": true,
      "apiKeyMasked": "op-****4567",
      "baseUrl": "https://opencode.ai/zen/v1",
      "model": "opencode/deepseek-v4-flash-free",
      "potency": 0.3,
      "enabled": true,
      "maxConcurrency": 1
    }
  }
}
```

### POST `/api/settings/ai-profiles`

Permite salvar os três perfis.

Exemplo conceitual:

```json
{
  "profiles": {
    "interactive_agents": {
      "provider": "openai",
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4.1-mini",
      "potency": 0.5,
      "enabled": true,
      "maxConcurrency": 3
    }
  }
}
```

### POST `/api/settings/ai-profiles/test`

Permite testar um perfil específico.

```json
{
  "scope": "interactive_agents"
}
```

Ou testar configuração ainda não salva:

```json
{
  "scope": "queue_agents",
  "profile": {
    "provider": "opencode",
    "apiKey": "...",
    "baseUrl": "https://opencode.ai/zen/v1",
    "model": "opencode/deepseek-v4-flash-free",
    "potency": 0.2
  }
}
```

---

## 11. Paralelismo real

Com três chaves, cada camada pode trabalhar isoladamente:

```txt
interactive_agents → chamadas sob demanda do usuário
queue_agents       → chamadas controladas pela fila
site_agents        → worker periódico e site_sync
```

Assim o sistema pode:

```txt
responder uma pergunta no chat
enquanto classifica documentos na fila
enquanto atualiza snapshots do painel
```

Cada camada deve ter controle de concorrência:

```txt
interactive_agents: 3
queue_agents: 2
site_agents: 1
```

O controle pode ser implementado com uma fila simples em memória por perfil ou com limite no `callScopedLLM`.

---

## 12. Migração de chamadas de IA

## 12.1 Agentes interativos

Atualizar:

```txt
backend/src/agents/llmClient.ts
backend/src/services/consultService.ts
```

Novo escopo:

```txt
interactive_agents
```

---

## 12.2 Agentes de fila

Atualizar:

```txt
backend/src/analysis/aiClassifier.ts
backend/src/processors/xlsxAnalyzer.ts
backend/src/analysis/schemaInferrer.ts
backend/src/services/simulatorAi.ts
```

Novo escopo:

```txt
queue_agents
```

Observação:

O simulador pode usar `queue_agents` quando executado automaticamente pela fila e `interactive_agents` quando for usado sob demanda por um usuário. Em uma primeira versão, pode começar em `queue_agents`.

---

## 12.3 Site Agents

Atualizar ou preparar:

```txt
backend/src/siteAgents/
```

Novo escopo:

```txt
site_agents
```

Mesmo que os primeiros Site Agents usem SQL/regras locais, o `callScopedLLM('site_agents')` deve estar disponível para futuros resumos executivos mais inteligentes.

---

## 13. Frontend Settings

Atualizar:

```txt
frontend/src/pages/Settings.tsx
frontend/src/api.ts
```

A tela deve exibir três cards:

```txt
[Card] Agentes Interativos
[Card] Agentes de Fila
[Card] Site Agents
```

Cada card deve conter:

```txt
Provider
API Key
Base URL
Model
Potency
Enabled
Max Concurrency
Botão Testar Perfil
```

Também é útil incluir ações rápidas:

```txt
Copiar configuração global
Usar mesma chave do perfil acima
Limpar chave deste perfil
```

---

## 14. Observabilidade

Nos logs de chamadas LLM, registrar:

```txt
scope
provider
model
latencyMs
success/error
status HTTP
fallbackUsed
```

Isso ajuda a descobrir:

- qual camada está consumindo mais;
- qual chave está falhando;
- qual modelo está lento;
- onde houve fallback;
- se a fila está consumindo limites indevidamente.

---

## 15. Etapas de implementação

## Fase 1 — Backend seguro

Criar:

```txt
backend/src/services/aiProfile.ts
```

Com:

```txt
getAIProfile
callScopedLLM
testAIProfile
maskApiKey
```

---

## Fase 2 — Settings API

Atualizar:

```txt
backend/src/routes/settings.ts
```

Adicionar:

```txt
GET /api/settings/ai-profiles
POST /api/settings/ai-profiles
POST /api/settings/ai-profiles/test
```

Manter rotas antigas.

---

## Fase 3 — Migração das chamadas

Migrar gradualmente:

```txt
agents/llmClient.ts → interactive_agents
consultService.ts → interactive_agents
aiClassifier.ts → queue_agents
xlsxAnalyzer.ts → queue_agents
schemaInferrer.ts → queue_agents
simulatorAi.ts → queue_agents
siteAgents/* → site_agents quando usarem LLM
```

---

## Fase 4 — Frontend

Atualizar:

```txt
frontend/src/api.ts
frontend/src/pages/Settings.tsx
```

Criar card reutilizável:

```txt
AIProfileCard
```

---

## Fase 5 — Concorrência e logs

Adicionar controle de concorrência por perfil:

```txt
maxConcurrency
```

Adicionar logs com escopo.

---

## 16. Estratégia de compatibilidade

Durante a migração:

- manter `ai_provider`, `ai_api_key`, `ai_base_url`, `ai_model` e `ai_potency`;
- usar essas chaves como fallback;
- não quebrar módulos existentes;
- migrar arquivo por arquivo;
- manter fallback por regex/regras locais.

Isso permite evoluir sem interromper o sistema.

---

## 17. Resultado esperado

Após a implementação, a arquitetura de IA ficará assim:

```txt
Settings
  ↓
AI Profiles
  ├── interactive_agents
  ├── queue_agents
  └── site_agents
      ↓
AI Profile Resolver
      ↓
callScopedLLM(scope)
      ↓
Agentes usam IA com escopo correto
```

Benefícios:

- 3 chaves API independentes;
- menor risco de limite compartilhado;
- custo mais controlado;
- chat não é afetado pela fila;
- fila não é afetada pelo painel;
- modelos diferentes por finalidade;
- melhor organização técnica;
- maior segurança na tela de configurações;
- base preparada para paralelismo real.

---

## 18. Conclusão

A configuração de IA deve evoluir de um modelo global para uma arquitetura de **perfis por camada de agentes**.

A solução recomendada é criar um resolvedor central (`aiProfile.ts`) e conectar cada camada ao seu perfil:

```txt
Agentes Interativos → interactive_agents
Agentes de Fila     → queue_agents
Site Agents         → site_agents
```

Com isso, o sistema poderá usar três chaves de API em paralelo, preservando estabilidade, controle de custo e qualidade das respostas por tipo de tarefa.
