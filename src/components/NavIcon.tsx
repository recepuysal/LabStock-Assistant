type IconName = 'home' | 'inventory' | 'chat' | 'settings'

const paths: Record<IconName, JSX.Element> = {
  home: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 4.5l7.5 6V20a1 1 0 0 1-1 1h-4.5v-6h-4v6H5.5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  inventory: (
    <>
      <path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5v14M17 5v14" />
    </>
  ),
  chat: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 7.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 16.5H9l-3 3v-3H6A1.5 1.5 0 0 1 4.5 12v-3A1.5 1.5 0 0 1 6 7.5Z"
      />
    </>
  ),
  settings: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </>
  ),
}

export function NavIcon({ name, className = 'h-5 w-5 shrink-0' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      {paths[name]}
    </svg>
  )
}

export const NAV_ICON: Record<string, IconName> = {
  '/': 'home',
  '/kayit': 'inventory',
  '/sohbet': 'chat',
  '/ayarlar': 'settings',
}
