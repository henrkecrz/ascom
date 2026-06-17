# Plano de Melhorias — Sistema Plano de Comunicação (Novacap ASCOM)

## Contexto: O que é o Plano de Comunicação

O **Plano de Comunicação** é um documento técnico da ASCOM que funciona como guia operacional da assessoria. Ele define:

- **Fluxos de trabalho**: como a ASCOM recepciona demandas
- **Relacionamento com públicos**: imprensa, funcionários, parceiros
- **Assuntos sensíveis**: temas que requerem cuidado especial
- **Porta-vozes**: quem fala pela companhia e em que situações
- **Protocolos de crise**: critérios de atuação pré-validados com o presidente
- **Calendário de eventos**: o que a ASCOM prevê ao longo do ano
- **Padrões de atuação**: orientações para jornalistas e RPs da equipe

> **IMPORTANTE:** É atualizado com frequência e **no final do ano vira relatório de atuação**. Sem ele é difícil criar padrões, principalmente em **gerenciamento de crises**, porque é preciso ter critérios pré-validados com o presidente. Apenas jornalistas e RPs o elaboram — é um documento técnico e generalista (não prevê cronogramas diários de postagens).

---

## O Problema Atual

O sistema hoje é um **indexador de arquivos** genérico. Ele escaneia uma pasta de rede, extrai texto e gera estatísticas — mas **não entende o que é o Plano de Comunicação**, não ajuda a consultá-lo operacionalmente, e não apoia decisões de crise.

---

# 🎨 GUIA DE UI/UX

## Filosofia de Design

O sistema deve ter a sensação de um **Centro de Comando da Comunicação** — não um explorador de arquivos.

**3 princípios fundamentais:**

| Princípio | Significado | Na prática |
|---|---|---|
| **Velocidade de acesso** | Em uma crise, cada segundo conta | Máximo 2 cliques para qualquer protocolo |
| **Clareza sob pressão** | Jornalistas usam sob estresse | Tipografia grande, hierarquia visual forte, zero ambiguidade |
| **Inteligência passiva** | O sistema trabalha para o usuário | Alertas automáticos, classificação inteligente, sugestões contextuais |

---

## Design System

### Paleta de Cores

```
BACKGROUNDS
─────────────────────────────────────────
bg-primary:     #0a0a14    (fundo principal — quase preto azulado)
bg-surface:     #12121f    (cards e superfícies)
bg-elevated:    #1a1a2e    (cards elevados, modais)
bg-hover:       #222240    (hover em cards)
border-subtle:  #2a2a45    (bordas sutis)

TEXTO
─────────────────────────────────────────
text-primary:   #f0f0f5    (texto principal — branco suave)
text-secondary: #8888a0    (texto secundário)
text-muted:     #555570    (texto desabilitado)

CORES DE SEÇÃO (cada seção do plano tem uma cor)
─────────────────────────────────────────
crises:         #ef4444    (vermelho)     → Protocolos de Crise
fluxos:         #3b82f6    (azul)         → Fluxos de Trabalho
portavozes:     #8b5cf6    (roxo)         → Porta-vozes
calendario:     #10b981    (verde)        → Calendário de Eventos
sensiveis:      #f59e0b    (âmbar)        → Assuntos Sensíveis
relatorios:     #06b6d4    (ciano)        → Relatórios
normativos:     #ec4899    (rosa)         → Normativas/Diretrizes
campanhas:      #f97316    (laranja)      → Material de Campanha

STATUS
─────────────────────────────────────────
success:        #22c55e    (atualizado, ok)
warning:        #eab308    (precisa atenção)
danger:         #ef4444    (crítico, desatualizado)
info:           #3b82f6    (informativo)

ACCENT
─────────────────────────────────────────
accent:         #7c4dff    (destaque principal — roxo vibrante)
accent-glow:    #7c4dff33  (glow com transparência)
```

### Tipografia

```
FONTE PRINCIPAL:  Inter (Google Fonts)
FONTE FALLBACK:   -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
FONTE MONO:       'JetBrains Mono', 'Fira Code', monospace

ESCALA
─────────────────────────────────────────
hero:           2.5rem / 700   (títulos de página)
h1:             1.75rem / 700  (títulos de seção)
h2:             1.25rem / 600  (subtítulos)
h3:             1rem / 600     (títulos de card)
body:           0.9rem / 400   (texto padrão)
caption:        0.8rem / 400   (metadata, labels)
badge:          0.7rem / 600   (tags, badges)

MODO CRISE (fontes ampliadas)
─────────────────────────────────────────
hero:           3.5rem / 800
h1:             2.25rem / 700
body:           1.1rem / 400
```

### Espaçamento e Grid

```
ESPAÇAMENTO (base 4px)
─────────────────────────────────────────
xs:     4px     (espaço mínimo)
sm:     8px     (entre elementos internos)
md:     16px    (padding de cards)
lg:     24px    (gap entre cards)
xl:     32px    (gap entre seções)
2xl:    48px    (margem lateral da página)

BORDER RADIUS
─────────────────────────────────────────
sm:     6px     (botões pequenos, badges)
md:     12px    (cards, inputs)
lg:     16px    (modais, cards grandes)
full:   999px   (pills, avatares)

SOMBRAS
─────────────────────────────────────────
card:       0 4px 24px rgba(0, 0, 0, 0.3)
elevated:   0 8px 32px rgba(0, 0, 0, 0.4)
glow:       0 0 20px rgba(124, 77, 255, 0.15)
```

### Componentes Base

```
CARD PADRÃO
─────────────────────────────────────────
background:     bg-surface + rgba(255,255,255,0.02)
border:         1px solid border-subtle
border-radius:  12px
padding:        20px
transition:     all 0.2s ease
hover:          border-color → accent, transform → translateY(-2px)

BADGE DE SEÇÃO
─────────────────────────────────────────
background:     cor-da-seção com 15% opacidade
color:          cor-da-seção
padding:        4px 10px
border-radius:  999px
font-size:      0.7rem
font-weight:    600
text-transform: uppercase
letter-spacing: 0.5px

INPUT / BUSCA
─────────────────────────────────────────
background:     bg-elevated
border:         1px solid border-subtle
border-radius:  12px
padding:        14px 20px
color:          text-primary
font-size:      0.95rem
focus:          border-color → accent, box-shadow → glow

BOTÃO PRIMÁRIO
─────────────────────────────────────────
background:     linear-gradient(135deg, accent, #5e35b1)
color:          white
padding:        12px 24px
border-radius:  10px
font-weight:    600
hover:          transform → translateY(-1px), brightness → 1.1
active:         transform → translateY(0)
```

---

## Arquitetura de Navegação

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  ASCOM   🏠 Painel  💬 Consultar  🚨 Crises  📋 Saúde       │
│  NOVACAP                                                       │
│          📊 Relatórios  🔍 Busca  🕸️ Grafo     [🔍 busca...] │
├────┬────────────────────────────────────────────────────────────┤
│    │                                                            │
│ N  │                                                            │
│ A  │              CONTEÚDO DA PÁGINA                            │
│ V  │                                                            │
│    │           (area principal - scroll)                        │
│ L  │                                                            │
│ A  │                                                            │
│ T  │                                                            │
│ E  │                                                            │
│ R  │                                                            │
│ A  │                                                            │
│ L  │                                                            │
│    │                                                            │
├────┴────────────────────────────────────────────────────────────┤
│  status bar: "147 docs • 12 seções • Última indexação: 12/06"  │
└─────────────────────────────────────────────────────────────────┘
```

### Navegação em Detalhe

**Header fixo (60px altura):**
- Logo "ASCOM NOVACAP" à esquerda (gradiente accent)
- Tabs de navegação centralizadas com indicador ativo (underline animada)
- Busca global rápida à direita (Ctrl+K para abrir)
- Badge de notificação se houver alertas

**Sidebar lateral (colapsável, 64px colapsada / 240px expandida):**
- Ícones com tooltip quando colapsada
- Seções do plano como links rápidos quando expandida
- Indicador de seção ativa com barra lateral colorida
- Botão de toggle no topo

**Barra de status (32px, fixa no bottom):**
- Total de documentos indexados
- Última indexação
- Status do servidor (online/offline)

### Mapa de Navegação

```
🏠 Painel Operacional (home)
├── Clicar seção → 📄 Lista de docs daquela seção
├── Clicar documento → 📋 Detalhe do Documento
└── Clicar alerta → 📄 Documento com problema

💬 Consultar
├── Digitar pergunta → Resposta com documentos referenciados
├── Clicar documento na resposta → 📋 Detalhe do Documento
└── Botões rápidos → Pré-filtra por seção

🚨 Crises
├── Modo normal → Lista de protocolos
│   └── Clicar protocolo → 📋 Detalhe do Documento
└── Modo crise → Protocolo + Porta-vozes + Checklist

📋 Saúde do Plano
├── Cobertura por seção → Expandir seção
├── Gaps detectados → Clicar → Ação recomendada
└── Timeline → Expandir mês

🔍 Busca
├── Resultados → Clicar → 📋 Detalhe do Documento
└── Filtros laterais → Refinar resultados

📊 Relatórios
├── Relatórios por cluster
└── Gerar Relatório Anual → Preview → Exportar PDF
```

---

## Telas Detalhadas

### 1. Painel Operacional (Home)

![Mockup do Painel Operacional](docs/mockups/01_painel_operacional.png)

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🔍  Buscar no plano...                              ⌘K   │
│   ──────────────────────────────────────────────────────    │
│                                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐ │
│   │ 🚨      │ │ 📋      │ │ 🎤      │ │ 📅      │ │ 📰  │ │
│   │ CRISES  │ │ FLUXOS  │ │ PORTA-  │ │ CALEN-  │ │ AS-  │ │
│   │         │ │         │ │ VOZES   │ │ DÁRIO   │ │ SUN- │ │
│   │  5 docs │ │ 12 docs │ │  3 docs │ │  8 docs │ │ TOS  │ │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────┘ │
│                                                             │
│   STATUS DO PLANO                                           │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 78%                                │
│   147 Documentos • 12 Seções • Atualizado: 15/05/2026      │
│                                                             │
│   ┌─────────────────────────────┬───────────────────────┐   │
│   │ ⚠️ ATENÇÃO NECESSÁRIA      │ 📄 RECENTES           │   │
│   │                             │                       │   │
│   │ • Proto. crise: 6+ meses   │ Proto_Crise.pdf       │   │
│   │ • Porta-voz obras: vazio   │ Calendario_2026.xlsx   │   │
│   │ • Calendário 2º sem: vazio │ Fluxo_Demandas.docx   │   │
│   └─────────────────────────────┴───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Interações:**
- **Cards de seção**: hover → borda glow na cor da seção, scale(1.02). Clicar → lista documentos daquela seção
- **Busca**: foco → expande suavemente, mostra sugestões. Enter → navega para busca completa
- **Barra de progresso**: animação de preenchimento ao carregar (0% → 78%)
- **Alertas**: aparecem com fadeIn escalonado (1° após 300ms, 2° após 500ms, etc.)
- **Docs recentes**: hover → mostra preview do resumo em tooltip com glass effect

---

### 2. Chat de Consulta

![Mockup do Chat de Consulta](docs/mockups/02_chat_consulta.png)

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────┐
│  💬 Consultar o Plano                                       │
│                                                             │
│  [Protocolos] [Porta-vozes] [Calendário] [Fluxos] [Todos]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │      "Qual o protocolo em caso de crise             │    │
│  │       com a imprensa?"              🧑 12:45       │    │
│  │                                                     │    │
│  │  🤖 ────────────────────────────────────            │    │
│  │  Encontrei 2 documentos sobre protocolos            │    │
│  │  de crise com imprensa:                             │    │
│  │                                                     │    │
│  │  O protocolo principal define que em caso           │    │
│  │  de crise, o primeiro passo é comunicar             │    │
│  │  o presidente e a diretoria da ASCOM...             │    │
│  │                                                     │    │
│  │  ┌──────────────────────┐ ┌──────────────────┐      │    │
│  │  │ 📄 Proto_Crise.pdf  │ │ 📄 Manual_Crise  │      │    │
│  │  │ ████ Protocolo Crise │ │ ████ Normativa   │      │    │
│  │  │ 85% relevância       │ │ 72% relevância   │      │    │
│  │  └──────────────────────┘ └──────────────────┘      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────┐ [Enviar│
│  │ Faça uma pergunta sobre o plano...              │  ↗️ ]  │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  Sugestões: "porta-vozes" • "calendário agosto" • "fluxo"   │
└─────────────────────────────────────────────────────────────┘
```

**Interações:**
- **Mensagem do usuário**: aparece deslizando da direita (slideInRight, 200ms)
- **Resposta do sistema**: 
  1. Indicador "pensando..." com 3 dots pulsantes (500ms delay real para processar)
  2. Texto aparece com efeito de "digitação" (typewriter, 20ms por caractere)
  3. Cards de documentos deslizam de baixo (slideInUp, escalonado)
- **Botões rápidos**: hover → fundo preenche com a cor da seção. Clicar → envia pergunta predefinida
- **Input**: auto-resize, sugestões aparecem acima com fadeIn
- **Cards de documento na resposta**: hover → eleva com sombra. Clicar → navega para detalhe

---

### 3. Painel de Crise

![Mockup do Painel de Crise](docs/mockups/03_painel_crise.png)

**MODO NORMAL:**

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 Painel de Crises              [ ⚡ Ativar Modo Crise ] │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ▎ Crise com Imprensa                     ✅ Atual. │    │
│  │ ▎ Protocolo para gerenciamento de crises            │    │
│  │ ▎ envolvendo veículos de imprensa                   │    │
│  │ ▎ Última atualização: 15/03/2026                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ▎ Crise em Obras                         ⚠️ Rever │    │
│  │ ▎ Procedimentos para incidentes                     │    │
│  │ ▎ em canteiros de obra                              │    │
│  │ ▎ Última atualização: 10/01/2026                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ▎ Crise Ambiental                        ✅ Atual. │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**MODO CRISE ATIVA** (ativado pelo toggle):

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ CRISE ATIVA                      [ Desativar 🔴 PULSE] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│   PROTOCOLO: CRISE COM IMPRENSA                             │
│                                                             │
│   1. Comunicar imediatamente o presidente                   │
│   2. Reunir equipe da ASCOM                                 │
│   3. Avaliar extensão e impacto                             │
│   4. Preparar nota oficial                                  │
│   5. Designar porta-voz                                     │
│                                                             │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                             │
│   🎤 PORTA-VOZES                                            │
│   ┌─────────────────────────────────┐                       │
│   │  João Silva — Presidente        │                       │
│   │  Maria Santos — Assessora Chefe │                       │
│   └─────────────────────────────────┘                       │
│                                                             │
│   ☑ CHECKLIST                                               │
│   [✓] Presidente comunicado                                 │
│   [✓] Equipe reunida                                        │
│   [ ] Nota oficial preparada                                │
│   [ ] Porta-voz designado                                   │
│   [ ] Redes sociais monitoradas                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Transição Normal → Crise:**
- Background escurece levemente
- Borda superior pulsa em vermelho (animação pulse)
- Conteúdo anterior faz fadeOut (200ms), novo conteúdo faz fadeIn (300ms)
- Fontes escalam suavemente para tamanho maior (transition: font-size 0.3s)
- Botão "Ativar" vira "Desativar" com pulsação vermelha

**Checklist interativo:**
- Itens do checklist são extraídos automaticamente do conteúdo do protocolo
- Clicar marca/desmarca com animação de check (✓ aparece com scale bounce)
- Estado do checklist é salvo na sessão (localStorage)
- Progresso visível: "3 de 5 ações completas"

---

### 4. Detalhe do Documento

![Mockup do Detalhe do Documento](docs/mockups/04_detalhe_documento.png)

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar   Painel > Crises e Protocolos > Protocolo...    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄  Protocolo_Crise_Imprensa_2026.pdf               │    │
│  │     ████ PROTOCOLO DE CRISE                         │    │
│  │     PDF • 245 KB • 3.420 palavras • 15/03/2026      │    │
│  │                                                     │    │
│  │     [Abrir Original] [Marcar Revisão] [Reclassif.]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────┐ ┌────────────────────────┐ │
│  │ 🪪 FICHA TÉCNICA           │ │ 🔗 RELACIONADOS        │ │
│  │                             │ │                        │ │
│  │ Tipo:    Protocolo de Crise │ │ ⬤ 85% Manual_Crise    │ │
│  │ Assunto: Crise c/ imprensa │ │ ⬤ 72% Fluxo_Imprensa  │ │
│  │ Seção:   Crises             │ │ ⬤ 68% Lista_Contatos  │ │
│  │ Status:  ✅ Atualizado      │ │                        │ │
│  │                             │ ├────────────────────────┤ │
│  │ Porta-vozes mencionados:    │ │ 🏷️ PALAVRAS-CHAVE     │ │
│  │ • João Silva (Presidente)   │ │                        │ │
│  │ • Maria Santos (ASCOM)      │ │ [crise] [imprensa]    │ │
│  │                             │ │ [protocolo] [nota]     │ │
│  │ Entidades:                  │ │ [porta-voz] [mídia]    │ │
│  │ Novacap, ASCOM, GDF        │ │                        │ │
│  ├─────────────────────────────┤ └────────────────────────┘ │
│  │ 📝 RESUMO INTELIGENTE      │                            │
│  │                             │                            │
│  │ Este documento estabelece   │                            │
│  │ os procedimentos para       │                            │
│  │ gerenciamento de crises...  │                            │
│  ├─────────────────────────────┤                            │
│  │ 📄 CONTEÚDO EXTRAÍDO       │                            │
│  │ [expandir/colapsar]         │                            │
│  └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Interações:**
- **Badge de tipo**: cor da seção (Protocolo de Crise = vermelho)
- **Botão "Abrir Original"**: abre o arquivo no sistema operacional
- **Botão "Marcar Revisão"**: toggle → muda badge para ⚠️, aparece no painel de alertas
- **Botão "Reclassificar"**: abre dropdown com as 12 classificações
- **Docs relacionados**: círculos de porcentagem com gradiente (verde 80%+ → amarelo 50-80% → cinza <50%)
- **Keywords**: hover → destaca ocorrências no conteúdo abaixo
- **Conteúdo**: colapsa por padrão, expande com animação suave. Entidades destacadas em cores

---

### 5. Saúde do Plano

**Estrutura:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Saúde do Plano                                          │
│                                                             │
│  COBERTURA GERAL: ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 78%                    │
│                                                             │
│  ┌────────────────────────────────────────┐                  │
│  │ SEÇÃO                  DOCS  STATUS   │                  │
│  │ ─────────────────────────────────────  │                  │
│  │ 🚨 Crises e Protocolos   5   ✅ Ok   │ ▓▓▓▓▓▓▓▓▓▓ 100% │
│  │ 📋 Fluxos de Trabalho   12   ✅ Ok   │ ▓▓▓▓▓▓▓▓▓░  90% │
│  │ 🎤 Porta-vozes           3   ⚠️ Rev. │ ▓▓▓▓▓▓░░░░  60% │
│  │ 📅 Calendário            8   ✅ Ok   │ ▓▓▓▓▓▓▓▓░░  80% │
│  │ 📰 Assuntos Sensíveis    2   🔴 Ant. │ ▓▓▓▓░░░░░░  40% │
│  │ 📊 Relatórios            15  ✅ Ok   │ ▓▓▓▓▓▓▓▓▓▓ 100% │
│  │ 📜 Normativas            4   ✅ Ok   │ ▓▓▓▓▓▓▓░░░  70% │
│  └────────────────────────────────────────┘                  │
│                                                             │
│  ⚠️ GAPS DETECTADOS                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔴 "Assuntos Sensíveis" sem atualização há 8 meses │    │
│  │ ⚠️ "Porta-vozes" — setor "Obras" sem designação     │    │
│  │ ⚠️ Calendário do 2º semestre incompleto              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Busca Inteligente (Redesign)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Busca Inteligente                                       │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 🔍 comunicação interna                           │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
│  ┌─────────┐  FILTROS           ORDENAR                     │
│  │ Seção:  │  [Todas ▾]        [Relevância ▾]              │
│  │ Tipo:   │  [Todos ▾]                                     │
│  │ Status: │  [Todos ▾]        3 resultados encontrados     │
│  │ Data:   │  [2026  ▾]                                     │
│  └─────────┘                                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄 Plano_Comunicacao_Interna_2026.pdf               │    │
│  │ ████ FLUXO DE TRABALHO  •  87% relevância           │    │
│  │                                                     │    │
│  │ "...o plano de comunicação interna define os        │    │
│  │ canais e procedimentos para difusão..."             │    │
│  │                                                     │    │
│  │ [crise] [interna] [procedimento]        [Expandir ▾]│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Pesquisas relacionadas:                                    │
│  [comunicação externa] [fluxo de demandas] [canais]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Padrões de Interação

### Micro-animações

| Elemento | Animação | Duração | Easing |
|---|---|---|---|
| Cards (hover) | translateY(-2px) + border glow | 200ms | ease-out |
| Páginas (transição) | fadeIn + slideUp (8px) | 300ms | ease-out |
| Skeleton loading | shimmer gradient (esquerda → direita) | 1.5s loop | linear |
| Badge de status | pulse sutil (scale 1→1.05→1) | 2s loop | ease-in-out |
| Checklist (marcar) | scale(0→1.2→1) no ✓ | 250ms | spring |
| Alertas (aparecer) | fadeIn + slideInRight, escalonado | 300ms + 100ms delay | ease-out |
| Chat (mensagem) | slideIn + fadeIn | 200ms | ease-out |
| Chat (pensando) | 3 dots pulsantes | 800ms loop | ease-in-out |
| Progresso (barra) | width 0→X% | 800ms | ease-out |
| Busca (sugestões) | fadeIn + slideDown (4px) | 150ms | ease-out |
| Modal (abrir) | fadeIn bg + scaleUp conteúdo (0.95→1) | 200ms | ease-out |

### Feedback Visual

```
ESTADOS DE LOADING
─────────────────────────────────────────
1. Skeleton screens (cards cinza pulsantes) — usado ao entrar numa página
2. Spinner inline (dots pulsantes) — usado para ações pequenas
3. Progress bar (topo da página) — usado para operações longas
4. Nunca: tela branca/preta sem feedback

ESTADOS DE ERRO
─────────────────────────────────────────
1. Toast notification (slide do topo) — erros de API
2. Inline message (vermelho sutil) — erros de formulário
3. Empty state com ilustração — sem resultados
4. Retry button — falha de conexão

ESTADOS DE SUCESSO
─────────────────────────────────────────
1. Toast notification verde — ações completadas
2. Inline checkmark — itens salvos
3. Transição suave — navegação bem-sucedida
```

### Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Ctrl+K` | Abrir busca global rápida |
| `Ctrl+1-6` | Navegar entre páginas |
| `Escape` | Fechar modal/dropdown |
| `Enter` | Enviar pergunta no chat |
| `↑/↓` | Navegar sugestões de busca |

---

## Responsividade

### Breakpoints

```
DESKTOP:     > 1280px   (layout completo, sidebar expandida)
TABLET:      768-1280px (sidebar colapsada, grid 2 colunas)
MOBILE:      < 768px    (menu hamburger, grid 1 coluna)
```

### Adaptações Mobile

- **Header**: colapsa em hamburger menu
- **Cards de seção**: empilham verticalmente (1 coluna)
- **Chat**: largura total, teclado push-up
- **Painel de Crise (modo ativo)**: prioridade total — ocupa 100% da tela
- **Documento detalhe**: coluna única, sidebar de relacionados vira accordion
- **Busca**: filtros viram bottom sheet

---

## Acessibilidade e Modo Crise

### Contraste e Legibilidade

```
MODO NORMAL
─────────────────────────────────────────
Contraste texto/fundo: mínimo 4.5:1 (WCAG AA)
Texto principal: #f0f0f5 sobre #0a0a14 → ratio 15.2:1 ✅
Texto secundário: #8888a0 sobre #0a0a14 → ratio 5.8:1 ✅

MODO CRISE (contraste ampliado)
─────────────────────────────────────────
Fundo: #0a0a14 (mantém)
Texto: #ffffff (branco puro) → ratio 18.1:1
Fontes: +40% maiores que modo normal
Botões: +50% maiores, áreas de toque mínimo 48px
Cores: apenas vermelho + branco + cinza (sem ambiguidade)
```

### Focus States

- Todos os elementos interativos têm `:focus-visible` com outline accent
- Tab navigation funcional em todas as páginas
- Aria-labels em todos os ícones e botões

---

# PROPOSTA DE MELHORIAS (Funcional)

*(Seções mantidas do plano original abaixo)*

---

## Fase 1: Motor de Consulta Operacional ✅ Concluída

### 1.1 — Painel de Consulta Rápida (Nova Home)
- ✅ `frontend/src/pages/OperationalDashboard.tsx`
- ✅ `backend/src/routes/operational.ts`

### 1.2 — Chat de Consulta Inteligente
- ✅ `frontend/src/pages/ConsultChat.tsx`
- ✅ `backend/src/routes/consult.ts`
- 🟡 `backend/src/analysis/questionEngine.ts` — **não existe separado** (lógica inline no consult.ts)

### 1.3 — Busca Contextual Aprimorada
- ✅ `backend/src/routes/search.ts`
- ✅ `frontend/src/pages/SmartSearch.tsx`

---

## Fase 2: Inteligência Documental ✅ Concluída

### 2.1 — Classificação Funcional
- ✅ `backend/src/analysis/classifier.ts`
- ✅ `database.ts` (novas colunas)

### 2.2 — Extração de Entidades
- ✅ `backend/src/analysis/entityExtractor.ts`
- ✅ `backend/src/analysis/nlpService.ts`

### 2.3 — Ficha Técnica do Documento
- ✅ `frontend/src/pages/DocumentDetail.tsx`

---

## Fase 3: Apoio à Decisão ✅ Concluída

### 3.1 — Painel de Crise
- ✅ `frontend/src/pages/CrisisPanel.tsx`
- ✅ `backend/src/routes/crisis.ts`

### 3.2 — Saúde do Plano
- ✅ `frontend/src/pages/PlanHealth.tsx`
- ✅ `backend/src/routes/health.ts`

### 3.3 — Relatório Anual
- ✅ `frontend/src/pages/ExecutiveReports.tsx`
- ✅ `backend/src/routes/annual-report.ts`

---

## Fase 4: Correções Técnicas 🟡 Quase concluída

### 4.1 — Segurança ✅
- ✅ Corrigir SQL Injection em `database.ts`
- ✅ Corrigir Command Injection em `files.ts`
- ✅ Corrigir SQL Injection em `reports.ts`

### 4.2 — Organização
- ✅ `frontend/src/api.ts` (centralizado)
- 🟡 `frontend/src/styles/global.css` — **usa `index.css`**, não pasta `styles/`
- ✅ React Router em `App.tsx`
- ✅ Componentes legados removidos
- ✅ Dependências não usadas removidas
- ✅ `stopwords.ts` unificado em `shared/`
- 🟡 N+1 queries em reports.ts e plan.ts — **parcialmente resolvido**
- ✅ Clustering real por conteúdo em `cluster.ts`
- ✅ Diretório raiz configurável em `scanner.ts`

---

## Resumo Visual da Transformação

```
ANTES (Indexador de Arquivos)          DEPOIS (Ferramenta Operacional ASCOM)
─────────────────────────              ──────────────────────────────────────
📁 Dashboard de estatísticas    →      🏠 Painel Operacional (seções do plano)
🔍 Busca por keywords           →      💬 Chat de consulta em linguagem natural
📊 Gráficos genéricos           →      🚨 Painel de Crise (protocolos + porta-vozes)
📈 Timeline de arquivos         →      📋 Saúde do Plano (gaps + atualização)
📋 Clusters por pasta           →      📑 Classificação funcional inteligente
📄 Texto bruto do documento     →      🪪 Ficha técnica + entidades extraídas
📊 Relatórios por cluster       →      📊 Relatório de Atuação Anual
```

---

## Ordem de Execução

| Prioridade | O quê | Status |
|---|---|---|
| 🔴 **Já** | Fase 4.1 (Segurança) | ✅ Concluído |
| 🔵 **1ª** | Fase 2 (Inteligência) + Design System CSS | ✅ Concluído |
| 🔵 **2ª** | Fase 1 (Consulta) | ✅ Concluído |
| 🟢 **3ª** | Fase 3 (Decisão) | ✅ Concluído |
| 🟡 **4ª** | Fase 4.2 (Código) + Polish UX | 🟡 Quase concluído |

---

## Mockups

Os mockups visuais das telas principais estão na pasta `docs/mockups/`:

1. `01_painel_operacional.png` — Painel Operacional (Home)
2. `02_chat_consulta.png` — Chat de Consulta Inteligente
3. `03_painel_crise.png` — Painel de Crise (Normal + Ativo)
4. `04_detalhe_documento.png` — Detalhe do Documento com Ficha Técnica
