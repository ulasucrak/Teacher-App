#!/usr/bin/env bash
# OCR doğruluk fikstürlerini yeniden üretir (yalnızca macOS; Xcode komut satırı araçları yeterli).
# Uygulamadaki Vision kodu (VisionTextReader.swift) ile birlikte derlenir: ölçüm aynı istekle yapılır.
#
#   scripts/ocr/generate-fixtures.sh                 # src/features/ocr/__fixtures__/accuracy/
#   scripts/ocr/generate-fixtures.sh --images /tmp/x # üretilen görüntüleri de sakla
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
build="$(mktemp -d)"
trap 'rm -rf "$build"' EXIT

swiftc -O \
  "$root/modules/vision-text-recognition/ios/VisionTextReader.swift" \
  "$root/scripts/ocr/main.swift" \
  -o "$build/generate-ocr-fixtures"

cd "$root"
"$build/generate-ocr-fixtures" "src/features/ocr/__fixtures__/accuracy" "$@"
