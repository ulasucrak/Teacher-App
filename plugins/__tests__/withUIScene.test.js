const fs = require('fs');
const path = require('path');
const { patchAppDelegate, addSceneManifest } = require('../withUIScene');

// SDK 57 `expo prebuild` çıktısı (ios/teacherapp/AppDelegate.swift).
const fixture = fs.readFileSync(path.join(__dirname, 'AppDelegate.fixture.swift'), 'utf8');

describe('withUIScene', () => {
  it('AppDelegate pencere oluşturmaz, factory sağlayıcısı olur', () => {
    const out = patchAppDelegate(fixture);
    expect(out).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    expect(out).not.toContain('UIWindow(frame:');
    expect(out).not.toContain('startReactNative');
    // Factory ve Linking yönlendirmeleri yerinde kalır.
    expect(out).toContain('reactNativeFactory = factory');
    expect(out).toContain('RCTLinkingManager.application(app, open: url, options: options)');
    expect(out).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('idempotent', () => {
    const once = patchAppDelegate(fixture);
    expect(patchAppDelegate(once)).toBe(once);
  });

  it('şablon değişmişse hata verir', () => {
    expect(() => patchAppDelegate('class Foo {}')).toThrow(/withUIScene/);
    const noWindow = fixture.replace('window = UIWindow(frame: UIScreen.main.bounds)', '');
    expect(() => patchAppDelegate(noWindow)).toThrow(/withUIScene/);
  });

  it('Info.plist sahne manifestini EXExpoAppSceneDelegate ile ekler', () => {
    const plist = addSceneManifest({ CFBundleDevelopmentRegion: 'tr' });
    expect(plist.CFBundleDevelopmentRegion).toBe('tr');
    expect(plist.UIApplicationSceneManifest).toEqual({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    });
  });
});
