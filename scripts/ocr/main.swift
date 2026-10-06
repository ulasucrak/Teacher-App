// OCR doğruluk ölçümü için gerçekçi sınıf listesi görüntüleri üretir ve Apple Vision ile okur.
//
// Çalıştırma (macOS, ek bağımlılık yok): scripts/ocr/generate-fixtures.sh
// Betik bu dosyayı modules/vision-text-recognition/ios/VisionTextReader.swift ile birlikte
// derler; böylece fikstürler uygulamadaki Vision isteğinin AYNISIYLA okunur (.accurate,
// tr-TR, dil düzeltmesi açık — src/features/ocr/vision.ts VISION_OPTIONS ile aynı).
//
// Çıktı (src/features/ocr/__fixtures__/accuracy/):
//   <ad>.json        yerel modülün döndürdüğü biçim { width, height, observations[] }
//   <ad>.truth.json  doğru liste { description, students: [{ number, fullName }] }
// Adlar YAPAY: aşağıdaki ad/soyad havuzlarından tohumlu rastgele birleştirilir; gerçek öğrenci yok.
//
// Argümanlar: [çıktı klasörü] [--images <klasör>] (görüntüleri incelemek için JPEG olarak saklar)

import AppKit
import CoreImage
import Foundation

// MARK: - Tohumlu rastgele sayı (SplitMix64): her çalıştırmada aynı görüntüler

struct SeededRandom {
  private var state: UInt64
  init(seed: UInt64) { state = seed }

  mutating func next() -> UInt64 {
    state &+= 0x9E37_79B9_7F4A_7C15
    var z = state
    z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
    z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
    return z ^ (z >> 31)
  }

  mutating func unit() -> Double { Double(next() >> 11) / Double(1 << 53) }
  mutating func range(_ lo: Double, _ hi: Double) -> Double { lo + (hi - lo) * unit() }
  mutating func int(_ lo: Int, _ hi: Int) -> Int { lo + Int(next() % UInt64(hi - lo + 1)) }
  mutating func pick<T>(_ items: [T]) -> T { items[int(0, items.count - 1)] }
}

// MARK: - Yapay ad havuzları (Türkçe karakter yoğun; birkaçı bilerek sözlük dışı)

let givenNames = [
  "Ayşe", "Fatma", "Zeynep", "Elif", "Merve", "Büşra", "Şeyma", "Gülşen", "Özlem", "Çiğdem",
  "İrem", "İpek", "İlayda", "Işıl", "Ilgaz", "Ilgın", "Nazlı", "Aslı", "Sıla", "Pınar",
  "Yağmur", "Gökçe", "Damla", "Ecrin", "Eylül", "Öykü", "Zümra", "Çağla", "Şule", "Gözde",
  "Hülya", "Dilşad", "Nur", "Ece", "Defne", "Asya", "Duru", "Nehir", "Ebrar", "Rümeysa",
  "Mehmet", "Mustafa", "Ahmet", "Ömer", "Emre", "Burak", "Oğuz", "Oğuzhan", "Doğukan", "Çağrı",
  "İbrahim", "İsmail", "İlker", "İsmet", "İhsan", "Yiğit", "Uğur", "Tuğrul", "Gökhan", "Görkem",
  "Barış", "Kıvanç", "Yağız", "Çınar", "Fırat", "Tarık", "Batıkan", "Ümit", "Ünal", "Şükrü",
  "Hüseyin", "Süleyman", "Halil", "Kerem", "Berk", "Efe", "Arda", "Alperen", "Furkan", "Enes",
  "Mert", "Eren", "Can", "Deniz", "Selim", "Serkan", "Tolga", "Onur", "Doğan", "Taha",
  "Yusuf", "Miraç", "Aras", "Toprak", "Göktuğ", "Erdoğan", "Selin", "Melis", "Ceren", "Ecem",
]

let surnames = [
  "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk", "Aydın", "Özdemir",
  "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek",
  "Polat", "Özer", "Erdoğan", "Güneş", "Aktaş", "Yalçın", "Güler", "Bozkurt", "Işık", "Akgül",
  "Çakır", "Karataş", "Sarı", "Özgür", "Ünal", "Türkmen", "Gündoğdu", "Bulut", "Keskin", "Güzel",
  "Tekin", "Uçar", "Çiftçi", "Bağcı", "Ağaoğlu", "Karaağaç", "Dağdelen", "Gökçe", "Uğurlu", "Söğüt",
  "Eroğlu", "Akın", "Çalışkan", "Başaran", "Taşdemir", "Coşkun", "Duman", "Özçelik", "Yüksel", "Ateş",
  "Kılınç", "Altıntaş", "Şen", "Ekinci", "İnce", "İpek", "İnan", "İlhan", "Ilıcak", "Öğüt",
  "Gökçeoğlu", "Üçışık", "Şimşekler", "Çağlayık", "Dönmez", "Gümüş", "Özbek", "Çınar", "Sönmez", "Tunç",
]

let teacherNames = ["Zehra Kalaycıoğlu", "Hüsnü Ötkün", "Gülay Şanverdi"]

// MARK: - Fikstür tanımları

enum Layout: String {
  /// S.No | Okul No | Adı Soyadı | Cinsiyet (e-Okul sınıf listesi)
  case eokulA
  /// S.No | Adı Soyadı | Okul No
  case eokulB
  /// "12. Ali Veli" — elle/daktiloyla yazılmış, sıra numaralı düz liste
  case plainOrdinal
  /// "512 Ali Veli" — okul numaralı düz liste
  case plainSchoolNo
}

struct Degrade {
  var rotation: Double = 0  // derece, + saat yönünün tersi
  var perspective: Double = 0  // köşe kayması, genişliğin oranı
  var blur: Double = 0  // Gauss yarıçapı (px)
  var contrast: Double = 1
  var brightness: Double = 0
  var noise: Double = 0  // 0...1 gren yoğunluğu
  var shading: Double = 0  // 0...1 köşelere doğru kararma (düzensiz ışık)
  var jpeg: Double = 0.92
}

struct Fixture {
  let name: String
  let description: String
  let layout: Layout
  let upper: Bool
  let font: String
  let size: CGFloat
  let rows: Int
  let degrade: Degrade
  let seed: UInt64
  /// Satır başına rastgele kayma/boyut (el yazısı benzeri)
  var jitter: Bool = false
}

let fixtures: [Fixture] = [
  Fixture(name: "a-helvetica-26-clean", description: "e-Okul A, Helvetica 26, düz tarama", layout: .eokulA, upper: true,
          font: "Helvetica", size: 26, rows: 30, degrade: Degrade(), seed: 1),
  Fixture(name: "a-arial-24-rot3", description: "e-Okul A, Arial 24, +3° eğik, hafif bulanık", layout: .eokulA, upper: true,
          font: "ArialMT", size: 24, rows: 32, degrade: Degrade(rotation: 3, blur: 0.8, shading: 0.25, jpeg: 0.7), seed: 2),
  Fixture(name: "a-times-28-rot-5-title", description: "e-Okul A, Times 28 başlık düzeni, −5° eğik", layout: .eokulA, upper: false,
          font: "TimesNewRomanPSMT", size: 28, rows: 26, degrade: Degrade(rotation: -5, blur: 0.6, jpeg: 0.7), seed: 3),
  Fixture(name: "b-verdana-24-persp", description: "e-Okul B, Verdana 24, perspektif + 2° eğik", layout: .eokulB, upper: true,
          font: "Verdana", size: 24, rows: 30, degrade: Degrade(rotation: 2, perspective: 0.04, blur: 0.7, shading: 0.3, jpeg: 0.6), seed: 4),
  Fixture(name: "b-helvetica-22-blur-lowcontrast", description: "e-Okul B, Helvetica 22, bulanık, düşük karşıtlık", layout: .eokulB, upper: true,
          font: "Helvetica", size: 22, rows: 34, degrade: Degrade(blur: 1.6, contrast: 0.5, brightness: 0.12, jpeg: 0.6), seed: 5),
  Fixture(name: "a-courier-26-noise-jpeg", description: "e-Okul A, Courier 26, gren + yoğun JPEG", layout: .eokulA, upper: true,
          font: "Courier", size: 26, rows: 28, degrade: Degrade(rotation: -1.5, blur: 0.5, noise: 0.35, jpeg: 0.3), seed: 6),
  Fixture(name: "a-arial-20-35rows-rot4", description: "e-Okul A, Arial 20, 35 satır, +4° eğik", layout: .eokulA, upper: true,
          font: "ArialMT", size: 20, rows: 35, degrade: Degrade(rotation: 4, blur: 0.6, shading: 0.2, jpeg: 0.6), seed: 7),
  Fixture(name: "b-georgia-30-title-rot-3", description: "e-Okul B, Georgia 30 başlık düzeni, −3° eğik, düşük karşıtlık", layout: .eokulB, upper: false,
          font: "Georgia", size: 30, rows: 22, degrade: Degrade(rotation: -3, blur: 0.8, contrast: 0.6, brightness: 0.1, jpeg: 0.6), seed: 8),
  Fixture(name: "plain-noteworthy-34", description: "Düz sıra numaralı liste, Noteworthy 34 (el yazısı benzeri)", layout: .plainOrdinal, upper: false,
          font: "Noteworthy-Light", size: 34, rows: 24, degrade: Degrade(rotation: 1.5, blur: 0.6, shading: 0.2, jpeg: 0.7), seed: 9, jitter: true),
  Fixture(name: "plain-bradley-32-rot-2", description: "Okul numaralı düz liste, Bradley Hand 32 (el yazısı benzeri), −2°", layout: .plainSchoolNo, upper: false,
          font: "BradleyHandITCTT-Bold", size: 32, rows: 22, degrade: Degrade(rotation: -2, blur: 0.5, jpeg: 0.7), seed: 10, jitter: true),
  Fixture(name: "a-helveticaneue-24-photo", description: "e-Okul A, Helvetica Neue 24, fotoğraf: −4°, perspektif, bulanık, gren, gölge", layout: .eokulA, upper: true,
          font: "HelveticaNeue", size: 24, rows: 33, degrade: Degrade(rotation: -4, perspective: 0.03, blur: 1.1, contrast: 0.7, brightness: 0.05, noise: 0.25, shading: 0.4, jpeg: 0.45), seed: 11),
  Fixture(name: "b-arial-26-rot5", description: "e-Okul B, Arial 26, +5° eğik", layout: .eokulB, upper: true,
          font: "ArialMT", size: 26, rows: 30, degrade: Degrade(rotation: 5, blur: 0.7, jpeg: 0.65), seed: 12),
]

// MARK: - Liste içeriği

struct Student {
  let ordinal: Int
  let number: Int
  let fullName: String
  let female: Bool
}

let trLocale = Locale(identifier: "tr_TR")

func makeStudents(count: Int, rng: inout SeededRandom) -> [Student] {
  var numbers = Set<Int>()
  while numbers.count < count { numbers.insert(rng.int(rng.unit() < 0.15 ? 20 : 100, 2400)) }
  var names = Set<String>()
  var students: [Student] = []
  for (index, number) in numbers.sorted().enumerated() {
    var name: String
    repeat {
      let given = rng.unit() < 0.12 ? "\(rng.pick(givenNames)) \(rng.pick(givenNames))" : rng.pick(givenNames)
      name = "\(given) \(rng.pick(surnames))"
    } while names.contains(name)
    names.insert(name)
    students.append(Student(ordinal: index + 1, number: number, fullName: name, female: rng.unit() < 0.5))
  }
  return students
}

// MARK: - Çizim

let pageWidth = 2000
let pageHeight = 2828

func font(_ name: String, _ size: CGFloat) -> NSFont {
  NSFont(name: name, size: size) ?? NSFont.systemFont(ofSize: size)
}

func draw(_ text: String, x: CGFloat, y: CGFloat, font: NSFont, color: NSColor = .black) {
  (text as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [.font: font, .foregroundColor: color])
}

func textWidth(_ text: String, _ font: NSFont) -> CGFloat {
  (text as NSString).size(withAttributes: [.font: font]).width
}

func line(_ x0: CGFloat, _ y0: CGFloat, _ x1: CGFloat, _ y1: CGFloat, width: CGFloat = 2) {
  let path = NSBezierPath()
  path.move(to: NSPoint(x: x0, y: y0))
  path.line(to: NSPoint(x: x1, y: y1))
  path.lineWidth = width
  NSColor(white: 0.15, alpha: 1).setStroke()
  path.stroke()
}

func renderPage(_ fixture: Fixture, students: [Student], rng: inout SeededRandom) -> CGImage {
  let context = CGContext(
    data: nil, width: pageWidth, height: pageHeight, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.setFillColor(NSColor.white.cgColor)
  context.fill(CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight))
  context.translateBy(x: 0, y: CGFloat(pageHeight))
  context.scaleBy(x: 1, y: -1)
  NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
  defer { NSGraphicsContext.current = nil }

  let caps: (String) -> String = { fixture.upper ? $0.uppercased(with: trLocale) : $0 }
  let body = font(fixture.font, fixture.size)
  let bold = NSFontManager.shared.convert(body, toHaveTrait: .boldFontMask)
  let small = font(fixture.font, fixture.size * 0.8)
  let center: (String, CGFloat, NSFont) -> Void = { text, y, f in
    draw(text, x: (CGFloat(pageWidth) - textWidth(text, f)) / 2, y: y, font: f)
  }
  let teacher = rng.pick(teacherNames)
  let females = students.filter(\.female).count
  var y: CGFloat = 130

  switch fixture.layout {
  case .eokulA, .eokulB:
    for header in ["T.C.", "ÇANKAYA KAYMAKAMLIĞI", "YAPAY DENEME ORTAOKULU", "2025-2026 EĞİTİM ÖĞRETİM YILI 7/A SINIFI ÖĞRENCİ LİSTESİ"] {
      center(header, y, bold)
      y += fixture.size * 1.8
    }
    y += fixture.size
    let columns: [(title: String, x: CGFloat)] = fixture.layout == .eokulA
      ? [("S.No", 140), ("Okul No", 270), ("Adı Soyadı", 490), ("Cinsiyeti", 1500)]
      : [("S.No", 140), ("Adı Soyadı", 270), ("Okul No", 1440)]
    let tableRight: CGFloat = 1860
    let rowHeight = fixture.size * 1.75
    let tableTop = y
    line(columns[0].x, y, tableRight, y)
    for column in columns { draw(column.title, x: column.x + 14, y: y + rowHeight * 0.18, font: bold) }
    y += rowHeight
    line(columns[0].x, y, tableRight, y)
    for student in students {
      let cells: [String] = fixture.layout == .eokulA
        ? ["\(student.ordinal)", "\(student.number)", caps(student.fullName), caps(student.female ? "Kız" : "Erkek")]
        : ["\(student.ordinal)", caps(student.fullName), "\(student.number)"]
      for (cell, column) in zip(cells, columns) { draw(cell, x: column.x + 14, y: y + rowHeight * 0.18, font: body) }
      y += rowHeight
      line(columns[0].x, y, tableRight, y, width: 1.5)
    }
    for x in columns.map(\.x) + [tableRight] { line(x, tableTop, x, y, width: 1.5) }
    y += fixture.size * 1.5
    draw("Erkek: \(students.count - females)    Kız: \(females)    Toplam: \(students.count)", x: 140, y: y, font: small)
    y += fixture.size * 1.6
    draw("Sınıf Öğretmeni: \(teacher)", x: 140, y: y, font: small)
    draw("Okul Müdürü", x: 1500, y: y, font: small)
    draw("06.10.2025", x: 140, y: CGFloat(pageHeight) - 140, font: small)
    draw("Sayfa 1 / 1", x: 1650, y: CGFloat(pageHeight) - 140, font: small)

  case .plainOrdinal, .plainSchoolNo:
    draw("7/A Sınıf Listesi", x: 160, y: y, font: font(fixture.font, fixture.size * 1.2))
    y += fixture.size * 3
    let rowHeight = fixture.size * 2.2
    for student in students {
      let jx = fixture.jitter ? CGFloat(rng.range(-14, 14)) : 0
      let jy = fixture.jitter ? CGFloat(rng.range(-5, 5)) : 0
      let size = fixture.jitter ? fixture.size * CGFloat(rng.range(0.92, 1.08)) : fixture.size
      let lead = fixture.layout == .plainOrdinal ? "\(student.ordinal). " : "\(student.number)  "
      draw(lead + caps(student.fullName), x: 180 + jx, y: y + jy, font: font(fixture.font, size))
      y += rowHeight
    }
    y += fixture.size
    draw("Öğretmen: \(teacher)", x: 180, y: y, font: small)
  }

  return context.makeImage()!
}

// MARK: - Fotoğraf bozulmaları (CoreImage)

func degrade(_ image: CGImage, _ d: Degrade, rng: inout SeededRandom) -> CGImage {
  let rect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
  var output = CIImage(cgImage: image)

  if d.perspective > 0 {
    let w = Double(pageWidth), h = Double(pageHeight), p = d.perspective
    let jitter = { (rng: inout SeededRandom) in rng.range(0, p) }
    let filter = CIFilter(name: "CIPerspectiveTransform")!
    filter.setValue(output, forKey: kCIInputImageKey)
    filter.setValue(CIVector(x: w * jitter(&rng), y: h * (1 - jitter(&rng) * 0.5)), forKey: "inputTopLeft")
    filter.setValue(CIVector(x: w * (1 - jitter(&rng)), y: h * (1 - jitter(&rng) * 0.5)), forKey: "inputTopRight")
    filter.setValue(CIVector(x: w * (1 - jitter(&rng) * 0.3), y: h * jitter(&rng) * 0.5), forKey: "inputBottomRight")
    filter.setValue(CIVector(x: w * jitter(&rng) * 0.3, y: h * jitter(&rng) * 0.5), forKey: "inputBottomLeft")
    output = filter.outputImage!
  }

  if d.rotation != 0 {
    let radians = d.rotation * .pi / 180
    let transform = CGAffineTransform(translationX: rect.midX, y: rect.midY)
      .rotated(by: radians)
      .translatedBy(x: -rect.midX, y: -rect.midY)
    output = output.transformed(by: transform)
  }

  // Kâğıdın arkasındaki masa (döndürmede açılan köşeler).
  let table = CIImage(color: CIColor(red: 0.55, green: 0.5, blue: 0.45)).cropped(to: rect)
  output = output.composited(over: table).cropped(to: rect)

  if d.shading > 0 {
    let gradient = CIFilter(name: "CIRadialGradient")!
    gradient.setValue(CIVector(x: rect.width * rng.range(0.3, 0.7), y: rect.height * rng.range(0.3, 0.7)), forKey: "inputCenter")
    gradient.setValue(rect.width * 0.35, forKey: "inputRadius0")
    gradient.setValue(rect.width * 1.1, forKey: "inputRadius1")
    gradient.setValue(CIColor(red: 1, green: 1, blue: 1), forKey: "inputColor0")
    let dark = 1 - d.shading * 0.6
    gradient.setValue(CIColor(red: dark, green: dark * 0.98, blue: dark * 0.94), forKey: "inputColor1")
    output = output.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: gradient.outputImage!.cropped(to: rect)])
  }

  if d.contrast != 1 || d.brightness != 0 {
    output = output.applyingFilter("CIColorControls", parameters: [
      kCIInputContrastKey: d.contrast, kCIInputBrightnessKey: d.brightness, kCIInputSaturationKey: 1,
    ])
  }

  if d.blur > 0 {
    output = output.clampedToExtent().applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: d.blur]).cropped(to: rect)
  }

  if d.noise > 0 {
    let noise = CIFilter(name: "CIRandomGenerator")!.outputImage!
      .transformed(by: CGAffineTransform(translationX: CGFloat(rng.range(0, 500)), y: CGFloat(rng.range(0, 500))))
      .cropped(to: rect)
      .applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 1, y: 0, z: 0, w: 0),
        "inputBVector": CIVector(x: 1, y: 0, z: 0, w: 0),
        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: d.noise * 0.35),
      ])
    output = noise.composited(over: output).cropped(to: rect)
  }

  let context = CIContext(options: [.useSoftwareRenderer: false])
  return context.createCGImage(output, from: rect)!
}

func jpegData(_ image: CGImage, quality: Double) -> Data {
  NSBitmapImageRep(cgImage: image).representation(using: .jpeg, properties: [.compressionFactor: quality])!
}

// MARK: - JSON (yerel modülün çıktı biçimi; sayılar 5 basamağa yuvarlanır)

func number(_ value: Double) -> String {
  var text = String(format: "%.5f", value)
  while text.hasSuffix("0") { text.removeLast() }
  if text.hasSuffix(".") { text.removeLast() }
  return text == "-0" ? "0" : text
}

func quoted(_ value: String) -> String {
  let data = try! JSONSerialization.data(withJSONObject: [value], options: [.withoutEscapingSlashes])
  let text = String(data: data, encoding: .utf8)!
  return String(text.dropFirst().dropLast())
}

func observationJSON(_ o: VisionTextObservation) -> String {
  let candidates = o.candidates.map { "{\"confidence\":\(number(Double($0.confidence))),\"text\":\(quoted($0.text))}" }
  let corners = o.corners.map { "{\"x\":\(number($0.x)),\"y\":\(number($0.y))}" }
  return "{\"candidates\":[\(candidates.joined(separator: ","))],\"confidence\":\(number(Double(o.confidence))),"
    + "\"corners\":[\(corners.joined(separator: ","))],\"height\":\(number(o.height)),\"text\":\(quoted(o.text)),"
    + "\"width\":\(number(o.width)),\"x\":\(number(o.x)),\"y\":\(number(o.y))}"
}

func resultJSON(_ result: VisionTextResult) -> String {
  let lines = result.observations.map { "    " + observationJSON($0) }
  return "{\n  \"height\": \(result.height),\n  \"width\": \(result.width),\n  \"observations\": [\n"
    + lines.joined(separator: ",\n") + "\n  ]\n}\n"
}

func truthJSON(_ fixture: Fixture, _ students: [Student]) -> String {
  let rows = students.map { s -> String in
    let number = fixture.layout == .plainOrdinal ? "null" : "\"\(s.number)\""
    return "    {\"number\": \(number), \"fullName\": \(quoted(s.fullName))}"
  }
  return "{\n  \"description\": \(quoted(fixture.description)),\n  \"students\": [\n" + rows.joined(separator: ",\n") + "\n  ]\n}\n"
}

// MARK: - Ana akış

var arguments = Array(CommandLine.arguments.dropFirst())
var imagesDirectory: URL?
if let flag = arguments.firstIndex(of: "--images"), flag + 1 < arguments.count {
  imagesDirectory = URL(fileURLWithPath: arguments[flag + 1], isDirectory: true)
  arguments.removeSubrange(flag...(flag + 1))
}
let outputDirectory = URL(fileURLWithPath: arguments.first ?? "src/features/ocr/__fixtures__/accuracy", isDirectory: true)
let fileManager = FileManager.default
try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
if let imagesDirectory { try fileManager.createDirectory(at: imagesDirectory, withIntermediateDirectories: true) }
let scratch = fileManager.temporaryDirectory.appendingPathComponent("ocr-fixtures-\(ProcessInfo.processInfo.processIdentifier)")
try fileManager.createDirectory(at: scratch, withIntermediateDirectories: true)

for fixture in fixtures {
  var rng = SeededRandom(seed: fixture.seed)
  let students = makeStudents(count: fixture.rows, rng: &rng)
  let page = renderPage(fixture, students: students, rng: &rng)
  let photo = degrade(page, fixture.degrade, rng: &rng)
  let imageURL = (imagesDirectory ?? scratch).appendingPathComponent("\(fixture.name).jpg")
  try jpegData(photo, quality: fixture.degrade.jpeg).write(to: imageURL)

  // Uygulamadaki istekle aynı: VISION_OPTIONS (src/features/ocr/vision.ts).
  let result = try VisionTextReader.recognize(uri: imageURL.absoluteString, languages: ["tr-TR"], usesLanguageCorrection: true)
  try resultJSON(result).write(to: outputDirectory.appendingPathComponent("\(fixture.name).json"), atomically: true, encoding: .utf8)
  try truthJSON(fixture, students).write(to: outputDirectory.appendingPathComponent("\(fixture.name).truth.json"), atomically: true, encoding: .utf8)
  print("\(fixture.name): \(result.observations.count) satır okundu")
}
try? fileManager.removeItem(at: scratch)
