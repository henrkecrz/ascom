# Plano de Otimização das Ferramentas de IA

Foi solicitada a otimização global das ferramentas de IA do sistema. Desenvolvi um pacote de melhorias focadas na **produtividade, gamificação e retenção de memória** para os usuários da Assessoria de Imprensa.

## Escopo

### 1. Consulta Inteligente (ConsultChat & MessageBubble)
Otimizar o fluxo de extração de conhecimento:
- **MessageBubble.tsx**: Adicionar botão de **Copiar para Área de Transferência** discreto ao lado das respostas do Assistente.
- **ConsultChat.tsx**: Adicionar botão "Baixar Histórico (.txt)" que formata e exporta toda a sessão de chat para arquivamento.

### 2. Simulador de Crises (CrisisSimulator)
Aprimorar o valor educacional e competitivo do War Game:
- **Recorde Pessoal (Local Storage):** Salvar o "High Score" do usuário. Na tela final, exibir badge "🏆 NOVO RECORDE!" se superar.
- **Resumo Operacional (Debriefing):** Na tela de resultados, listar as escolhas por cenário ("✅ Correto" vs "🔴 Feedback") para revisão.

### 3. Gerador de Press Release (PressReleaseGenerator)
Otimizar a usabilidade final do artefato gerado:
- **Botão Baixar Nota Oficial (.txt):** Exportação direta do arquivo pronto para envio a jornalistas.
- **Métricas de Leitura:** Contagem de palavras e estimativa de "Tempo de Leitura" (ex: "⏱️ Leitura: 1 min, 200 palavras").

## Verification Plan
1. Iniciar o frontend (`npm run dev`).
2. Abrir o `ConsultChat` -> Fazer uma pergunta -> Clicar no ícone de "Copiar" da resposta da IA.
3. Abrir o `PressReleaseGenerator` -> Gerar minuta teste -> Validar contagem de palavras e baixar o arquivo TXT.
4. Abrir o `CrisisSimulator` -> Jogar uma vez para cravar Recorde -> Jogar novamente para testar o Debriefing.
