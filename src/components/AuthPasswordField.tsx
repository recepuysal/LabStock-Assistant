import type { Ref } from 'react'

type AuthPasswordFieldProps = {
  id: string
  testId?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
  visible: boolean
  onToggleVisible: () => void
  inputRef?: Ref<HTMLInputElement>
  minLength?: number
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" d="M3 3l18 18" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.58 10.58a2 2 0 002.84 2.84M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 10.5 7.5a11.2 11.2 0 01-2.17 3.58M6.72 6.72A11.2 11.2 0 003.5 12.5C4.73 16.89 9 20 14 20a10.9 10.9 0 004.12-.82"
        />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AuthPasswordField({
  id,
  testId,
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggleVisible,
  inputRef,
  minLength = 6,
}: AuthPasswordFieldProps) {
  return (
    <div className="ls-auth-password-wrap">
      <input
        ref={inputRef}
        id={id}
        data-testid={testId}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ls-auth-field ls-auth-field--password"
        placeholder={placeholder}
      />
      <button
        type="button"
        data-testid={testId ? `${testId}-toggle` : undefined}
        className="ls-auth-password-toggle"
        onClick={onToggleVisible}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={visible}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}
