import { authMessages, classifyAuthError, getAuthErrorMessage } from './errors';

describe('classifyAuthError', () => {
  it('maps Supabase error codes', () => {
    expect(classifyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'invalidCredentials',
    );
    expect(classifyAuthError({ code: 'email_not_confirmed' })).toBe('emailNotConfirmed');
    expect(classifyAuthError({ code: 'weak_password' })).toBe('weakPassword');
    expect(classifyAuthError({ code: 'user_already_exists' })).toBe('userAlreadyExists');
    expect(classifyAuthError({ code: 'over_email_send_rate_limit' })).toBe('rateLimit');
  });

  it('falls back to message matching when there is no code', () => {
    expect(classifyAuthError({ message: 'Invalid login credentials' })).toBe('invalidCredentials');
    expect(classifyAuthError({ message: 'Email not confirmed' })).toBe('emailNotConfirmed');
    expect(classifyAuthError({ message: 'Password should be at least 6 characters.' })).toBe('weakPassword');
    expect(classifyAuthError({ message: 'User already registered' })).toBe('userAlreadyExists');
  });

  it('detects network failures', () => {
    expect(classifyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 })).toBe(
      'network',
    );
    expect(classifyAuthError(new TypeError('Network request failed'))).toBe('network');
    expect(classifyAuthError('Network request failed')).toBe('network');
  });

  it('treats HTTP 429 as rate limit', () => {
    expect(classifyAuthError({ status: 429, message: 'whatever' })).toBe('rateLimit');
  });

  it('returns unknown for anything else', () => {
    expect(classifyAuthError(null)).toBe('unknown');
    expect(classifyAuthError(undefined)).toBe('unknown');
    expect(classifyAuthError({ message: 'Something odd' })).toBe('unknown');
    expect(classifyAuthError(42)).toBe('unknown');
  });
});

describe('getAuthErrorMessage', () => {
  it('returns Turkish copy that says what happened and how to fix it', () => {
    const message = getAuthErrorMessage({ code: 'invalid_credentials' });
    expect(message).toBe(authMessages.invalidCredentials);
    expect(message).toMatch(/hatalı/);
    expect(message).toMatch(/tekrar deneyin/);
  });

  it('never returns an empty string', () => {
    for (const input of [null, {}, { code: 'nope' }, new Error('x')]) {
      expect(getAuthErrorMessage(input).length).toBeGreaterThan(10);
    }
  });
});
