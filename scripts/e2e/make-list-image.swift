// E2E testi için yapay e-Okul sınıf listesi görüntüsü (PNG) üretir.
// Kullanım: swift scripts/e2e/make-list-image.swift <çıktı.png>
// Adlar YAPAYdır; .maestro/photo-import.yaml bu listedeki adları arar.

import AppKit
import Foundation

let students: [(ordinal: Int, number: Int, name: String, female: Bool)] = [
  (1, 1101, "SELİN BAYEZİT", true),
  (2, 1102, "EMRE KARACA", false),
  (3, 1103, "ZEYNEP ARSLAN", true),
  (4, 1104, "BURAK ÖZDEMİR", false),
  (5, 1105, "ELİF ŞAHİN", true),
  (6, 1106, "MERT GÜNEŞ", false),
  (7, 1107, "DERYA ÇELİK", true),
  (8, 1108, "KEREM AYDOĞAN", false),
]

let width = 1600
let height = 1300
let trLocale = Locale(identifier: "tr_TR")

guard CommandLine.arguments.count > 1 else {
  FileHandle.standardError.write("kullanım: make-list-image.swift <çıktı.png>\n".data(using: .utf8)!)
  exit(2)
}
let output = URL(fileURLWithPath: CommandLine.arguments[1])

let context = CGContext(
  data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
context.setFillColor(NSColor.white.cgColor)
context.fill(CGRect(x: 0, y: 0, width: width, height: height))
context.translateBy(x: 0, y: CGFloat(height))
context.scaleBy(x: 1, y: -1)
NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)

let body = NSFont(name: "Helvetica", size: 34) ?? NSFont.systemFont(ofSize: 34)
let bold = NSFont(name: "Helvetica-Bold", size: 34) ?? NSFont.boldSystemFont(ofSize: 34)

func draw(_ text: String, _ x: CGFloat, _ y: CGFloat, _ font: NSFont) {
  (text as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [.font: font, .foregroundColor: NSColor.black])
}

func line(_ x0: CGFloat, _ y0: CGFloat, _ x1: CGFloat, _ y1: CGFloat) {
  let path = NSBezierPath()
  path.move(to: NSPoint(x: x0, y: y0))
  path.line(to: NSPoint(x: x1, y: y1))
  path.lineWidth = 2
  NSColor(white: 0.15, alpha: 1).setStroke()
  path.stroke()
}

func centered(_ text: String, _ y: CGFloat) {
  let w = (text as NSString).size(withAttributes: [.font: bold]).width
  draw(text, (CGFloat(width) - w) / 2, y, bold)
}

var y: CGFloat = 70
for header in ["T.C.", "YAPAY DENEME ORTAOKULU", "6/A SINIFI ÖĞRENCİ LİSTESİ"] {
  centered(header, y)
  y += 60
}
y += 30
let columns: [(String, CGFloat)] = [("S.No", 100), ("Okul No", 230), ("Adı Soyadı", 430), ("Cinsiyeti", 1200)]
let right: CGFloat = 1500
let rowHeight: CGFloat = 64
let top = y
line(100, y, right, y)
for (title, x) in columns { draw(title, x + 14, y + 12, bold) }
y += rowHeight
line(100, y, right, y)
for s in students {
  let cells = ["\(s.ordinal)", "\(s.number)", s.name, (s.female ? "Kız" : "Erkek").uppercased(with: trLocale)]
  for (cell, column) in zip(cells, columns) { draw(cell, column.1 + 14, y + 12, body) }
  y += rowHeight
  line(100, y, right, y)
}
for x in columns.map(\.1) + [right] { line(x, top, x, y) }

NSGraphicsContext.current = nil
let image = context.makeImage()!
let rep = NSBitmapImageRep(cgImage: image)
try rep.representation(using: .png, properties: [:])!.write(to: output)
print(output.path)
