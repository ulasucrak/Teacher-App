/**
 * iOS 27 SDK ile derlenen uygulamalar UIScene yaşam döngüsünü benimsemek
 * zorunda; aksi halde açılışta kapanıyorlar ("UIScene life cycle is required
 * for apps built with this SDK", EXC_BREAKPOINT
 * `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
 *
 * Expo SDK 57 `expo` paketinde hazır bir `ExpoAppSceneDelegate` sınıfı var ama
 * `expo prebuild` şablonu onu bağlamıyor (SDK 58 şablonu bağlıyor). Bu eklenti
 * SDK 58 şablonunun yaptığını prebuild çıktısına uygular:
 *
 * 1. Info.plist'e `UIApplicationSceneManifest` ekler; sahne temsilcisi
 *    `$(PRODUCT_MODULE_NAME).SceneDelegate`.
 * 2. `SceneDelegate.swift` (ExpoAppSceneDelegate alt sınıfı) üretir ve Xcode
 *    hedefine ekler. Pencereyi o oluşturur, React Native'i başlatır; soğuk
 *    açılıştaki URL / universal link'i `launchOptions`'a geri koyar
 *    (`Linking.getInitialURL()`), sıcak açılıştakileri AppDelegate'in
 *    `application(_:open:options:)` / `continue:` override'larına ve
 *    `RCTLinkingManager`'a iletir — teacherapp://reset-password dahil.
 * 3. AppDelegate.swift'i `ExpoReactNativeFactoryProvider`'a uyumlu yapar ve
 *    `didFinishLaunching` içindeki pencere oluşturma + `startReactNative`
 *    bloğunu kaldırır (factory yine AppDelegate'te oluşturulur).
 *
 * İdempotenttir: AppDelegate zaten `ExpoReactNativeFactoryProvider` ise (bu
 * eklentinin önceki çalışması ya da SDK 58+ şablonu) dokunmaz; var olan sahne
 * manifestini ve `SceneDelegate.swift`'i ezmez. Şablon beklenmedik biçimde
 * değişirse prebuild sessizce geçmesin diye hata fırlatır. SDK 58'e geçince
 * app.json'dan kaldırılabilir.
 */
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const TAG = 'withUIScene';
const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';
const SCENE_DELEGATE_CLASS = '$(PRODUCT_MODULE_NAME).SceneDelegate';
const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const PROVIDER = 'ExpoReactNativeFactoryProvider';
const CLASS_DECL = /class AppDelegate: ExpoAppDelegate(?=\s*\{)/;
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n\s*#endif\s*\n/;
const REPLACEMENT_COMMENT =
  '    // withUIScene: the window is created and React Native is started by `SceneDelegate`\n' +
  '    // (ExpoAppSceneDelegate) under the scene-based life cycle required by iOS 27.\n';

function isSceneBased(contents) {
  return new RegExp(`class AppDelegate:[^{]*\\b${PROVIDER}\\b`).test(contents);
}

/** Saf fonksiyon: AppDelegate.swift içeriğini scene tabanlı hale getirir. */
function patchAppDelegate(contents) {
  if (isSceneBased(contents)) return contents;

  if (!CLASS_DECL.test(contents)) {
    throw new Error(
      `${TAG}: AppDelegate.swift beklenen şablonda değil ("class AppDelegate: ExpoAppDelegate {" bulunamadı).`,
    );
  }
  if (!WINDOW_BLOCK.test(contents)) {
    throw new Error(
      `${TAG}: AppDelegate.swift içinde pencere oluşturma / startReactNative bloğu bulunamadı.`,
    );
  }

  return contents
    .replace(CLASS_DECL, `class AppDelegate: ExpoAppDelegate, ${PROVIDER}`)
    .replace(WINDOW_BLOCK, REPLACEMENT_COMMENT);
}

/** Saf fonksiyon: sahne manifestini ekler; var olanı (ör. SDK 58 şablonu) ezmez. */
function addSceneManifest(infoPlist) {
  if (infoPlist.UIApplicationSceneManifest) return infoPlist;
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

/**
 * `ios/<proje>/SceneDelegate.swift`'i (yoksa) yazar ve (ekli değilse) Xcode
 * hedefinin derleme kaynaklarına ekler.
 */
function addSceneDelegateFile(project, projectRoot, projectName) {
  const target = path.join(projectRoot, 'ios', projectName, SCENE_DELEGATE_FILE);
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, SCENE_DELEGATE_SOURCE);
  }
  const relative = `${projectName}/${SCENE_DELEGATE_FILE}`;
  if (!project.hasFile(relative)) {
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: relative,
      groupName: projectName,
      project,
    });
  }
  return project;
}

const withUIScene = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults = addSceneManifest(cfg.modResults);
    return cfg;
  });
  config = withXcodeProject(config, (cfg) => {
    const { projectRoot, projectName } = cfg.modRequest;
    cfg.modResults = addSceneDelegateFile(cfg.modResults, projectRoot, projectName);
    return cfg;
  });
  config = withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error(`${TAG}: yalnızca Swift AppDelegate destekleniyor.`);
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
  return config;
};

module.exports = withUIScene;
module.exports.patchAppDelegate = patchAppDelegate;
module.exports.addSceneManifest = addSceneManifest;
module.exports.addSceneDelegateFile = addSceneDelegateFile;
module.exports.SCENE_DELEGATE_SOURCE = SCENE_DELEGATE_SOURCE;
