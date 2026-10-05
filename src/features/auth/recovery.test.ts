import { parseRecoveryUrl } from './recovery';

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
