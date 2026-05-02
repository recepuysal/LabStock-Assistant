/**
 * Takım / bulut senkron için izin modeli (Supabase `profiles.permissions` ile uyumlu).
 * Admin: tüm bayraklar true; üye: admin arayüzden kapatabilir.
 */
export type TeamPermissions = {
  /** Tabloda +/− ile adet değiştirme */
  adjustQuantity: boolean
  /** Yeni satır / parça ekleme */
  addParts: boolean
  /** Satır silme (ileride) veya stok sıfırlama gibi yıkıcı işlemler */
  deleteOrDestructive: boolean
  /** Excel içe/dışa aktarma */
  importExport: boolean
  /** Ayarlar’da ekip üyelerini / izinleri düzenleme */
  manageUsers: boolean
}

export const ADMIN_PERMISSIONS: TeamPermissions = {
  adjustQuantity: true,
  addParts: true,
  deleteOrDestructive: true,
  importExport: true,
  manageUsers: true,
}

export const MEMBER_DEFAULT_PERMISSIONS: TeamPermissions = {
  adjustQuantity: true,
  addParts: true,
  deleteOrDestructive: false,
  importExport: true,
  manageUsers: false,
}

export type TeamRole = 'admin' | 'member'

export function mergePermissions(role: TeamRole, partial?: Partial<TeamPermissions> | null): TeamPermissions {
  const base = role === 'admin' ? ADMIN_PERMISSIONS : MEMBER_DEFAULT_PERMISSIONS
  if (!partial) return { ...base }
  return { ...base, ...partial }
}
