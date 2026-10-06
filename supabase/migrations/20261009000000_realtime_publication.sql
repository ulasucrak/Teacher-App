-- Canlı eşitleme (mobil ↔ web): Realtime postgres_changes için tabloları yayına ekler.
--
-- Yayınlanan tablolar: classes, students, forms, form_events.
--   * classes / students / forms: liste ve ayrıntı ekranları.
--   * form_events: form_entries ve form_marks üzerindeki her ekleme/değişiklik/silme tetikleyiciyle
--     buraya form_id'li bir INSERT olarak düşer. İşaretleme tahtası, gün kaydı ve geçmiş bu tabloyu
--     `form_id=eq.<id>` süzgeciyle dinler. Böylece form_entries / form_marks / form_sessions'ı
--     yayınlamaya gerek kalmaz (onların DELETE olayları süzülemez ve RLS'e tabi değildir).
--
-- REPLICA IDENTITY FULL bilerek AYARLANMAZ: RLS açık tablolarda Realtime DELETE olayında yine
-- yalnızca birincil anahtarı gönderir ve DELETE olayları süzgeçle eşleştirilmez; FULL bu yüzden
-- bir şey kazandırmaz, yalnızca WAL'ı büyütür. İstemci DELETE'i "yeniden yükle" sinyali sayar.
--
-- İdempotent: yayın yoksa oluşturur (yerel/boş kurulum), tablo zaten ekliyse dokunmaz,
-- yayın FOR ALL TABLES ise hiçbir şey yapmaz. Uzak projede tekrar çalıştırmak güvenlidir.

do $$
declare
  t text;
  v_all boolean;
begin
  select p.puballtables into v_all
  from pg_catalog.pg_publication p
  where p.pubname = 'supabase_realtime';

  if not found then
    create publication supabase_realtime;
    v_all := false;
  end if;

  if v_all then
    return;
  end if;

  foreach t in array array['classes', 'students', 'forms', 'form_events'] loop
    if not exists (
      select 1
      from pg_catalog.pg_publication_tables pt
      where pt.pubname = 'supabase_realtime'
        and pt.schemaname = 'public'
        and pt.tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
