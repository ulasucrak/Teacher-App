import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase, supabaseConfigError } from '@/lib/supabase';

import { getAuthErrorMessage, isNetworkError } from './errors';
import { parseRecoveryUrl, RESET_PASSWORD_PATH, webResetRedirectUrl } from './recovery';
import { webOrigin } from './webUrl';

export type AuthResult = { ok: true } | { ok: false; message: string };
export type SignUpResult = { ok: true; needsEmailConfirmation: boolean } | { ok: false; message: string };

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** İlk oturum okuması bitene kadar true. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Ad soyad, kullanıcı metadata'sına `full_name` olarak yazılır. */
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  signOut: () => Promise<AuthResult>;
  /** Sıfırlama e-postası gönderir; bağlantı uygulamadaki /reset-password ekranını açar. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** E-postadaki sıfırlama bağlantısından (token'lar ya da PKCE kodu) oturum kurar. */
  recoverSession: (url: string | null) => Promise<AuthResult>;
  /** Oturum açıkken şifreyi değiştirir. */
  updatePassword: (password: string) => Promise<AuthResult>;
}

/**
 * Supabase panelinde Auth → URL Configuration → Redirect URLs listesine eklenmesi gereken adres.
 * Mobil: `teacherapp://reset-password`; web: sitenin kökü + `/reset-password`.
 */
export const getPasswordResetRedirectUrl = () => {
  const origin = webOrigin();
  return origin ? webResetRedirectUrl(origin) : Linking.createURL(RESET_PASSWORD_PATH);
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const fail = (error: unknown): { ok: false; message: string } => ({
  ok: false,
  message: getAuthErrorMessage(error),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigError === null);

  useEffect(() => {
    if (supabaseConfigError) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) return fail(error);
        return { ok: true, needsEmailConfirmation: !data.session };
      } catch (error) {
        return fail(error);
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) return { ok: true };
      if (!isNetworkError(error)) return fail(error);
    } catch (error) {
      if (!isNetworkError(error)) return fail(error);
    }
    // Sunucuya ulaşılamadı: en azından bu cihazdaki oturumu kapat.
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const recoverSession = useCallback(async (url: string | null): Promise<AuthResult> => {
    const params = parseRecoveryUrl(url);
    try {
      switch (params.kind) {
        case 'tokens': {
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          return error ? fail(error) : { ok: true };
        }
        case 'code': {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          return error ? fail(error) : { ok: true };
        }
        case 'error':
          return fail({ code: params.code, message: params.description ?? '' });
        case 'none':
          return fail({ code: 'otp_expired' });
      }
    } catch (error) {
      return fail(error);
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      recoverSession,
      updatePassword,
    }),
    [session, loading, signIn, signUp, signOut, resetPassword, recoverSession, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
