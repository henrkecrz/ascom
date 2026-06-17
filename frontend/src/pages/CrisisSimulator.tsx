import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'

interface Option { id: string; text: string; points?: number; feedback?: string }
interface Scenario { id: number; title: string; description: string; options: Option[]; difficulty?: string; category?: string; source?: string }
interface Category { category: string; count: number }
interface ChoiceRecord { scenarioTitle: string; chosenOptionId: string; chosenText: string; points: number; feedback: string; isCorrect: boolean }

const LS_KEY = 'novacap_crisis_highscore'

export function CrisisSimulator() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [currentIdx, setCurrentIdx] = useState<number>(-1)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [points, setPoints] = useState<number | null>(null)
  const [score, setScore] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const [gameFinished, setGameFinished] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [choices, setChoices] = useState<ChoiceRecord[]>([])
  const [highScore, setHighScore] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(LS_KEY) || '0', 10) } catch { return 0 }
  })
  const [isNewRecord, setIsNewRecord] = useState(false)

  const loadScenarios = (category?: string) => {
    api.simulator.scenarios(category || undefined)
      .then(d => setScenarios(d.scenarios))
      .catch(console.error)
  }

  useEffect(() => {
    api.simulator.categories()
      .then(d => setCategories(d.categories))
      .catch(console.error)
    loadScenarios()
  }, [])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    loadScenarios(cat || undefined)
  }

  useEffect(() => {
    if (!timerActive || timeLeft <= 0 || selectedOption) return

    const t = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSelect('TIMEOUT')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(t)
  }, [timeLeft, timerActive, selectedOption])

  const start = () => {
    setCurrentIdx(0)
    setSelectedOption(null)
    setFeedback(null)
    setPoints(null)
    setScore(0)
    setTimeLeft(30)
    setGameFinished(false)
    setTimerActive(true)
    setChoices([])
    setIsNewRecord(false)
  }

  const handleSelect = (optionId: string) => {
    if (selectedOption) return
    setSelectedOption(optionId)
    setTimerActive(false)

    const currentScenario = scenarios[currentIdx]
    if (!currentScenario) return

    if (optionId === 'TIMEOUT') {
      const fb = 'Tempo esgotado! A inação ou demora extrema em responder a imprensa agrava a crise e desgasta a imagem institucional.'
      setFeedback(fb)
      setPoints(0)
      setChoices(prev => [...prev, {
        scenarioTitle: currentScenario.title,
        chosenOptionId: '⏱️',
        chosenText: 'Tempo esgotado',
        points: 0,
        feedback: fb,
        isCorrect: false,
      }])
      return
    }

    const chosenOpt = currentScenario.options.find(o => o.id === optionId)

    api.simulator.evaluate(currentScenario.id, optionId)
      .then(d => {
        setPoints(d.points)
        setFeedback(d.feedback)
        setScore(prev => prev + d.points)
        setChoices(prev => [...prev, {
          scenarioTitle: currentScenario.title,
          chosenOptionId: optionId,
          chosenText: chosenOpt?.text || optionId,
          points: d.points,
          feedback: d.feedback,
          isCorrect: d.points > 50,
        }])
      })
      .catch(console.error)
  }

  const next = () => {
    if (currentIdx + 1 < scenarios.length) {
      setCurrentIdx(prev => prev + 1)
      setSelectedOption(null)
      setFeedback(null)
      setPoints(null)
      setTimeLeft(30)
      setTimerActive(true)
    } else {
      setGameFinished(true)
      // Check high score
      const finalScore = score + (points || 0)
      if (finalScore > highScore) {
        setIsNewRecord(true)
        setHighScore(finalScore)
        try { localStorage.setItem(LS_KEY, String(finalScore)) } catch { /* noop */ }
      }
    }
  }

  const activeScenario = scenarios[currentIdx]
  const categoryLabels: Record<string, string> = {
    crise: 'Crise',
    porta_voz: 'Porta-Voz',
    relacionamento: 'Relacionamento',
    normativa_diretriz: 'Normativas',
    protocolo_crise: 'Protocolo de Crise',
    fluxo_trabalho: 'Fluxo de Trabalho',
    calendario_agenda: 'Calendário',
    assunto_sensivel: 'Assuntos Sensíveis',
    relatorio_atuacao: 'Relatórios',
    clipping_monitoramento: 'Clipping',
    material_campanha: 'Campanha',
    documento_administrativo: 'Administrativo',
    geral: 'Geral',
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🎯 Simulador de Crises (War Games)</h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Treinamento de resposta rápida e decisões estratégicas sob pressão para assessores e RPs
        </p>
        {highScore > 0 && currentIdx === -1 && (
          <div style={{ marginTop: 6, fontSize: '0.72rem', color: theme.colors.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            🏆 Recorde Pessoal: {highScore} pts
          </div>
        )}
      </div>

      {currentIdx === -1 ? (
        /* Welcome Screen */
        <div style={{ ...cardBase, padding: 32, textAlign: 'center', maxWidth: 600, margin: '40px auto 0' }}>
          <span style={{ fontSize: '3rem' }}>🎯</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '12px 0 8px', color: theme.colors.text }}>
            Prepare-se para a Ação
          </h2>
          <p style={{ fontSize: '0.8rem', color: theme.colors.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
            Você enfrentará cenários simulados de crises da Novacap baseados em casos reais. 
            Terá **30 segundos** para tomar a decisão correta e seguir as diretrizes do plano de comunicação da empresa.
          </p>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div style={{ marginBottom: 20, textAlign: 'left' }}>
              <label style={{ fontSize: '0.7rem', color: theme.colors.textMuted, display: 'block', marginBottom: 6 }}>
                Filtrar por categoria:
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => handleCategoryChange('')}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: 20,
                    background: !selectedCategory ? theme.colors.gradient : theme.colors.bgElevated,
                    color: !selectedCategory ? '#fff' : theme.colors.textSecondary,
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
                  }}>
                  Todas ({scenarios.length + (selectedCategory ? 0 : 0)})
                </button>
                {categories.map(c => (
                  <button key={c.category} onClick={() => handleCategoryChange(c.category)}
                    style={{
                      padding: '6px 14px', border: 'none', borderRadius: 20,
                      background: selectedCategory === c.category ? theme.colors.gradient : theme.colors.bgElevated,
                      color: selectedCategory === c.category ? '#fff' : theme.colors.textSecondary,
                      cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
                    }}>
                    {categoryLabels[c.category] || c.category} ({c.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {scenarios.length > 0 ? (
            <div style={{ marginBottom: 16, fontSize: '0.75rem', color: theme.colors.textSecondary }}>
              {scenarios.length} cenário{scenarios.length !== 1 ? 's' : ''} disponível{scenarios.length !== 1 ? 'is' : ''}
              {selectedCategory ? ` na categoria selecionada` : ''}
              {' · '}gerados automaticamente pela IA durante o processamento dos documentos
            </div>
          ) : (
            <div style={{ marginBottom: 16, fontSize: '0.78rem', color: theme.colors.warning }}>
              ⏳ Nenhum cenário disponível. Os cenários são gerados automaticamente pela IA durante o processamento dos documentos na fila.
            </div>
          )}

          <button onClick={start} disabled={scenarios.length === 0}
            style={{
              padding: '12px 36px', border: 'none', borderRadius: theme.radius.md,
              background: scenarios.length === 0 ? theme.colors.border : theme.colors.gradient,
              color: '#fff', cursor: scenarios.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit',
              boxShadow: scenarios.length > 0 ? theme.shadows.glow : 'none'
            }}>
            Iniciar Simulação
          </button>
        </div>
      ) : gameFinished ? (
        /* Results Screen with Debriefing */
        <div style={{ maxWidth: 700, margin: '20px auto 0' }}>
          <div style={{ ...cardBase, padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: '3rem' }}>{isNewRecord ? '🏆' : '🎯'}</span>
            {isNewRecord && (
              <div style={{
                display: 'inline-block', padding: '4px 16px', borderRadius: 20,
                background: 'linear-gradient(135deg, #ffd700, #ff8c00)', color: '#fff',
                fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px',
                marginBottom: 8, animation: 'pulse 1.5s infinite',
              }}>
                🏆 NOVO RECORDE!
              </div>
            )}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '12px 0 8px', color: theme.colors.text }}>
              Simulação Concluída!
            </h2>
            <p style={{ fontSize: '0.85rem', color: theme.colors.textSecondary, marginBottom: 12 }}>
              Sua pontuação de prontidão operacional:
            </p>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: score >= 150 ? theme.colors.success : theme.colors.warning, marginBottom: 4 }}>
              {score} pts
            </div>
            {highScore > 0 && (
              <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 20 }}>
                Recorde Pessoal: {highScore} pts
              </div>
            )}
            <p style={{ fontSize: '0.78rem', color: theme.colors.textMuted, lineHeight: 1.5, marginBottom: 24 }}>
              {score >= 200 
                ? 'Parabéns! Suas escolhas demonstraram alinhamento absoluto com os protocolos da Novacap e excelente senso de prioridade operacional.'
                : 'Bom treinamento. Lembre-se de priorizar o alinhamento com a diretoria, rapidez de resposta e prezar pela transparência oficial.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { setCurrentIdx(-1); setGameFinished(false); loadScenarios(selectedCategory || undefined) }}
                style={{
                  padding: '10px 24px', border: 'none', borderRadius: theme.radius.md,
                  background: theme.colors.gradient, color: '#fff', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit'
                }}>
                Menu Principal
              </button>
            </div>
          </div>

          {/* Debriefing Panel */}
          {choices.length > 0 && (
            <div style={{ ...cardBase, padding: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '0.88rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 Debriefing Operacional
                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: theme.colors.textMuted }}>
                  ({choices.filter(c => c.isCorrect).length}/{choices.length} acertos)
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {choices.map((choice, i) => (
                  <div key={i} style={{
                    padding: 14, borderRadius: theme.radius.md,
                    background: theme.colors.bgElevated,
                    borderLeft: `4px solid ${choice.isCorrect ? theme.colors.success : theme.colors.danger}`,
                    border: `1px solid ${theme.colors.border}`,
                    borderLeftWidth: 4, borderLeftColor: choice.isCorrect ? theme.colors.success : theme.colors.danger,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.colors.text, flex: 1 }}>
                        {choice.isCorrect ? '✅' : '🔴'} Cenário {i + 1}: {choice.scenarioTitle}
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: choice.isCorrect ? 'rgba(0,200,83,0.12)' : 'rgba(255,82,82,0.12)',
                        color: choice.isCorrect ? theme.colors.success : theme.colors.danger,
                      }}>
                        +{choice.points} pts
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: theme.colors.textSecondary, marginBottom: 4 }}>
                      <strong>Sua escolha ({choice.chosenOptionId}):</strong> {choice.chosenText}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, lineHeight: 1.5, fontStyle: 'italic' }}>
                      💡 {choice.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Game Screen */
        activeScenario && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
            {/* Left Column: Scenario & Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...cardBase, padding: 20, background: 'rgba(26,26,46,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.62rem', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cenário {currentIdx + 1} de {scenarios.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(activeScenario as any).category && (
                      <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        {categoryLabels[(activeScenario as any).category] || (activeScenario as any).category}
                      </span>
                    )}
                    {(activeScenario as any).difficulty && (
                      <span style={{
                        fontSize: '0.6rem', padding: '2px 8px', borderRadius: 10,
                        background: (activeScenario as any).difficulty === 'facil' ? 'rgba(0,200,83,0.1)' :
                          (activeScenario as any).difficulty === 'dificil' ? 'rgba(255,82,82,0.1)' : 'rgba(255,193,7,0.1)',
                        color: (activeScenario as any).difficulty === 'facil' ? '#00c853' :
                          (activeScenario as any).difficulty === 'dificil' ? '#ff5252' : '#ffc107'
                      }}>
                        {(activeScenario as any).difficulty === 'facil' ? 'Fácil' :
                          (activeScenario as any).difficulty === 'dificil' ? 'Difícil' : 'Médio'}
                      </span>
                    )}
                  </div>
                </div>
                <h2 style={{ margin: '4px 0 10px', fontSize: '1rem', fontWeight: 700, color: theme.colors.text }}>
                  {activeScenario.title}
                </h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: theme.colors.textSecondary, lineHeight: 1.6 }}>
                  {activeScenario.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeScenario.options.map(opt => {
                  const clicked = selectedOption === opt.id
                  const isCorrect = points !== null && points > 50 && clicked
                  const optionColor = selectedOption 
                    ? (clicked ? (isCorrect ? theme.colors.success : theme.colors.danger) : theme.colors.border)
                    : theme.colors.border
                  
                  return (
                    <div key={opt.id} onClick={() => handleSelect(opt.id)}
                      style={{
                        ...cardBase, padding: 14, cursor: selectedOption ? 'default' : 'pointer',
                        borderColor: optionColor,
                        background: clicked ? `${optionColor}10` : theme.colors.bgElevated,
                        transition: theme.transitions.fast,
                        display: 'flex', gap: 12, alignItems: 'center'
                      }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: selectedOption && clicked ? optionColor : 'rgba(255,255,255,0.05)',
                        color: selectedOption && clicked ? '#fff' : theme.colors.textSecondary, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem'
                      }}>
                        {opt.id}
                      </div>
                      <div style={{ flex: 1, fontSize: '0.78rem', color: theme.colors.text, lineHeight: 1.4 }}>
                        {opt.text}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Timer & Feedback */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...cardBase, padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {selectedOption ? (
                  <>
                    <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 4 }}>PONTUAÇÃO OBTIDA</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: points && points > 50 ? theme.colors.success : theme.colors.danger }}>
                      +{points} pts
                    </div>
                    <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, marginTop: 4 }}>
                      Acumulado: {score} pts
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 4 }}>TEMPO RESTANTE</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: timeLeft <= 10 ? theme.colors.danger : theme.colors.text }}>
                      {timeLeft}s
                    </div>
                    <div style={{ width: '80%', height: 4, background: theme.colors.bg, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${(timeLeft / 30) * 100}%`, height: '100%', background: timeLeft <= 10 ? theme.colors.danger : theme.colors.accent, transition: 'width 1s linear' }} />
                    </div>
                  </>
                )}
              </div>

              {feedback && (
                <div style={{ ...cardBase, padding: 20, borderLeft: `4px solid ${points && points > 50 ? theme.colors.success : theme.colors.danger}` }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 700, color: points && points > 50 ? theme.colors.success : theme.colors.danger }}>
                    {points && points > 50 ? '🟢 Decisão Recomendada' : '🔴 Feedback Operacional'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: theme.colors.textSecondary, lineHeight: 1.5 }}>
                    {feedback}
                  </p>
                  <button onClick={next}
                    style={{
                      width: '100%', padding: '10px 0', border: 'none', borderRadius: theme.radius.sm,
                      background: theme.colors.gradient, color: '#fff', cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit', marginTop: 16
                    }}>
                    {currentIdx + 1 < scenarios.length ? 'Próximo Cenário →' : 'Finalizar Simulação'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}

