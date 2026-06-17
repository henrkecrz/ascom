# Plano de Correção e Otimização das Páginas (Grafo, Timeline, Relatórios, Plano)

Identifiquei a causa dos erros reportados. Todos os componentes dependem de propriedades que, em certas condições (quando a API retorna dados incompletos, nulos ou inesperados), causam quebras na renderização do React (o famoso "Cannot read properties of undefined"). 

Abaixo detalho as falhas encontradas em cada página e como iremos corrigi-las para tornar a interface totalmente à prova de falhas (bulletproof).

## Falhas Identificadas e Ações

### 1. `GraphView.tsx` (Grafo)
**Problema:** A função `getCategoryColor(category)` causa uma quebra na aplicação (`TypeError: Cannot read properties of undefined (reading 'toLowerCase')`) se algum nó não possuir categoria (for nulo ou indefinido). Além disso, há o risco de a API retornar objetos vazios onde `.nodes` ou `.edges` não existem, quebrando os loops de processamento físico.
**Ação:**
- Adicionar validação defensiva `const cat = (category || '').toLowerCase()`.
- Garantir fallback para arrays de nós e vértices (`data.nodes || []`).

### 2. `Timeline.tsx` (Linha do Tempo)
**Problema:** O componente confere se `data.timeline` existe, mas *não confere* se `data.years` existe. Se a API omitir a propriedade `years` (algo comum em erros ou banco vazio), a linha 71 (`data.years.map`) resulta em tela branca/crash. Outro problema é o `doc.extension`, que pode ser nulo em alguns casos do banco de dados, falhando verificações de strings.
**Ação:**
- Atualizar a verificação inicial para `if (!data || !data.timeline || !data.years) return <ErrorView />`.
- Proteger a leitura de extensões de arquivos e nomes.

### 3. `ExecutiveReports.tsx` (Relatórios)
**Problema:** As buscas (barra de pesquisa) tentam rodar `.toLowerCase()` no nome do cluster (`r.clusterName`), que pode vir nulo. Além disso, se `topKeywords`, `themeWords` ou `documents` vierem indefinidos do backend, funções de array (`.some`, `.map`) vão quebrar instantaneamente. Existe um erro crônico em `doc.keywords.slice(0, 4)` se a propriedade vir como null.
**Ação:**
- Sanitizar o input das strings com optional chaining (`r.clusterName?.toLowerCase() || ''`).
- Usar fallback Arrays: `(report.themeWords || []).map(...)`, `(report.topKeywords || []).some(...)`.
- Garantir que `doc.keywords` seja forçado a array caso retorne nulo.

### 4. `PlanView.tsx` (Plano Otimizado)
**Problema:** A função de ordenação `[...data.clusters].sort((a, b) => b.documents.length - a.documents.length)` pressupõe que `cluster.documents` sempre existe e é um array. Se o banco de dados retornar um cluster vazio, o `.length` dispara exceção fatal. E na hora de renderizar os ícones, `doc.extension?.startsWith()` pode quebrar se for null.
**Ação:**
- Trocar para `(b.documents || []).length - (a.documents || []).length`.
- Garantir os mapeamentos seguros: `(cluster.documents || []).map(...)`.

## Verificação
As páginas serão testadas e validadas com TypeScript.
