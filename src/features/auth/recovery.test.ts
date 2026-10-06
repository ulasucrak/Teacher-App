import { isRecoveryUrl, parseRecoveryUrl, webResetRedirectUrl } from './recovery';

describe('parseRecoveryUrl', () => {
  it('reads implicit-flow tokens from the hash', () => {
    expect(
      parseRecoveryUrl('teacherapp://reset-password#access_token=a.b.c&expires_in=3600&refresh_token=r1&type=recovery'),
    ).toEqual({ kind: 'tokens', accessToken: 'a.b.c', refreshToken: 'r1' });
  });

  it('reads a PKCE code from the query', () => {
    expect(parseRecoveryUrl('teacherapp://reset-password?code=abc123')).toEqual({ kind: 'code', code: 'abc123' });
  });

  it('reports link errors such as an expired link', () => {
    expect(
      parseRecoveryUrl(
        'teacherapp://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({ kind: 'error', code: 'otp_expired', description: 'Email link is invalid or has expired' });
  });

  it('returns none when nothing usable is present', () => {
    expect(parseRecoveryUrl(null)).toEqual({ kind: 'none' });
    expect(parseRecoveryUrl('teacherapp://reset-password')).toEqual({ kind: 'none' });
    expect(parseRecoveryUrl('teacherapp://reset-password#access_token=only')).toEqual({ kind: 'none' });
  });
});

describe('isRecoveryUrl', () => {
  it('accepts native and web reset links carrying tokens, a code or an error', () => {
    expect(isRecoveryUrl('teacherapp://reset-password#access_token=a&refresh_token=b')).toBe(true);
    expect(isRecoveryUrl('https://defter.example.com/reset-password?code=abc')).toBe(true);
    expect(isRecoveryUrl('http://localhost:8081/reset-password#error=access_denied')).toBe(true);
  });

  it('rejects other pages and bare reset links', () => {
    expect(isRecoveryUrl(null)).toBe(false);
    expect(isRecoveryUrl('https://defter.example.com/reset-password')).toBe(false);
    expect(isRecoveryUrl('https://defter.example.com/login?code=abc')).toBe(false);
  });
});

describe('webResetRedirectUrl', () => {
  it('appends the reset path to the site origin', () => {
    expect(webResetRedirectUrl('http://localhost:8081')).toBe('http://localhost:8081/reset-password');
    expect(webResetRedirectUrl('https://defter.example.com/')).toBe('https://defter.example.com/reset-password');
  });
});
