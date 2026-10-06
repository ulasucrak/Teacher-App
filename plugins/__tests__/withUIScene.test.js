const fs = require('fs');
const os = require('os');
const path = require('path');
const { IOSConfig } = require('expo/config-plugins');
const {
  patchAppDelegate,
  addSceneManifest,
  addSceneDelegateFile,
  SCENE_DELEGATE_SOURCE,
} = require('../withUIScene');

// SDK 57 `expo prebuild` çıktısı (ios/teacherapp/AppDelegate.swift).
const fixture = fs.readFileSync(path.join(__dirname, 'AppDelegate.fixture.swift'), 'utf8');

describe('withUIScene.patchAppDelegate', () => {
  it('AppDelegate pencere oluşturmaz, factory sağlayıcısı olur', () => {
    const out = patchAppDelegate(fixture);
    expect(out).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    expect(out).not.toContain('UIWindow(frame:');
    expect(out).not.toContain('startReactNative');
    // Factory ve Linking / universal link yönlendirmeleri yerinde kalır.
    expect(out).toContain('reactNativeFactory = factory');
    expect(out).toContain('RCTLinkingManager.application(app, open: url, options: options)');
    expect(out).toContain('RCTLinkingManager.application(application, continue: userActivity');
    expect(out).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('idempotent', () => {
    const once = patchAppDelegate(fixture);
    expect(patchAppDelegate(once)).toBe(once);
  });

  it('zaten scene tabanlı AppDelegate’e (SDK 58 şablonu) dokunmaz', () => {
    const sdk58 = fixture.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
    expect(patchAppDelegate(sdk58)).toBe(sdk58);
  });

  it('şablon değişmişse hata verir', () => {
    expect(() => patchAppDelegate('class Foo {}')).toThrow(/withUIScene/);
    const noWindow = fixture.replace('window = UIWindow(frame: UIScreen.main.bounds)', '');
    expect(() => patchAppDelegate(noWindow)).toThrow(/withUIScene/);
    const otherBase = fixture.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, SomethingElse {',
    );
    expect(() => patchAppDelegate(otherBase)).toThrow(/withUIScene/);
  });
});

describe('withUIScene.addSceneManifest', () => {
  it('Info.plist sahne manifestini SceneDelegate ile ekler', () => {
    const plist = addSceneManifest({ CFBundleDevelopmentRegion: 'tr' });
    expect(plist.CFBundleDevelopmentRegion).toBe('tr');
    expect(plist.UIApplicationSceneManifest).toEqual({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    });
  });

  it('var olan manifesti ezmez ve idempotent', () => {
    const existing = { UIApplicationSupportsMultipleScenes: true };
    expect(addSceneManifest({ UIApplicationSceneManifest: existing }).UIApplicationSceneManifest).toBe(
      existing,
    );
    const once = addSceneManifest({});
    expect(addSceneManifest(once)).toEqual(once);
  });
});

describe('withUIScene.addSceneDelegateFile', () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'withUIScene-'));
    fs.mkdirSync(path.join(root, 'ios', 'teacherapp'), { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('SceneDelegate.swift’i ExpoAppSceneDelegate alt sınıfı olarak yazar ve hedefe bir kez ekler', () => {
    const files = new Set();
    const project = { hasFile: (p) => files.has(p) };
    const add = jest
      .spyOn(IOSConfig.XcodeUtils, 'addBuildSourceFileToGroup')
      .mockImplementation(({ filepath }) => files.add(filepath));

    addSceneDelegateFile(project, root, 'teacherapp');
    addSceneDelegateFile(project, root, 'teacherapp');

    const written = fs.readFileSync(path.join(root, 'ios', 'teacherapp', 'SceneDelegate.swift'), 'utf8');
    expect(written).toBe(SCENE_DELEGATE_SOURCE);
    expect(written).toContain('@objc(SceneDelegate)');
    expect(written).toContain('class SceneDelegate: ExpoAppSceneDelegate');
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ filepath: 'teacherapp/SceneDelegate.swift', groupName: 'teacherapp' }),
    );
  });

  it('var olan SceneDelegate.swift’i (SDK 58 şablonu) ezmez', () => {
    const file = path.join(root, 'ios', 'teacherapp', 'SceneDelegate.swift');
    fs.writeFileSync(file, '// custom');
    const add = jest.spyOn(IOSConfig.XcodeUtils, 'addBuildSourceFileToGroup');
    addSceneDelegateFile({ hasFile: () => true }, root, 'teacherapp');
    expect(fs.readFileSync(file, 'utf8')).toBe('// custom');
    expect(add).not.toHaveBeenCalled();
  });
});
