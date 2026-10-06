Pod::Spec.new do |s|
  s.name           = 'VisionTextRecognition'
  s.version        = '1.0.0'
  s.summary        = 'Apple Vision text recognition for the class-list photo import.'
  s.description    = 'Local Expo module: reads text and line positions from a photo with VNRecognizeTextRequest (iOS only).'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Vision/ImageIO sistem çerçeveleridir; ek bağımlılık (ve simülatör arm64 sorunu) yok.
  s.frameworks = 'Vision', 'ImageIO'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
