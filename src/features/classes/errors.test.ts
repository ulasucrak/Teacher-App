import { dataMessages, toUserMessage } from './errors';

describe('toUserMessage', () => {
  it('maps network failures', () => {
    expect(toUserMessage(new TypeError('Network request failed'), 'x')).toBe(dataMessages.network);
  });

  it('maps expired sessions and missing rows', () => {
    expect(toUserMessage({ code: 'PGRST301', message: 'JWT expired' }, 'x')).toBe(dataMessages.session);
    expect(toUserMessage({ code: 'PGRST116', message: 'no rows' }, 'x')).toBe(dataMessages.notFound);
  });

  it('falls back to the action-specific message', () => {
    expect(toUserMessage({ code: '23505', message: 'duplicate' }, 'Sınıf eklenemedi.')).toBe('Sınıf eklenemedi.');
    expect(toUserMessage(null, 'Sınıf eklenemedi.')).toBe('Sınıf eklenemedi.');
  });
});
