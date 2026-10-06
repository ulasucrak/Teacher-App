import { screenParentHref } from './ScreenBack';

describe('screenParentHref', () => {
  it.each([
    ['/class/abc/students', '/class/abc'],
    ['/class/abc/forms', '/class/abc'],
    ['/class/abc/import', '/class/abc'],
    ['/class/abc/form/new', '/class/abc'],
    ['/class/abc/form/f1', '/class/abc'],
    ['/class/abc/form/f1/edit', '/class/abc/form/f1'],
    ['/class/abc/form/f1/session/s1', '/class/abc/form/f1'],
    ['/class/abc', '/'],
    ['/class/new', '/'],
    ['/account', '/'],
    ['/register', '/login'],
    ['/forgot-password', '/login'],
    ['/reset-password', '/login'],
    ['/class/abc/students?x=1', '/class/abc'],
    ['/class/abc/students/', '/class/abc'],
  ])('%s → %s', (pathname, parent) => {
    expect(screenParentHref(pathname)).toBe(parent);
  });

  it.each(['/', '', '/login', null, undefined])('%p has no parent', (pathname) => {
    expect(screenParentHref(pathname)).toBeNull();
  });
});
