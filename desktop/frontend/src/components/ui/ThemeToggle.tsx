import { Sun, Moon } from 'lucide-react'

type Props = {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="ps-btn-icon"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 9,
        padding: '7px 10px',
        borderRadius: 'var(--radius-sm)',
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'none'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
      }}
    >
      {theme === 'dark'
        ? <Sun size={15} strokeWidth={1.8} />
        : <Moon size={15} strokeWidth={1.8} />
      }
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}
