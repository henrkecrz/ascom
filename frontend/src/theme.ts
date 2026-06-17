export interface ThemeColors {
  primary: string; primaryLight: string; primaryDark: string;
  accent: string; accentLight: string; success: string; warning: string;
  danger: string; info: string;
  bg: string; bgCard: string; bgCardHover: string; bgElevated: string;
  sidebar: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderLight: string;
  glass: string; glassBorder: string;
  gradient: string; gradientWarm: string;
  sectionBg: string; hoverBg: string; activeBg: string;
}

export interface ThemeShadows {
  sm: string; md: string; lg: string; glow: string; glowPrimary: string;
}

export interface Theme {
  name: 'dark' | 'light';
  colors: ThemeColors;
  shadows: ThemeShadows;
  radius: { sm: number; md: number; lg: number; xl: number };
  transitions: { fast: string; normal: string; slow: string };
  fonts: { body: string; mono: string };
}

const navyBg = 'oklch(7% 0.008 250)';
const navySurface = 'oklch(11% 0.01 250)';
const navySurface2 = 'oklch(15% 0.012 250)';
const navyBorder = 'oklch(18% 0.012 250)';
const blueAccent = 'oklch(58% 0.16 255)';
const blueAccentLight = 'oklch(68% 0.16 255)';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#1e3a5f', primaryLight: blueAccent, primaryDark: '#0d1b2a',
    accent: blueAccent, accentLight: blueAccentLight,
    success: 'oklch(58% 0.15 145)', warning: 'oklch(68% 0.14 85)', danger: 'oklch(58% 0.19 30)', info: blueAccent,
    bg: navyBg, bgCard: navySurface, bgCardHover: navySurface2, bgElevated: navySurface2,
    sidebar: 'oklch(6% 0.008 250)',
    text: 'oklch(95% 0.005 250)', textSecondary: 'oklch(75% 0.006 250)', textMuted: 'oklch(52% 0.008 250)',
    border: navyBorder, borderLight: 'oklch(22% 0.012 250)',
    glass: 'oklch(7% 0.008 250 / 0.85)', glassBorder: 'oklch(58% 0.16 255 / 0.12)',
    gradient: `linear-gradient(135deg, ${blueAccent} 0%, oklch(50% 0.14 255) 100%)`,
    gradientWarm: `linear-gradient(135deg, ${blueAccent} 0%, oklch(58% 0.19 30) 100%)`,
    sectionBg: `${blueAccent}0f`, hoverBg: `${blueAccent}1a`, activeBg: `${blueAccent}25`,
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.35)',
    lg: '0 8px 32px rgba(0,0,0,0.4)',
    glow: `0 0 16px ${blueAccent}20`,
    glowPrimary: `0 0 24px ${blueAccent}30`,
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20 },
  transitions: { fast: 'all 0.15s ease', normal: 'all 0.25s ease', slow: 'all 0.4s ease' },
  fonts: { body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", mono: "'JetBrains Mono', 'Fira Code', monospace" },
}

const lightBg = 'oklch(95% 0.003 250)';
const lightSurface = 'oklch(100% 0 0)';
const lightSurface2 = 'oklch(92% 0.004 250)';

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#1e3a5f', primaryLight: blueAccent, primaryDark: '#0d1b2a',
    accent: blueAccent, accentLight: blueAccentLight,
    success: 'oklch(50% 0.15 145)', warning: 'oklch(60% 0.16 85)', danger: 'oklch(50% 0.19 30)', info: blueAccent,
    bg: lightBg, bgCard: lightSurface, bgCardHover: lightSurface2, bgElevated: lightSurface2,
    sidebar: 'oklch(90% 0.003 250)',
    text: 'oklch(15% 0.008 250)', textSecondary: 'oklch(40% 0.006 250)', textMuted: 'oklch(60% 0.006 250)',
    border: 'oklch(85% 0.005 250)', borderLight: 'oklch(88% 0.004 250)',
    glass: 'oklch(100% 0 0 / 0.85)', glassBorder: `${blueAccent}15`,
    gradient: `linear-gradient(135deg, ${blueAccent} 0%, #1e3a5f 100%)`,
    gradientWarm: `linear-gradient(135deg, ${blueAccent} 0%, oklch(58% 0.19 30) 100%)`,
    sectionBg: `${blueAccent}08`, hoverBg: `${blueAccent}0c`, activeBg: `${blueAccent}14`,
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 10px rgba(0,0,0,0.06)',
    lg: '0 8px 20px rgba(0,0,0,0.07)',
    glow: `0 0 12px ${blueAccent}15`,
    glowPrimary: `0 0 20px ${blueAccent}20`,
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20 },
  transitions: { fast: 'all 0.15s ease', normal: 'all 0.25s ease', slow: 'all 0.4s ease' },
  fonts: { body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif", mono: "'JetBrains Mono', 'Fira Code', monospace" },
}

export type ThemeName = 'dark' | 'light'
export const theme = darkTheme

export const cardBase: React.CSSProperties = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }

export const gradientText: React.CSSProperties = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

export const premiumInput: React.CSSProperties = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' }

export const glowKeyframes = `
@keyframes glow { 0%,100% { box-shadow: 0 0 20px ${blueAccent}15; } 50% { box-shadow: 0 0 30px ${blueAccent}25; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
@keyframes sidebarItemIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
`
