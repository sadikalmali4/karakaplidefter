-- =====================================================================
--  KARA KAPLI DEFTER — Supabase şeması
--  Batak (eşli/ihaleli/parti 61) + 101 (parti 11 el) masa sicili
--
--  KULLANIM: Supabase paneli → SQL Editor → New query → hepsini yapıştır → Run
--  Tekrar çalıştırılabilir (idempotent): var olanı bozmaz.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PROFİLLER  (auth.users ile 1:1)
-- ---------------------------------------------------------------------
create table if not exists public.profiller (
  id          uuid primary key references auth.users(id) on delete cascade,
  ad          text not null check (length(btrim(ad)) between 1 and 24),
  foto_url    text,
  dogum       date,
  renk        text not null default '#C9A227',
  olusturma   timestamptz not null default now()
);

-- kayıt olan herkese otomatik profil aç
create or replace function public.profil_ac()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiller (id, ad)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'ad'), ''), split_part(new.email, '@', 1), 'Oyuncu')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_profil_ac on auth.users;
create trigger trg_profil_ac
  after insert on auth.users
  for each row execute function public.profil_ac();

-- ---------------------------------------------------------------------
-- 2) MASALAR ve ÜYELİK
-- ---------------------------------------------------------------------
create table if not exists public.masalar (
  id         uuid primary key default gen_random_uuid(),
  ad         text not null check (length(btrim(ad)) between 1 and 40),
  emoji      text not null default '🍀',
  kod        text not null unique,
  kuran_id   uuid not null references public.profiller(id) on delete restrict,
  olusturma  timestamptz not null default now()
);

do $$ begin
  create type public.uyelik_durumu as enum ('bekliyor','onayli','reddedildi');
exception when duplicate_object then null; end $$;

create table if not exists public.masa_uyeleri (
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  profil_id  uuid not null references public.profiller(id) on delete cascade,
  rol        text not null default 'uye' check (rol in ('kurucu','uye')),
  durum      public.uyelik_durumu not null default 'bekliyor',
  katilma    timestamptz not null default now(),
  primary key (masa_id, profil_id)
);
create index if not exists ix_masa_uyeleri_profil on public.masa_uyeleri(profil_id);

-- --- RLS yardımcıları -------------------------------------------------
-- ÖNEMLİ: bu fonksiyonlar SECURITY DEFINER; masa_uyeleri üzerindeki
-- politikalar doğrudan masa_uyeleri'ni sorgularsa sonsuz özyineleme olur.
create or replace function public.masa_uyesi_mi(p_masa uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.masa_uyeleri
    where masa_id = p_masa and profil_id = auth.uid() and durum = 'onayli'
  );
$$;

create or replace function public.masa_kurucusu_mu(p_masa uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.masa_uyeleri
    where masa_id = p_masa and profil_id = auth.uid()
      and durum = 'onayli' and rol = 'kurucu'
  );
$$;

-- masayı kuran otomatik kurucu üye olsun
create or replace function public.masa_kurucu_ekle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.masa_uyeleri (masa_id, profil_id, rol, durum)
  values (new.id, new.kuran_id, 'kurucu', 'onayli')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_masa_kurucu on public.masalar;
create trigger trg_masa_kurucu
  after insert on public.masalar
  for each row execute function public.masa_kurucu_ekle();

-- ---------------------------------------------------------------------
-- 3) MAÇLAR · PARTİLER · ELLER
-- ---------------------------------------------------------------------
create table if not exists public.maclar (
  id           uuid primary key default gen_random_uuid(),
  masa_id      uuid not null references public.masalar(id) on delete cascade,
  oyun         text not null check (oyun in ('batak','101')),
  giris        text not null default 'hizli' check (giris in ('hizli','detay')),
  tarih        date not null default current_date,
  yer          text,
  tabelaci_id  uuid not null references public.profiller(id) on delete restrict,
  parti_hedef  int  not null default 1 check (parti_hedef between 1 and 5),
  mod          text check (mod in ('tek','esli')),          -- yalnız 101
  hizli        jsonb not null default '{}'::jsonb,           -- hızlı giriş özeti
  bitti        boolean not null default false,
  kazanan      jsonb,                                        -- batak: 0/1 · 101: profil id
  zabit        text,
  aciklama     text,
  olusturma    timestamptz not null default now()
);
create index if not exists ix_maclar_masa on public.maclar(masa_id, tarih desc);

create table if not exists public.mac_oyunculari (
  mac_id     uuid not null references public.maclar(id) on delete cascade,
  profil_id  uuid not null references public.profiller(id) on delete cascade,
  sira       int  not null,                 -- oturma/seçim sırası (eşleri belirler)
  takim      int  check (takim in (0,1)),   -- batak: A=0 B=1 · 101 tek: null
  primary key (mac_id, profil_id)
);

create table if not exists public.partiler (
  id       uuid primary key default gen_random_uuid(),
  mac_id   uuid not null references public.maclar(id) on delete cascade,
  sira_no  int  not null,
  kazanan  jsonb,
  unique (mac_id, sira_no)
);

create table if not exists public.eller (
  id         uuid primary key default gen_random_uuid(),
  parti_id   uuid not null references public.partiler(id) on delete cascade,
  sira_no    int  not null,
  -- batak: {"ihaleTakim":0,"ihale":8,"koz":"♠ Maça","alinan":9}
  -- 101  : {"durum":{"<profil_id>":{"tip":"bitirdi"}, ...}}
  veri       jsonb not null,
  yazan_id   uuid references public.profiller(id) on delete set null,
  olusturma  timestamptz not null default now(),
  unique (parti_id, sira_no)
);

-- bir maçın tabelacısı mıyım? (el yazma yetkisi)
create or replace function public.tabelaci_mi(p_mac uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.maclar m
    where m.id = p_mac and m.tabelaci_id = auth.uid() and m.bitti = false
  );
$$;

create or replace function public.mac_masasi(p_mac uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$ select masa_id from public.maclar where id = p_mac; $$;

create or replace function public.parti_maci(p_parti uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$ select mac_id from public.partiler where id = p_parti; $$;

-- ---------------------------------------------------------------------
-- 4) İDDİA DEFTERİ
-- ---------------------------------------------------------------------
create table if not exists public.iddialar (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  kim_id     uuid not null references public.profiller(id) on delete cascade,
  kime_id    uuid references public.profiller(id) on delete set null,
  metin      text not null check (length(btrim(metin)) between 1 and 280),
  bahis      text,
  tarih      date not null default current_date,
  vade       date,
  durum      text not null default 'acik' check (durum in ('acik','kazandi','kaybetti','iptal')),
  sonuc_not  text,
  kapanis    date,
  acan_id    uuid references public.profiller(id) on delete set null,
  olusturma  timestamptz not null default now(),
  check (kime_id is null or kime_id <> kim_id)
);
create index if not exists ix_iddialar_masa on public.iddialar(masa_id, durum, vade);

-- ---------------------------------------------------------------------
-- 5) MASA AKIŞI (zabıtlar, unvan değişimleri, sohbet)
-- ---------------------------------------------------------------------
create table if not exists public.akis (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  tip        text not null default 'mesaj'
             check (tip in ('mesaj','zabit','unvan','dogumgunu','iddia','cagri')),
  yazan_id   uuid references public.profiller(id) on delete set null,
  metin      text,
  veri       jsonb not null default '{}'::jsonb,
  olusturma  timestamptz not null default now()
);
create index if not exists ix_akis_masa on public.akis(masa_id, olusturma desc);

create table if not exists public.akis_tepkileri (
  akis_id    uuid not null references public.akis(id) on delete cascade,
  profil_id  uuid not null references public.profiller(id) on delete cascade,
  emoji      text not null,
  primary key (akis_id, profil_id, emoji)
);

-- ---------------------------------------------------------------------
-- 6) RLS — satır bazlı erişim
-- ---------------------------------------------------------------------
alter table public.profiller       enable row level security;
alter table public.masalar         enable row level security;
alter table public.masa_uyeleri    enable row level security;
alter table public.maclar          enable row level security;
alter table public.mac_oyunculari  enable row level security;
alter table public.partiler        enable row level security;
alter table public.eller           enable row level security;
alter table public.iddialar        enable row level security;
alter table public.akis            enable row level security;
alter table public.akis_tepkileri  enable row level security;

-- --- profiller: kendi profilini yazarsın; masadaşlarını görürsün ------
drop policy if exists p_profil_oku on public.profiller;
create policy p_profil_oku on public.profiller for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.masa_uyeleri benim
    join public.masa_uyeleri onun on onun.masa_id = benim.masa_id
    where benim.profil_id = auth.uid() and benim.durum = 'onayli'
      and onun.profil_id = profiller.id
  )
);
drop policy if exists p_profil_yaz on public.profiller;
create policy p_profil_yaz on public.profiller for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- --- masalar ----------------------------------------------------------
drop policy if exists p_masa_oku on public.masalar;
create policy p_masa_oku on public.masalar for select to authenticated
using (public.masa_uyesi_mi(id));

drop policy if exists p_masa_kur on public.masalar;
create policy p_masa_kur on public.masalar for insert to authenticated
with check (kuran_id = auth.uid());

drop policy if exists p_masa_duzenle on public.masalar;
create policy p_masa_duzenle on public.masalar for update to authenticated
using (public.masa_kurucusu_mu(id)) with check (public.masa_kurucusu_mu(id));

drop policy if exists p_masa_sil on public.masalar;
create policy p_masa_sil on public.masalar for delete to authenticated
using (public.masa_kurucusu_mu(id));

-- --- masa_uyeleri: kendi satırını + masadaşlarını görürsün ------------
drop policy if exists p_uye_oku on public.masa_uyeleri;
create policy p_uye_oku on public.masa_uyeleri for select to authenticated
using (profil_id = auth.uid() or public.masa_uyesi_mi(masa_id));

-- katılma isteği: kendi adına, 'bekliyor' olarak
drop policy if exists p_uye_istek on public.masa_uyeleri;
create policy p_uye_istek on public.masa_uyeleri for insert to authenticated
with check (profil_id = auth.uid() and durum = 'bekliyor' and rol = 'uye');

-- onay/ret ve rol değişimi yalnız kurucuda
drop policy if exists p_uye_onay on public.masa_uyeleri;
create policy p_uye_onay on public.masa_uyeleri for update to authenticated
using (public.masa_kurucusu_mu(masa_id)) with check (public.masa_kurucusu_mu(masa_id));

-- kurucu atabilir; üye kendi kendini çıkarabilir
drop policy if exists p_uye_cikar on public.masa_uyeleri;
create policy p_uye_cikar on public.masa_uyeleri for delete to authenticated
using (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid());

-- --- maçlar: masadaki herkes okur; tabelacı yazar --------------------
drop policy if exists p_mac_oku on public.maclar;
create policy p_mac_oku on public.maclar for select to authenticated
using (public.masa_uyesi_mi(masa_id));

drop policy if exists p_mac_ac on public.maclar;
create policy p_mac_ac on public.maclar for insert to authenticated
with check (public.masa_uyesi_mi(masa_id) and tabelaci_id = auth.uid());

drop policy if exists p_mac_guncelle on public.maclar;
create policy p_mac_guncelle on public.maclar for update to authenticated
using (tabelaci_id = auth.uid() or public.masa_kurucusu_mu(masa_id))
with check (tabelaci_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

drop policy if exists p_mac_sil on public.maclar;
create policy p_mac_sil on public.maclar for delete to authenticated
using (tabelaci_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

-- --- maç oyuncuları ---------------------------------------------------
drop policy if exists p_macoy_oku on public.mac_oyunculari;
create policy p_macoy_oku on public.mac_oyunculari for select to authenticated
using (public.masa_uyesi_mi(public.mac_masasi(mac_id)));

drop policy if exists p_macoy_yaz on public.mac_oyunculari;
create policy p_macoy_yaz on public.mac_oyunculari for all to authenticated
using (public.tabelaci_mi(mac_id)) with check (public.tabelaci_mi(mac_id));

-- --- partiler ---------------------------------------------------------
drop policy if exists p_parti_oku on public.partiler;
create policy p_parti_oku on public.partiler for select to authenticated
using (public.masa_uyesi_mi(public.mac_masasi(mac_id)));

drop policy if exists p_parti_yaz on public.partiler;
create policy p_parti_yaz on public.partiler for all to authenticated
using (public.tabelaci_mi(mac_id)) with check (public.tabelaci_mi(mac_id));

-- --- eller: TABELA. okumak serbest, yazmak yalnız tabelacıya ---------
drop policy if exists p_el_oku on public.eller;
create policy p_el_oku on public.eller for select to authenticated
using (public.masa_uyesi_mi(public.mac_masasi(public.parti_maci(parti_id))));

drop policy if exists p_el_yaz on public.eller;
create policy p_el_yaz on public.eller for all to authenticated
using (public.tabelaci_mi(public.parti_maci(parti_id)))
with check (public.tabelaci_mi(public.parti_maci(parti_id)));

-- --- iddialar: masadaki herkes yazar; taraflar ve kurucu karara bağlar
drop policy if exists p_iddia_oku on public.iddialar;
create policy p_iddia_oku on public.iddialar for select to authenticated
using (public.masa_uyesi_mi(masa_id));

drop policy if exists p_iddia_ac on public.iddialar;
create policy p_iddia_ac on public.iddialar for insert to authenticated
with check (public.masa_uyesi_mi(masa_id) and acan_id = auth.uid());

drop policy if exists p_iddia_karar on public.iddialar;
create policy p_iddia_karar on public.iddialar for update to authenticated
using (
  public.masa_uyesi_mi(masa_id)
  and (kim_id = auth.uid() or kime_id = auth.uid()
       or acan_id = auth.uid() or public.masa_kurucusu_mu(masa_id))
)
with check (public.masa_uyesi_mi(masa_id));

drop policy if exists p_iddia_sil on public.iddialar;
create policy p_iddia_sil on public.iddialar for delete to authenticated
using (acan_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

-- --- akış -------------------------------------------------------------
drop policy if exists p_akis_oku on public.akis;
create policy p_akis_oku on public.akis for select to authenticated
using (public.masa_uyesi_mi(masa_id));

drop policy if exists p_akis_yaz on public.akis;
create policy p_akis_yaz on public.akis for insert to authenticated
with check (public.masa_uyesi_mi(masa_id) and yazan_id = auth.uid());

drop policy if exists p_akis_duzelt on public.akis;
create policy p_akis_duzelt on public.akis for update to authenticated
using (yazan_id = auth.uid()) with check (yazan_id = auth.uid());

drop policy if exists p_akis_sil on public.akis;
create policy p_akis_sil on public.akis for delete to authenticated
using (yazan_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

drop policy if exists p_tepki_oku on public.akis_tepkileri;
create policy p_tepki_oku on public.akis_tepkileri for select to authenticated
using (exists (select 1 from public.akis a
               where a.id = akis_id and public.masa_uyesi_mi(a.masa_id)));

drop policy if exists p_tepki_yaz on public.akis_tepkileri;
create policy p_tepki_yaz on public.akis_tepkileri for all to authenticated
using (profil_id = auth.uid()) with check (profil_id = auth.uid());

-- ---------------------------------------------------------------------
-- 7) KOD İLE KATILMA  (masa listesi gizli kalsın diye RPC)
--    Kodu bilen "bekliyor" satırı açar; kurucu onaylayınca içeri girer.
-- ---------------------------------------------------------------------
create or replace function public.masaya_katil(p_kod text)
returns table (masa_id uuid, masa_ad text, durum text)
language plpgsql
security definer
set search_path = public
as $$
declare v_masa public.masalar%rowtype; v_var public.masa_uyeleri%rowtype;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın'; end if;

  select * into v_masa from public.masalar where upper(kod) = upper(btrim(p_kod));
  if not found then raise exception 'Böyle bir masa kodu yok'; end if;

  select * into v_var from public.masa_uyeleri
   where masa_uyeleri.masa_id = v_masa.id and profil_id = auth.uid();

  if found then
    return query select v_masa.id, v_masa.ad, v_var.durum::text;
  else
    insert into public.masa_uyeleri (masa_id, profil_id, rol, durum)
    values (v_masa.id, auth.uid(), 'uye', 'bekliyor');
    return query select v_masa.id, v_masa.ad, 'bekliyor'::text;
  end if;
end $$;

revoke all on function public.masaya_katil(text) from public;
grant execute on function public.masaya_katil(text) to authenticated;

-- ---------------------------------------------------------------------
-- 8) FOTOĞRAF DEPOSU
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatarlar','avatarlar', true)
on conflict (id) do nothing;

drop policy if exists p_avatar_oku on storage.objects;
create policy p_avatar_oku on storage.objects for select
using (bucket_id = 'avatarlar');

-- herkes yalnız kendi klasörüne yazar:  avatarlar/<kullanici_id>/...
drop policy if exists p_avatar_yaz on storage.objects;
create policy p_avatar_yaz on storage.objects for insert to authenticated
with check (bucket_id = 'avatarlar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists p_avatar_degistir on storage.objects;
create policy p_avatar_degistir on storage.objects for update to authenticated
using (bucket_id = 'avatarlar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists p_avatar_sil on storage.objects;
create policy p_avatar_sil on storage.objects for delete to authenticated
using (bucket_id = 'avatarlar' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 9) ANLIK SENKRON (akış ve tabela canlı aksın)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.akis;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.eller;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.maclar;
exception when duplicate_object then null; end $$;

-- =====================================================================
--  BİTTİ.
--  Kural özeti:
--   · Masayı göremezsin — üyesi değilsen. Kodla katılırsın, kurucu onaylar.
--   · Tabelayı yalnız tabelacı yazar; maç kapanınca o da yazamaz.
--   · İddiayı masadaki herkes açar; karara tarafları veya kurucu bağlar.
--   · Fotoğrafını yalnız kendi klasörüne yükleyebilirsin.
-- =====================================================================
