-- =====================================================================
--  YAMA 16 — BİLİRKİŞİ RAPORLARI (yalnız masa üyelerine açık)
--
--  NEDEN (24.09.2026): WhatsApp grubunun analiz raporu uygulamada
--  paylaşılacak. Depo ve GitHub Pages HERKESE AÇIK; rapor ise isim,
--  alıntı ve aile mazeretleri içeriyor. Bu yüzden rapor dosya olarak
--  depoya KONMAZ; bu tabloda durur ve RLS ile yalnız o masanın ONAYLI
--  üyelerine okunur.
--
--  YAZMA: uygulamadan kimse rapor ekleyemez/değiştiremez/silemez
--  (insert/update/delete politikası YOK). Rapor yalnız SQL Editor'den
--  (postgres rolü, RLS'i baypas eder) eklenir. İçerik dosyaları depo
--  DIŞINDA tutulur (Kara Kaplı Defter\RAPOR_YUKLE_*.sql).
--
--  ANONİM GİRİŞ: anonimler 'authenticated' rolüyle gelir ama
--  masa_uyesi_mi() onaylı üyelik istediği için rapor göremezler.
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run.
-- =====================================================================

create table if not exists public.raporlar (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  baslik     text not null,
  ozet       text,
  html       text not null,
  olusturma  timestamptz not null default now()
);
create index if not exists ix_raporlar_masa on public.raporlar(masa_id, olusturma desc);

alter table public.raporlar enable row level security;

revoke all on public.raporlar from anon;
revoke insert, update, delete on public.raporlar from authenticated;
grant select on public.raporlar to authenticated;

drop policy if exists p_rapor_oku on public.raporlar;
create policy p_rapor_oku on public.raporlar for select to authenticated
  using (public.masa_uyesi_mi(masa_id));

-- Kontrol: tablo ve politika yerinde mi
select tablename, policyname, cmd from pg_policies where tablename = 'raporlar';
-- =====================================================================
