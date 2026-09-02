-- =====================================================================
--  YAMA 02 — OYUNCU ≠ HESAP
--
--  Oyuncu: masaya ait kayıt (ad, foto, doğum günü). Hesap gerektirmez.
--  Hesap : isteğe bağlı. Kaydolan kişi kendi oyuncu kaydına bağlanır ve
--          o andan itibaren geçmişi dahil her şeyi görür.
--
--  Maç/iddia kayıtları artık profil değil OYUNCU üzerinden tutulur.
--  (Bu tablolar henüz boş olduğu için yeniden kuruluyorlar.)
--
--  ÖNCE YAMA 01 çalıştırılmış olmalı.
--  KULLANIM: SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) OYUNCULAR
-- ---------------------------------------------------------------------
create table if not exists public.oyuncular (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  ad         text not null check (length(btrim(ad)) between 1 and 24),
  foto_url   text,
  dogum      date,
  renk       text not null default '#C9A227',
  profil_id  uuid references public.profiller(id) on delete set null,
  aktif      boolean not null default true,
  olusturma  timestamptz not null default now(),
  unique (masa_id, profil_id)          -- bir hesap, bir masada tek oyuncuya bağlanır
);
create index if not exists ix_oyuncular_masa on public.oyuncular(masa_id) where aktif;

alter table public.oyuncular enable row level security;

drop policy if exists p_oyuncu_oku on public.oyuncular;
create policy p_oyuncu_oku on public.oyuncular for select to authenticated
using (public.masa_uyesi_mi(masa_id));

-- masadaki her onaylı üye oyuncu ekleyebilir (tabelacı da eklemek isteyebilir)
drop policy if exists p_oyuncu_ekle on public.oyuncular;
create policy p_oyuncu_ekle on public.oyuncular for insert to authenticated
with check (public.masa_uyesi_mi(masa_id));

-- düzenleme: kurucu her oyuncuyu, herkes kendi bağlı olduğu oyuncuyu
drop policy if exists p_oyuncu_duzenle on public.oyuncular;
create policy p_oyuncu_duzenle on public.oyuncular for update to authenticated
using (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid())
with check (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid());

-- silme yalnız kurucuda (sicili korumak için aslında 'aktif=false' tercih edilmeli)
drop policy if exists p_oyuncu_sil on public.oyuncular;
create policy p_oyuncu_sil on public.oyuncular for delete to authenticated
using (public.masa_kurucusu_mu(masa_id));

-- ---------------------------------------------------------------------
-- 2) MAÇ OYUNCULARI ve İDDİALAR — artık oyuncu_id taşıyorlar
-- ---------------------------------------------------------------------
drop table if exists public.mac_oyunculari cascade;
create table public.mac_oyunculari (
  mac_id     uuid not null references public.maclar(id) on delete cascade,
  oyuncu_id  uuid not null references public.oyuncular(id) on delete cascade,
  sira       int  not null,                 -- seçim/oturma sırası; eşleri belirler
  takim      int  check (takim in (0,1)),   -- batak: A=0 B=1 · 101 tek: null
  primary key (mac_id, oyuncu_id)
);
alter table public.mac_oyunculari enable row level security;

drop policy if exists p_macoy_oku on public.mac_oyunculari;
create policy p_macoy_oku on public.mac_oyunculari for select to authenticated
using (public.masa_uyesi_mi(public.mac_masasi(mac_id)));

drop policy if exists p_macoy_yaz on public.mac_oyunculari;
create policy p_macoy_yaz on public.mac_oyunculari for all to authenticated
using (public.tabelaci_mi(mac_id)) with check (public.tabelaci_mi(mac_id));


drop table if exists public.iddialar cascade;
create table public.iddialar (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  kim_id     uuid not null references public.oyuncular(id) on delete cascade,
  kime_id    uuid references public.oyuncular(id) on delete set null,
  metin      text not null check (length(btrim(metin)) between 1 and 280),
  bahis      text,
  tarih      date not null default current_date,
  vade       date,
  durum      text not null default 'acik' check (durum in ('acik','kazandi','kaybetti','iptal')),
  sonuc_not  text,
  kapanis    date,
  acan_id    uuid references public.profiller(id) on delete set null,   -- kaydı giren hesap
  olusturma  timestamptz not null default now(),
  check (kime_id is null or kime_id <> kim_id)
);
create index if not exists ix_iddialar_masa on public.iddialar(masa_id, durum, vade);
alter table public.iddialar enable row level security;

drop policy if exists p_iddia_oku on public.iddialar;
create policy p_iddia_oku on public.iddialar for select to authenticated
using (public.masa_uyesi_mi(masa_id));

drop policy if exists p_iddia_ac on public.iddialar;
create policy p_iddia_ac on public.iddialar for insert to authenticated
with check (public.masa_uyesi_mi(masa_id) and acan_id = auth.uid());

drop policy if exists p_iddia_karar on public.iddialar;
create policy p_iddia_karar on public.iddialar for update to authenticated
using (public.masa_uyesi_mi(masa_id)) with check (public.masa_uyesi_mi(masa_id));

drop policy if exists p_iddia_sil on public.iddialar;
create policy p_iddia_sil on public.iddialar for delete to authenticated
using (acan_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

-- ---------------------------------------------------------------------
-- 3) HESABI OYUNCUYA BAĞLAMA
--    Kurucu, onayladığı üyeyi mevcut bir oyuncu kaydına bağlar.
--    Böylece kişi kendi geçmiş sicilini de görür.
-- ---------------------------------------------------------------------
create or replace function public.oyuncu_bagla(p_oyuncu uuid, p_profil uuid)
returns setof public.oyuncular
language plpgsql
security definer
set search_path = public
as $$
declare v_masa uuid;
begin
  select masa_id into v_masa from public.oyuncular where id = p_oyuncu;
  if v_masa is null then raise exception 'Oyuncu bulunamadı'; end if;
  if not public.masa_kurucusu_mu(v_masa) then
    raise exception 'Bunu yalnız masayı kuran yapabilir';
  end if;
  if not exists (select 1 from public.masa_uyeleri
                 where masa_id = v_masa and profil_id = p_profil and durum = 'onayli') then
    raise exception 'Bu kişi masanın onaylı üyesi değil';
  end if;
  if exists (select 1 from public.oyuncular
             where masa_id = v_masa and profil_id = p_profil and id <> p_oyuncu) then
    raise exception 'Bu hesap bu masada başka bir oyuncuya bağlı';
  end if;

  update public.oyuncular set profil_id = p_profil where id = p_oyuncu;
  return query select * from public.oyuncular o where o.id = p_oyuncu;
end $$;

revoke all on function public.oyuncu_bagla(uuid,uuid) from public;
grant execute on function public.oyuncu_bagla(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) FOTOĞRAFLAR — masa klasörü
--    Oyuncu fotoğrafı kişiye değil masaya ait: avatarlar/masa/<masa_id>/...
--    Yazma yetkisi o masanın onaylı üyelerinde.
-- ---------------------------------------------------------------------
drop policy if exists p_avatar_masa_yaz on storage.objects;
create policy p_avatar_masa_yaz on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatarlar'
  and (storage.foldername(name))[1] = 'masa'
  and public.masa_uyesi_mi(((storage.foldername(name))[2])::uuid)
);

drop policy if exists p_avatar_masa_degistir on storage.objects;
create policy p_avatar_masa_degistir on storage.objects for update to authenticated
using (
  bucket_id = 'avatarlar'
  and (storage.foldername(name))[1] = 'masa'
  and public.masa_uyesi_mi(((storage.foldername(name))[2])::uuid)
);

drop policy if exists p_avatar_masa_sil on storage.objects;
create policy p_avatar_masa_sil on storage.objects for delete to authenticated
using (
  bucket_id = 'avatarlar'
  and (storage.foldername(name))[1] = 'masa'
  and public.masa_kurucusu_mu(((storage.foldername(name))[2])::uuid)
);

-- =====================================================================
--  BİTTİ.
--  Özet:
--   · Oyuncu eklemek için hesap gerekmiyor — tabelacı hepsini kendi ekler.
--   · Kaydolan biri masaya kabul edilince kurucu onu oyuncu kaydına bağlar;
--     geçmiş sicili dahil her şey yerinde durur.
--   · Oyuncu fotoğrafları masa klasöründe, yazma yetkisi masa üyelerinde.
-- =====================================================================
