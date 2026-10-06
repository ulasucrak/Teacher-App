#!/usr/bin/env bash
# Maestro uçtan uca testleri (iOS simülatörü). Ayrıntı: README "E2E testleri (Maestro)".
#
# Ön koşul: uygulama simülatörde kurulu (npx expo run:ios --device <UDID> --port 8087) ve Metro
# çalışıyor (npx expo start --dev-client --port 8087). Uygulama GERÇEK Supabase projesine bağlanır.
#
# Ortam değişkenleri:
#   DEVICE      simülatör UDID'i (varsayılan: açık olan simülatör)
#   OUT_DIR     ekran görüntüleri ve hata ayıklama çıktısı (varsayılan: $TMPDIR/sinif-defteri-e2e)
#   EMAIL / PASSWORD   akışların kullandığı test hesabı (varsayılan: e2e+u02@sinifdefteri.test / Test1234!)
#   FLOWS       yalnızca bazı akışlar: "auth wizard" (varsayılan: hepsi, .maestro/config.yaml sırasıyla)
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
app_id="com.ulas.teacherapp"
device="${DEVICE:-$(xcrun simctl list devices booted | grep -Eo '[0-9A-F-]{36}' | head -1)}"
out_dir="${OUT_DIR:-${TMPDIR:-/tmp}/sinif-defteri-e2e}"
maestro="${MAESTRO:-$HOME/.maestro/bin/maestro}"
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-240000}"

if [[ -z "$device" ]]; then
  echo "Açık simülatör yok; DEVICE=<UDID> verin." >&2
  exit 1
fi
mkdir -p "$out_dir"

# 1) Yapay e-Okul listesi → simülatör galerisi (en yeni fotoğraf olur; photo-import.yaml onu seçer).
image="$out_dir/e2e-class-list.png"
swift "$root/scripts/e2e/make-list-image.swift" "$image" >/dev/null
xcrun simctl addmedia "$device" "$image"

# 2) Geliştirme derlemesinin yüzen "Tools" düğmesi sağ üstteki "⋯"yi örter; tanıtım ve açılış
#    menüsü de akışı böler. Üçü de uygulamanın kendi ayarlarından kapatılır.
xcrun simctl terminate "$device" "$app_id" >/dev/null 2>&1 || true
xcrun simctl spawn "$device" defaults write "$app_id" EXDevMenuShowFloatingActionButton -bool NO
xcrun simctl spawn "$device" defaults write "$app_id" EXDevMenuIsOnboardingFinished -bool YES
xcrun simctl spawn "$device" defaults write "$app_id" EXDevMenuShowsAtLaunch -bool NO

env_args=()
[[ -n "${EMAIL:-}" ]] && env_args+=(-e "EMAIL=$EMAIL")
[[ -n "${PASSWORD:-}" ]] && env_args+=(-e "PASSWORD=$PASSWORD")

cd "$root"
if [[ -n "${FLOWS:-}" ]]; then
  status=0
  for flow in $FLOWS; do
    "$maestro" --device "$device" test ${env_args[@]+"${env_args[@]}"} --test-output-dir "$out_dir" ".maestro/$flow.yaml" || status=1
  done
  exit $status
fi
exec "$maestro" --device "$device" test ${env_args[@]+"${env_args[@]}"} --test-output-dir "$out_dir" --config .maestro/config.yaml .maestro
