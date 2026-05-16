import type { ReactNode } from 'react'

type SettingsSectionProps = {
  title: string
  description?: string
  badge?: string
  children?: ReactNode
  className?: string
}

export function SettingsSection({ title, description, badge, children, className = '' }: SettingsSectionProps) {
  return (
    <section className={`ls-settings-section ${className}`.trim()}>
      <header className="ls-settings-section-head">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="ls-settings-section-title">{title}</h2>
          {badge ? <span className="ls-badge">{badge}</span> : null}
        </div>
        {description ? <p className="ls-settings-section-desc">{description}</p> : null}
      </header>
      {children ? <div className="ls-settings-section-body">{children}</div> : null}
    </section>
  )
}

type SettingsFieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  link?: { href: string; label: string }
  children: ReactNode
}

export function SettingsField({ label, htmlFor, hint, link, children }: SettingsFieldProps) {
  return (
    <div className="ls-settings-field">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="ls-label">
          {label}
        </label>
        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-ls-accent underline-offset-2 hover:underline"
          >
            {link.label}
          </a>
        ) : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-2xs text-ls-text-muted">{hint}</p> : null}
    </div>
  )
}

export function SettingsStatus({ type, children }: { type: 'ok' | 'err'; children: ReactNode }) {
  if (!children) return null
  return (
    <p
      className={`text-sm font-medium ${type === 'ok' ? 'text-ls-accent' : 'text-ls-danger'}`}
      role={type === 'err' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}
