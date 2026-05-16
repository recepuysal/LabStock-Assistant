import { useTheme } from '@/context/ThemeContext'

type Props = {
  variant?: 'icon' | 'sidebar'
  className?: string
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z"
      />
    </svg>
  )
}

export function ThemeToggle({ variant = 'icon', className = '' }: Props) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Açık tema' : 'Koyu tema'

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ls-text-muted transition-colors hover:bg-ls-muted hover:text-ls-text ${className}`}
        aria-label={label}
        title={label}
      >
        {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
        {isDark ? 'Açık tema' : 'Koyu tema'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`ls-btn-icon ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  )
}
