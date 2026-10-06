import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { useToast } from '@/components/ui';
import { getAuthErrorMessage, useAuth, validateFullName, validatePassword, type AuthResult } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export type AccountAction = 'profile' | 'password' | 'logout' | 'delete';

export function validatePasswordChange(password: string, confirmation: string): string | null {
  return validatePassword(password, 'register') ??
    (password !== confirmation ? 'Şifreler eşleşmiyor. İki alana da aynı şifreyi yazın.' : null);
}

export function useAccountActions() {
  const router = useRouter();
  const toast = useToast();
  const { signOut } = useAuth();
  const [pending, setPending] = useState<AccountAction | null>(null);
  const inFlight = useRef(false);
  const accountDeleted = useRef(false);

  const run = async (action: AccountAction, operation: () => Promise<AuthResult>): Promise<AuthResult> => {
    if (inFlight.current) return { ok: false, message: 'Devam eden işlemin tamamlanmasını bekleyin.' };
    inFlight.current = true;
    setPending(action);
    try {
      return await operation();
    } catch (error) {
      return { ok: false, message: getAuthErrorMessage(error) };
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const updateProfile = (fullName: string) => run('profile', async () => {
    const message = validateFullName(fullName);
    if (message) return { ok: false, message };
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    if (error) return { ok: false, message: getAuthErrorMessage(error) };
    toast.show('Adınız ve soyadınız kaydedildi');
    return { ok: true };
  });

  const changePassword = (password: string, confirmation: string) => run('password', async () => {
    const message = validatePasswordChange(password, confirmation);
    if (message) return { ok: false, message };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: getAuthErrorMessage(error) };
    toast.show('Şifreniz başarıyla değiştirildi');
    return { ok: true };
  });

  const logout = () => run('logout', async () => {
    const result = await signOut();
    if (result.ok) router.replace('/login');
    return result;
  });

  const deleteAccount = () => run('delete', async () => {
    if (!accountDeleted.current) {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) return { ok: false, message: getAuthErrorMessage(error) };
      accountDeleted.current = true;
    }
    // Hesap artık sunucuda yok: yalnızca bu cihazdaki oturumu temizle.
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      return { ok: false, message: 'Hesabınız silindi ancak cihazdaki oturum kapatılamadı. Tamamlamak için tekrar deneyin.' };
    }
    toast.show('Hesabınız silindi');
    router.replace('/login');
    return { ok: true };
  });

  return { pending, updateProfile, changePassword, logout, deleteAccount };
}
