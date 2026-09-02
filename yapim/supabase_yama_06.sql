-- =====================================================================
--  YAMA 06 — CANLI YAYIN (realtime) eksikleri
--
--  SORUN: Şemada yayına yalnız akis, eller ve maclar eklenmişti.
--  Uygulama ise maclar, iddialar ve oyuncular tablolarını dinliyordu.
--  Sonuç: başka birinin açtığı iddia, eklediği oyuncu, değiştirdiği kural
--  ya da yazdığı mesaj karşı tarafa kendiliğinden ulaşmıyordu — ancak
--  "Yenile" düğmesine basılınca görünüyordu.
--
--  ÇÖZÜM: masanın verisini taşıyan bütün tabloları yayına ekle.
--  (RLS bundan etkilenmez: kimse üyesi olmadığı masanın olayını almaz.)
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run
--  Tekrar çalıştırılabilir.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'akis',            -- mesajlar, zabıtlar, unvan duyuruları, ödemeler
    'akis_tepkileri',  -- emoji tepkileri
    'maclar',          -- açık tabelalar ve kapanan maçlar
    'iddialar',        -- iddia defteri
    'oyuncular',       -- kadro (yeni oyuncu, fotoğraf, doğum günü)
    'masalar',         -- masa ayarı: kurallar, efsaneler, lakaplar
    'masa_uyeleri',    -- katılma isteği / onay
    'partiler',
    'eller'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'yayına eklendi: %', t;
    exception
      when duplicate_object then raise notice 'zaten yayında: %', t;
      when undefined_table  then raise notice 'tablo yok, atlandı: %', t;
    end;
  end loop;
end $$;

-- Ne yayında, kontrol:
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
