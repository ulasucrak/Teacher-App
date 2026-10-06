const { patchAppDelegate } = require('./withIosSceneLifecycle');

const LEGACY_APP_DELEGATE = `internal import Expo
@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let factory = ExpoReactNativeFactory(delegate: delegate)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('withIosSceneLifecycle.patchAppDelegate', () => {
  it('conforms to ExpoReactNativeFactoryProvider and drops the window/startReactNative block', () => {
    const out = patchAppDelegate(LEGACY_APP_DELEGATE);
    expect(out).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    expect(out).not.toContain('startReactNative');
    expect(out).not.toContain('UIWindow(frame');
    expect(out).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
  });

  it('is idempotent', () => {
    const once = patchAppDelegate(LEGACY_APP_DELEGATE);
    expect(patchAppDelegate(once)).toBe(once);
  });

  it('fails loudly on an unknown template', () => {
    expect(() => patchAppDelegate('class Foo {}')).toThrow(/withIosSceneLifecycle/);
  });
});
