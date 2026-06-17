# Transformar a Página de Crise em uma Ferramenta Operacional

Atualmente, o `CrisisPanel.tsx` atua mais como um painel de visualização (dashboard estático) do que como uma ferramenta interativa. O usuário vê listas de protocolos, porta-vozes e um checklist, além de um botão "Modo Crise" que apenas altera o estilo visual (cores).

Para tornar isso uma **ferramenta de trabalho real e acionável** para a ASCOM durante uma crise, vamos reestruturar a página para suportar um fluxo de "Gestão de Crise Ativa".

## Proposed Changes

### 1. Novo Fluxo de "Declaração de Crise"
Em vez de um botão genérico que muda cores, o botão **"Ativar Modo Crise"** abrirá um seletor onde o operador informará:
- Qual o tipo de crise / protocolo afetado (ex: Vazamento de Dados, Acidente).
- Essa ação colocará o painel em **Modo Operacional Ativo**.

### 2. Painel Operacional Ativo (O que acontece quando a crise está ativa)
Quando uma crise estiver ativa, a interface se transformará para focar exclusivamente na resolução do problema selecionado:
- **Cabeçalho de Incidente:** Exibirá o protocolo ativo em destaque e um cronômetro contando o tempo desde o início do incidente.
- **Porta-vozes Recomendados:** Filtrará e mostrará apenas os porta-vozes relevantes ou principais.
- **Gerador Rápido de Nota Oficial (Press Release):** Vamos embutir uma versão compacta do `PressReleaseGenerator` diretamente no painel de crise, já pré-preenchido com o protocolo selecionado, permitindo gerar a primeira resposta à imprensa em segundos sem sair da tela.
- **Checklist Tático de Crise:** O checklist existente ganhará mais destaque, guiando o passo a passo da resposta.

### 3. Painel de Prontidão (Estado Normal - Sem Crise)
Quando não houver crise ativa, a página atuará como um "Centro de Prontidão":
- Exibirá o **Score de Prontidão** (atual).
- Listará todos os protocolos e porta-vozes (atual).
- Fornecerá atalhos rápidos para editar protocolos ou treinar no **Simulador de Crises**.

## Arquivos Afetados

### [MODIFY] `frontend/src/pages/CrisisPanel.tsx`
- Adição do estado de "Crise Ativa" (salvo no `localStorage` para não perder contexto ao mudar de aba).
- Refatoração do layout para ter duas visualizações: `ReadinessView` (estado normal) e `ActiveIncidentView` (durante crise).
- Importação da lógica de geração de notas oficiais (`api.generator.pressRelease`) para permitir a criação rápida de notas dentro do próprio painel.

### [NEW] `frontend/src/components/CrisisActiveWorkspace.tsx`
- Componente que englobará a visão da crise ativa, contendo o cronômetro, o formulário de nota oficial rápida e o checklist em destaque.
