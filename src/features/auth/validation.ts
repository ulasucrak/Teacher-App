/** Giriş/kayıt formu doğrulaması. Her fonksiyon hata metni ya da null döndürür. */

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'E-posta adresinizi yazın.';
  if (!EMAIL_RE.test(email)) return 'E-posta adresi geçersiz. "ad@okul.com" biçiminde yazın.';
  return null;
}

export function validatePassword(value: string, mode: 'login' | 'register' = 'login'): string | null {
  if (!value) return 'Şifrenizi yazın.';
  if (mode === 'register' && value.length < MIN_PASSWORD_LENGTH) {
    return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  }
  return null;
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Adınızı ve soyadınızı yazın.';
  if (name.length < 3) return 'Adınızı ve soyadınızı tam yazın.';
  return null;
}
