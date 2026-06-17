import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'

interface Contact {
  id: number
  name: string
  role: string
  organization: string
  phone: string
  email: string
  notes: string
}

export function PressMailing() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [organization, setOrganization] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 24

  const loadContacts = () => {
    api.contacts.list().then(d => {
      setAllContacts(d.contacts || [])
      setPage(1)
    }).catch(console.error)
  }

  useEffect(() => {
    loadContacts()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    api.contacts.create({ name, role, organization, phone, email, notes })
      .then(() => {
        loadContacts()
        setName('')
        setRole('')
        setOrganization('')
        setPhone('')
        setEmail('')
        setNotes('')
        setShowForm(false)
      })
      .catch(console.error)
  }

  const handleDelete = (id: number) => {
    if (confirm('Excluir este contato do mailing?')) {
      api.contacts.delete(id).then(loadContacts).catch(console.error)
    }
  }

  const filtered = search
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.organization.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase())
      )
    : allContacts

  const totalPages = Math.ceil(filtered.length / LIMIT)
  const currentPage = Math.min(page, totalPages || 1)
  const pageContacts = filtered.slice((currentPage - 1) * LIMIT, currentPage * LIMIT)

  const goToPage = (p: number) => {
    const target = Math.max(1, Math.min(p, totalPages || 1))
    setPage(target)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>📞 Mailing de Imprensa</h1>
          <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
            Lista de relacionamento e contatos rápidos com veículos de comunicação
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px', border: 'none', borderRadius: theme.radius.md,
            background: theme.colors.gradient, color: '#fff', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit',
          }}>
          {showForm ? 'Fechar Cadastro' : 'Cadastrar Contato'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...cardBase, padding: 20, marginBottom: 20, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={premiumInput} placeholder="Ex: Rodrigo Ramos" />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Veículo / Organização</label>
            <input value={organization} onChange={e => setOrganization(e.target.value)} style={premiumInput} placeholder="Ex: Metrópoles" />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Cargo</label>
            <input value={role} onChange={e => setRole(e.target.value)} style={premiumInput} placeholder="Ex: Repórter de Cidade" />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Telefone (com DDD)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={premiumInput} placeholder="Ex: (61) 99999-9999" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={premiumInput} placeholder="Ex: rodrigo@metropoles.com" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Notas / Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{ ...premiumInput, resize: 'none', width: '100%', fontFamily: 'inherit' }} placeholder="Ex: Cobre pautas de asfalto e drenagem." />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="submit" style={{
              padding: '10px 24px', border: 'none', borderRadius: theme.radius.md,
              background: theme.colors.gradient, color: '#fff', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit'
            }}>
              Salvar Contato
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); goToPage(1) }} placeholder="Filtrar por nome, veículo ou cargo..." style={premiumInput} aria-label="Filtrar contatos" />
      </div>

      {/* Contacts List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {pageContacts.map(c => {
          const waPhone = c.phone.replace(/[^\d]/g, '')
          const hasWa = waPhone.length >= 8
          
          return (
            <div key={c.id} style={{ ...cardBase, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(26,26,46,0.4)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(124,77,255,0.15)', color: theme.colors.accentLight, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    {c.organization || 'Autônomo'}
                  </span>
                  <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'transparent', color: theme.colors.textMuted, cursor: 'pointer', fontSize: '0.75rem' }} aria-label={`Excluir ${c.name}`}>
                    ✕
                  </button>
                </div>
                <h3 style={{ margin: '8px 0 2px', fontSize: '0.9rem', fontWeight: 700, color: theme.colors.text }}>{c.name}</h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: theme.colors.textSecondary }}>{c.role || 'Jornalista'}</p>
                {c.notes && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: theme.colors.textMuted, fontStyle: 'italic', lineHeight: 1.4 }}>
                    {c.notes}
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {hasWa && (
                  <a href={`https://wa.me/${waPhone.startsWith('55') ? '' : '55'}${waPhone}`} target="_blank" rel="noreferrer"
                    style={{
                      flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '6px 0', borderRadius: theme.radius.sm, background: 'rgba(0, 200, 83, 0.1)',
                      color: theme.colors.success, border: '1px solid rgba(0, 200, 83, 0.2)', fontSize: '0.7rem', fontWeight: 600
                    }}
                    aria-label={`WhatsApp ${c.name}`}>
                    💬 WhatsApp
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`}
                    style={{
                      flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '6px 0', borderRadius: theme.radius.sm, background: 'rgba(41, 121, 255, 0.1)',
                      color: '#2979ff', border: '1px solid rgba(41, 121, 255, 0.2)', fontSize: '0.7rem', fontWeight: 600
                    }}
                    aria-label={`E-mail ${c.name}`}>
                    ✉️ E-mail
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: '8px 16px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
              background: theme.colors.bgCard, color: theme.colors.text, cursor: currentPage <= 1 ? 'default' : 'pointer',
              fontSize: '0.8rem', fontFamily: 'inherit', opacity: currentPage <= 1 ? 0.4 : 1,
            }}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map(p => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              style={{
                width: 34, height: 34, borderRadius: theme.radius.sm,
                border: p === currentPage ? 'none' : `1px solid ${theme.colors.border}`,
                background: p === currentPage ? theme.colors.gradient : theme.colors.bgCard,
                color: p === currentPage ? '#fff' : theme.colors.textSecondary,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: p === currentPage ? 700 : 400,
                fontFamily: 'inherit',
              }}
              aria-label={`Página ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: '8px 16px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
              background: theme.colors.bgCard, color: theme.colors.text, cursor: currentPage >= totalPages ? 'default' : 'pointer',
              fontSize: '0.8rem', fontFamily: 'inherit', opacity: currentPage >= totalPages ? 0.4 : 1,
            }}
            aria-label="Próxima página"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
