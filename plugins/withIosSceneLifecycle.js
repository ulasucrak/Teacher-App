/**
 * iOS 27, UIScene yaşam döngüsünü benimsemeyen uygulamaları açılışta durduruyor
 * (EXC_BREAKPOINT, `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
 *
 * Expo SDK 57 `expo` paketinde `ExpoAppSceneDelegate` sınıfını barındırıyor ama prebuild şablonu
 * onu bağlamıyor (SDK 58 şablonu bağlıyor). Bu plugin SDK 58 şablonunun yaptığını `expo prebuild`
 * çıktısına uygular:
 *
 *  1. Info.plist'e `UIApplicationSceneManifest` (scene delegate = `SceneDelegate`) ekler.
 *  2. `SceneDelegate.swift` (ExpoAppSceneDelegate alt sınıfı) üretir ve Xcode hedefine ekler.
 *  3. `AppDelegate.swift`'i `ExpoReactNativeFactoryProvider`'a uydurur ve window oluşturup
 *     React Native'i başlatan kısmı kaldırır (artık scene delegate yapıyor).
 *
 * Deep link'ler `ExpoAppSceneDelegate` -> `SceneEventForwarder` üzerinden AppDelegate'in
 * `application(_:open:options:)` / `continue:` override'larına ve RCTLinkingManager'a iletilir.
 *
 * SDK 58'e geçince şablon zaten scene tabanlı olacağından plugin kendiliğinden hiçbir şey yapmaz
 * (AppDelegate zaten `ExpoReactNativeFactoryProvider` ise atlanır); o zaman app.json'dan
 * kaldırılabilir.
 */
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';
const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

function appDelegatePath(projectRoot, projectName) {
  return path.join(projectRoot, 'ios', projectName, 'AppDelegate.swift');
}

function isAlreadySceneBased(contents) {
  return contents.includes('ExpoReactNativeFactoryProvider');
}

/** Saf fonksiyon: AppDelegate.swift içeriğini scene tabanlı hale getirir. Test edilebilir. */
function patchAppDelegate(contents) {
  if (isAlreadySceneBased(contents)) {
    return contents;
  }

  let result = contents;

  const classDecl = /class AppDelegate: ExpoAppDelegate \{/;
  if (!classDecl.test(result)) {
    throw new Error(
      '[withIosSceneLifecycle] AppDelegate.swift beklenen şablonda değil ("class AppDelegate: ExpoAppDelegate {" bulunamadı).'
    );
  }
  result = result.replace(classDecl, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');

  // window oluşturup React Native'i başlatan blok: artık SceneDelegate yapıyor.
  const startBlock =
    /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n[\s\S]*?\n#endif\n/;
  if (!startBlock.test(result)) {
    throw new Error(
      '[withIosSceneLifecycle] AppDelegate.swift içinde window/startReactNative bloğu bulunamadı.'
    );
  }
  result = result.replace(
    startBlock,
    '\n    // The window is created and React Native is started by `SceneDelegate` under the\n' +
      '    // scene-based life cycle (required by iOS 27).\n'
  );

  return result;
}

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.UIApplicationSceneManifest) {
      cfg.modResults.UIApplicationSceneManifest = {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: 'Default Configuration',
              UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
            },
          ],
        },
      };
    }
    return cfg;
  });

const withAppDelegatePatch = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const file = appDelegatePath(cfg.modRequest.projectRoot, cfg.modRequest.projectName);
      const original = fs.readFileSync(file, 'utf8');
      const patched = patchAppDelegate(original);
      if (patched !== original) {
        fs.writeFileSync(file, patched);
      }
      return cfg;
    },
  ]);

const withSceneDelegateFile = (config) =>
  withXcodeProject(config, (cfg) => {
    const { projectRoot, projectName } = cfg.modRequest;
    const appDelegate = appDelegatePath(projectRoot, projectName);
    // Şablon zaten scene tabanlıysa (SDK 58+) kendi SceneDelegate.swift'i vardır; dokunma.
    if (fs.existsSync(appDelegate) && isAlreadySceneBased(fs.readFileSync(appDelegate, 'utf8')) &&
        fs.existsSync(path.join(projectRoot, 'ios', projectName, SCENE_DELEGATE_FILE))) {
      return cfg;
    }

    const target = path.join(projectRoot, 'ios', projectName, SCENE_DELEGATE_FILE);
    fs.writeFileSync(target, SCENE_DELEGATE_SOURCE);

    const project = cfg.modResults;
    const relative = `${projectName}/${SCENE_DELEGATE_FILE}`;
    if (!project.hasFile(relative)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relative,
        groupName: projectName,
        project,
      });
    }
    return cfg;
  });

const withIosSceneLifecycle = (config) => {
  config = withSceneManifest(config);
  config = withAppDelegatePatch(config);
  config = withSceneDelegateFile(config);
  return config;
};

module.exports = withIosSceneLifecycle;
module.exports.patchAppDelegate = patchAppDelegate;
