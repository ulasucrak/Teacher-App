import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase, supabaseConfigError } from '@/lib/supabase';

import { getAuthErrorMessage } from './errors';

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
  resetPassword: (email: string) => Promise<AuthResult>;
}

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
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      return error ? fail(error) : { ok: true };
    } catch (error) {
      return fail(error);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut, resetPassword }),
    [session, loading, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
