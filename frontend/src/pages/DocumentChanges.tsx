import { useEffect, useState } from 'react';
import { intelligenceApi } from '../apiIntelligence';
import { useTheme } from '../ThemeContext';
import { AlertTriangle, CheckCircle, Clock, FileClock, ShieldAlert } from 'lucide-react';

export function DocumentChanges() {
  const { theme } = useTheme();
  const [changes, setChanges] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [impact, setImpact] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [changesRes, alertsRes] = await Promise.all([
        intelligenceApi.documentChanges.list(impact ? { impact } : {}),
        intelligenceApi.documentChanges.alerts(false),
      ]);
      setChanges(changesRes?.changes || []);
      setAlerts(alertsRes?.alerts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [impact]);

  const card = { background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.lg, padding: 16 } as const;
  const pill = (level: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999,
    fontSize: '0.72rem', fontWeight: 700,
    background: level === 'critico' ? 'rgba(255, 23, 68, 0.15)' : level === 'alto' ? 'rgba(255, 152, 0, 0.14)' : 'rgba(0, 200, 83, 0.10)',
    color: level === 'critico' ? theme.colors.danger : level === 'alto' ? theme.colors.accentLight : theme.colors.success,
  }) as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileClock size={22} /> Mudanças Documentais
        </h1>
        <p style={{ margin: '6px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Acompanhe alterações detectadas em documentos, versões geradas, alertas e impactos nos módulos do sistema.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <div style={card}>
          <div style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>Mudanças listadas</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: theme.colors.text }}>{changes.length}</div>
        </div>
        <div style={card}>
          <div style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>Alertas abertos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: alerts.length ? theme.colors.danger : theme.colors.success }}>{alerts.length}</div>
        </div>
        <div style={card}>
          <div style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>Filtro</div>
          <select value={impact} onChange={e => setImpact(e.target.value)} style={{ width: '100%', marginTop: 6, background: theme.colors.bgElevated, color: theme.colors.text, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: 8 }}>
            <option value="">Todos os impactos</option>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={card}>
          <h2 style={{ margin: '0 0 10px', color: theme.colors.text, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={17} /> Alertas abertos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ padding: 10, borderRadius: theme.radius.md, background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontWeight: 700, color: theme.colors.text }}>{alert.alert_title}</div>
                <div style={{ color: theme.colors.textSecondary, fontSize: '0.8rem', marginTop: 4 }}>{alert.alert_message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <h2 style={{ margin: '0 0 10px', color: theme.colors.text, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={17} /> Histórico de mudanças
        </h2>
        {loading ? (
          <div style={{ color: theme.colors.textMuted }}>Carregando mudanças...</div>
        ) : changes.length === 0 ? (
          <div style={{ color: theme.colors.textMuted }}>Nenhuma mudança documental registrada ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {changes.map(change => (
              <div key={change.id} style={{ padding: 12, borderRadius: theme.radius.md, background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, color: theme.colors.text }}>{change.name || `Documento #${change.file_id}`}</div>
                  <span style={pill(change.impact_level)}>{change.impact_level === 'critico' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}{change.impact_level}</span>
                </div>
                <div style={{ color: theme.colors.textSecondary, fontSize: '0.82rem', marginTop: 6 }}>{change.summary}</div>
                <div style={{ color: theme.colors.textMuted, fontSize: '0.72rem', marginTop: 6 }}>
                  Tipo: {change.change_type} · Status: {change.status} · Detectado em {change.detected_at ? new Date(change.detected_at).toLocaleString() : '—'}
                </div>
                {change.recommended_action && (
                  <div style={{ color: theme.colors.textSecondary, fontSize: '0.78rem', marginTop: 8 }}>
                    Ação recomendada: {change.recommended_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
