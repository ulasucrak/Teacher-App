import { avatarColors } from '@/theme';

import { getAvatarColor, getInitials } from './avatarUtils';

describe('getInitials', () => {
  it('uses first and last word', () => {
    expect(getInitials('Ayşe Yılmaz')).toBe('AY');
    expect(getInitials('Mehmet Ali Kaya')).toBe('MK');
  });

  it('uppercases with Turkish rules (i → İ, ş → Ş)', () => {
    expect(getInitials('ilkay şahin')).toBe('İŞ');
    expect(getInitials('ırmak çelik')).toBe('IÇ');
  });

  it('handles single names, extra spaces and punctuation', () => {
    expect(getInitials('  Zeynep  ')).toBe('Z');
    expect(getInitials('  Elif   Su   Öztürk ')).toBe('EÖ');
    expect(getInitials('12. Ali Veli')).toBe('AV');
  });

  it('falls back to ? for empty names', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getAvatarColor', () => {
  it('is deterministic for the same name', () => {
    expect(getAvatarColor('Ayşe Yılmaz')).toBe(getAvatarColor('Ayşe Yılmaz'));
  });

  it('ignores case and surrounding whitespace', () => {
    expect(getAvatarColor('  AYŞE   YILMAZ ')).toBe(getAvatarColor('ayşe yılmaz'));
  });

  it('always returns a palette color', () => {
    const names = ['Ali', 'Veli', 'Can', 'Deniz', 'Ece', 'Kerem', 'Selin', 'Burak', ''];
    for (const name of names) {
      expect(avatarColors).toContain(getAvatarColor(name));
    }
  });

  it('spreads names across more than one color', () => {
    const names = ['Ali', 'Veli', 'Can', 'Deniz', 'Ece', 'Kerem', 'Selin', 'Burak'];
    expect(new Set(names.map(getAvatarColor)).size).toBeGreaterThan(1);
  });
});
