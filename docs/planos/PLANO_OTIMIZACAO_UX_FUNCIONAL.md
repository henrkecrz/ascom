# Plano de Otimização (UX & Funcionalidades de Valor)

O objetivo desta etapa é elevar não apenas a estética (UI), mas principalmente a **funcionalidade** das páginas essenciais do sistema. Como a regra é manter as alterações focadas no frontend (sem alterar o backend), utilizaremos recursos do navegador (como `localStorage` e APIs de Blob) para criar ferramentas táticas que economizam tempo do usuário.

## Proposed Changes

### 1. Centro de Comando (OperationalDashboard)
- **[Estética]** Barra de busca destacada (foco magnético) e Efeito de "Glow" e Elevação (`hover`) nos Cards de Módulos.
- **[Valor Funcional] Histórico de Buscas Recentes:** Usar `localStorage` para salvar os últimos 5 termos pesquisados. Quando o usuário clicar na barra de busca (vazia), mostrar chips clicáveis com as pesquisas recentes para acesso ultrarrápido.

### 2. Detalhes do Documento (DocumentDetail)
- **[Estética]** Abas (Tabs) no formato "Segmented Control" e animação nas Tags de Entidades.
- **[Valor Funcional] Botão "Baixar Ficha Resumo":** Adicionar um botão no cabeçalho que compila os metadados do documento (Nome, Categoria, Resumo da IA, Entidades, Tópicos) e faz o download de um arquivo `.txt` formatado (Ficha Executiva). Útil para anexar em e-mails ou enviar por WhatsApp.
- **[Valor Funcional] Copiar Texto Rápido:** Na aba "Conteúdo Extraído", adicionar um botão flutuante de "Copiar para a Área de Transferência" para facilitar a extração de trechos brutos.

### 3. Saúde do Plano (PlanHealth)
- **[Estética]** Efeito de neon (drop-shadow dinâmico) no gráfico circular de Score Geral.
- **[Valor Funcional] Exportar Plano de Ação (Gaps):** Se houver Gaps detectados (alertas vermelhos ou amarelos), adicionar um botão "Exportar Pendências (.txt)", que gera uma lista de tarefas pronta para ser compartilhada com a equipe, focando na resolução dos problemas.

### 4. Sistema Global (AppLayout & Tema)
- **[Estética]** Adição de classes utilitárias de elevação (`.card-hover-lift`) e melhoria no glassmorphism do header. Menu lateral com destaque fluido.
- **[Valor Funcional] Atalho Global Focado:** O atalho `Ctrl+K` hoje joga o usuário na tela `/search`. Vamos garantir que o foco vá instantaneamente para o input principal da página para que o usuário possa apenas digitar e dar Enter.
