/**
 * iOS 27 SDK ile derlenen uygulamalar UIScene yaşam döngüsünü benimsemek
 * zorunda; aksi halde açılışta "UIScene life cycle is required for apps built
 * with this SDK" hatasıyla kapanıyorlar. Expo SDK 57 bunun için hazır bir
 * `ExpoAppSceneDelegate` (ObjC adı `EXExpoAppSceneDelegate`) içeriyor, ancak
 * `expo prebuild` şablonu onu henüz bağlamıyor. Bu eklenti:
 *
 * 1. Info.plist'e `UIApplicationSceneManifest` ekleyip sahne temsilcisi olarak
 *    `EXExpoAppSceneDelegate`'i tanımlar (pencereyi o oluşturur, React
 *    Native'i başlatır, URL / universal link / yaşam döngüsü olaylarını
 *    AppDelegate'e ve RCTLinkingManager'a iletir — teacherapp:// derin
 *    bağlantıları dahil).
 * 2. AppDelegate.swift'i `ExpoReactNativeFactoryProvider`'a uyumlu yapar ve
 *    `didFinishLaunching` içindeki pencere oluşturma + `startReactNative`
 *    bloğunu kaldırır (factory yine AppDelegate'te oluşturulur).
 *
 * Şablon beklenmedik biçimde değişirse prebuild sessizce geçmesin diye hata
 * fırlatır.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';
const MARKER = '// withUIScene: window is created by ExpoAppSceneDelegate';

const CLASS_DECL = /class AppDelegate: ExpoAppDelegate(?![\w,])/;
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n\s*#endif\s*\n/;

function addSceneManifest(infoPlist) {
  infoPlist.UIApplicationSceneManifest = {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [
        {
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
        },
      ],
    },
  };
  return infoPlist;
}

function patchAppDelegate(contents) {
  if (contents.includes(MARKER)) return contents;

  if (!CLASS_DECL.test(contents)) {
    throw new Error(
      'withUIScene: AppDelegate.swift içinde "class AppDelegate: ExpoAppDelegate" bulunamadı.',
    );
  }
  if (!WINDOW_BLOCK.test(contents)) {
    throw new Error(
      'withUIScene: AppDelegate.swift içinde pencere oluşturma / startReactNative bloğu bulunamadı.',
    );
  }

  return contents
    .replace(CLASS_DECL, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider')
    .replace(WINDOW_BLOCK, `    ${MARKER} (UIScene life cycle).\n`);
}

const withUIScene = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults = addSceneManifest(cfg.modResults);
    return cfg;
  });
  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withUIScene: yalnızca Swift AppDelegate destekleniyor.');
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
  return config;
};

module.exports = withUIScene;
module.exports.patchAppDelegate = patchAppDelegate;
module.exports.addSceneManifest = addSceneManifest;
