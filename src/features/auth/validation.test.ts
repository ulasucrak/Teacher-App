import { validateEmail, validateFullName, validatePassword } from './validation';

describe('auth validation', () => {
  it('validates e-mail', () => {
    expect(validateEmail('')).toMatch(/yazın/);
    expect(validateEmail('ayse@')).toMatch(/geçersiz/);
    expect(validateEmail('  ayse@okul.com ')).toBeNull();
  });

  it('requires a stronger password only when registering', () => {
    expect(validatePassword('', 'login')).toMatch(/yazın/);
    expect(validatePassword('abc', 'login')).toBeNull();
    expect(validatePassword('abc', 'register')).toMatch(/en az 8/);
    expect(validatePassword('abcdefgh', 'register')).toBeNull();
  });

  it('validates full name', () => {
    expect(validateFullName('  ')).toMatch(/yazın/);
    expect(validateFullName('Al')).not.toBeNull();
    expect(validateFullName('Ayşe Yılmaz')).toBeNull();
  });
});
