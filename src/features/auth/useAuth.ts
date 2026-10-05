import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './AuthProvider';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return ctx;
}

/** Kullanıcının adı (kayıtta metadata'ya yazılan `full_name`), yoksa e-postanın baş kısmı. */
export function getDisplayName(user: { email?: string; user_metadata?: Record<string, unknown> } | null): string {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();
  return user?.email?.split('@')[0] ?? '';
}
