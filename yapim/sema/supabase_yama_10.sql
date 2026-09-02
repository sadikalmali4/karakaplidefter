-- =====================================================================
--  YAMA 10 — TAHMİN HAFTASINI WHATSAPP'TAN OYNATMAK
--
--  İSTEK (kullanıcı, 02.09.2026): "Maç sonuçlarını açacağız ya, onu
--  WhatsApp'tan da paylaşayım, gruptan bağlanıp oradan da yazsınlar;
--  dışarıdan yazan da adını yazsın, girsin tahminlerini."
--  (Buradaki "maçlar" FUTBOL maçları — tahmin yarışması. Masa
--  tabelasının misafir girişi yama 09'da.)
--
--  TASARIM İLKESİ — yama 09 ile aynı: misafire RLS AÇILMIYOR. Üç kapı,
--  hepsi security definer:
--     tahmin_misafir_katil(kod, ad)                   → kendini haftaya bağlar
--     tahmin_misafir_pencere(kod)                     → SADECE o haftayı okur
--     tahmin_misafir_yaz(kod, karsilasma, ev, dep)    → SADECE kendi tahminini yazar
--
--  Misafirin YAPAMADIKLARI:
--    · maç sonucu girmek, maç eklemek/silmek, haftayı kapatmak
--    · başkasının tahminini değiştirmek (profil_id = auth.uid() zorunlu)
--    · MAÇ BAŞLADIKTAN SONRA tahmin yazmak (tahmin_acik_mi kilidi)
--    · grubun arşivini, masalarını, akışını, borçlarını görmek
--    · başka bir haftaya geçmek
--
--  Link ölümü: hafta kapanınca (kapandi = true) ve kurucu "misafir
--  girişini kapat" deyince (misafir_kod = null).
--
--  AD → OYUNCU: yazdığı ad kadroda varsa o oyuncuya bağlanır (sicili
--  bölünmesin), yoksa o adla yeni oyuncu açılır. Hafta başına misafir
--  sayısı sınırlı.
--
--  ÖN KOŞUL: Authentication → Sign In / Providers → "Anonymous sign-ins"
--  açık olmalı (yama 09'da da gerekiyordu). anonim_mi() yama 09'da
--  tanımlı; bu betik onu kullanıyor, yama 09 ÖNCE çalıştırılmış olmalı.
--
--  KULLANIM: SQL Editor → New query → hepsini yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Haftada misafir kodu
-- ---------------------------------------------------------------------
alter table public.haftalar add column if not exists misafir_kod text;

create unique index if not exists ux_haftalar_misafir_kod
  on public.haftalar(misafir_kod) where misafir_kod is not null;

comment on column public.haftalar.misafir_kod is
  'WhatsApp linkindeki kod. null ise misafir tahmini kapalıdır.';


-- ---------------------------------------------------------------------
-- 2) Haftaya misafir olarak katılanlar
--    Masanın üyeleri bunu OKUR: sıralamada misafirin adı görünsün.
-- ---------------------------------------------------------------------
create table if not exists public.hafta_misafirleri (
  hafta_id  uuid not null references public.haftalar(id) on delete cascade,
  profil_id uuid not null references public.profiller(id) on delete cascade,
  ad        text not null check (length(btrim(ad)) between 1 and 24),
  oyuncu_id uuid references public.oyuncular(id) on delete set null,
  yeni_acti boolean not null default false,
  katilma   timestamptz not null default now(),
  primary key (hafta_id, profil_id)
);

alter table public.hafta_misafirleri enable row level security;

drop policy if exists p_hafta_misafir_oku on public.hafta_misafirleri;
create policy p_hafta_misafir_oku on public.hafta_misafirleri for select to authenticated
using (public.masa_uyesi_mi(public.hafta_masasi(hafta_id)));

comment on policy p_hafta_misafir_oku on public.hafta_misafirleri is
  'Masanın üyeleri misafirlerin adını görür; sıralamada "?" çıkmasın.';

-- insert/update/delete POLİTİKASI YOK: yalnız security definer fonksiyonlar.


-- ---------------------------------------------------------------------
-- 3) Kurucu: kodu üret / kapat
-- ---------------------------------------------------------------------
create or replace function public.tahmin_kod_uret(p_hafta uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod  text;
  v_var  text;
  v_harf text := 'abcdefghjkmnpqrstuvwxyz23456789';   -- karışanlar (i,l,o,0,1) yok
begin
  if public.anonim_mi() then
    raise exception 'Misafir oturumu link üretemez';
  end if;

  select misafir_kod into v_var
  from public.haftalar
  where id = p_hafta and kapandi = false
    and public.masa_kurucusu_mu(masa_id);

  if not found then
    raise exception 'Bu haftanın linkini yalnız masayı kuran üretebilir (hafta açık olmalı)';
  end if;

  if v_var is not null then
    return v_var;
  end if;

  for i in 1..10 loop
    v_kod := '';
    for j in 1..10 loop
      v_kod := v_kod || substr(v_harf, 1 + floor(random()*length(v_harf))::int, 1);
    end loop;
    begin
      update public.haftalar set misafir_kod = v_kod where id = p_hafta;
      return v_kod;
    exception when unique_violation then
      null;
    end;
  end loop;

  raise exception 'Kod üretilemedi, tekrar dene';
end $$;

revoke all on function public.tahmin_kod_uret(uuid) from public;
grant execute on function public.tahmin_kod_uret(uuid) to authenticated;


create or replace function public.tahmin_kod_kapat(p_hafta uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.anonim_mi() then
    raise exception 'Misafir oturumu bunu yapamaz';
  end if;

  update public.haftalar set misafir_kod = null
  where id = p_hafta and public.masa_kurucusu_mu(masa_id);

  if not found then
    raise exception 'Yetkin yok';
  end if;

  delete from public.hafta_misafirleri where hafta_id = p_hafta;
end $$;

revoke all on function public.tahmin_kod_kapat(uuid) from public;
grant execute on function public.tahmin_kod_kapat(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 4) Misafirin gördüğü tek pencere
--    Bütün tahminler dönüyor: yarışma açık, herkes birbirini görür.
-- ---------------------------------------------------------------------
create or replace function public.tahmin_pencere(p_hafta uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'hafta', jsonb_build_object(
      'id',      h.id,
      'masa_id', h.masa_id,
      'masa_ad', s.ad,
      'ad',      h.ad,
      'kapandi', h.kapandi
    ),
    'maclar', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'sira', k.sira, 'ev', k.ev, 'deplasman', k.deplasman,
               'baslangic', k.baslangic, 'ev_skor', k.ev_skor, 'dep_skor', k.dep_skor,
               'acik', k.baslangic > now())
             order by k.sira, k.baslangic)
      from public.karsilasmalar k where k.hafta_id = h.id
    ), '[]'::jsonb),
    'tahminler', coalesce((
      select jsonb_agg(jsonb_build_object(
               'karsilasma_id', t.karsilasma_id, 'profil_id', t.profil_id,
               'ev', t.ev, 'dep', t.dep,
               'ad', coalesce(g.ad, o.ad, p.ad, '?')))
      from public.tahminler t
      join public.karsilasmalar k on k.id = t.karsilasma_id and k.hafta_id = h.id
      left join public.hafta_misafirleri g on g.hafta_id = h.id and g.profil_id = t.profil_id
      left join public.oyuncular o on o.masa_id = h.masa_id and o.profil_id = t.profil_id
      left join public.profiller p on p.id = t.profil_id
    ), '[]'::jsonb),
    'ben', (select jsonb_build_object('ad', g.ad, 'oyuncu_id', g.oyuncu_id,
                                      'yeni_acti', g.yeni_acti, 'profil_id', g.profil_id)
              from public.hafta_misafirleri g
              where g.hafta_id = h.id and g.profil_id = auth.uid())
  )
  from public.haftalar h
  join public.masalar s on s.id = h.masa_id
  where h.id = p_hafta;
$$;

revoke all on function public.tahmin_pencere(uuid) from public;
grant execute on function public.tahmin_pencere(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5) Misafir katılır: adını yazar
-- ---------------------------------------------------------------------
create or replace function public.tahmin_misafir_katil(p_kod text, p_ad text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  MISAFIR_SINIR constant int := 30;   -- hafta başına misafir üst sınırı
  v_hafta  uuid;
  v_masa   uuid;
  v_ad     text := btrim(coalesce(p_ad,''));
  v_oyuncu uuid;
  v_yeni   boolean := false;
  v_kac    int;
  v_renk   text;
  v_paleta text[] := array['#C9A227','#5C8A9B','#8A7BC4','#6E9B5C','#B08968',
                           '#9B7B5C','#7B8FA1','#A8746A','#6F9B8E','#8E7BA1'];
begin
  if auth.uid() is null then
    raise exception 'Oturum açılamadı';
  end if;
  if length(v_ad) = 0 then
    raise exception 'Adını yazman gerekiyor';
  end if;
  if length(v_ad) > 24 then
    v_ad := substr(v_ad, 1, 24);
  end if;

  select id, masa_id into v_hafta, v_masa
  from public.haftalar
  where misafir_kod = btrim(coalesce(p_kod,''))
    and misafir_kod is not null
    and kapandi = false;

  if v_hafta is null then
    raise exception 'Bu link geçersiz ya da hafta kapanmış';
  end if;

  select oyuncu_id into v_oyuncu
  from public.hafta_misafirleri
  where hafta_id = v_hafta and profil_id = auth.uid();

  if v_oyuncu is null then
    -- 1) adı kadroda ara (büyük/küçük harf ve boşluk duyarsız)
    select o.id into v_oyuncu
    from public.oyuncular o
    where o.masa_id = v_masa
      and lower(btrim(o.ad)) = lower(v_ad)
    order by o.aktif desc, o.olusturma
    limit 1;

    -- 2) yoksa o adla yeni oyuncu aç
    if v_oyuncu is null then
      select count(*) into v_kac from public.hafta_misafirleri where hafta_id = v_hafta;
      if v_kac >= MISAFIR_SINIR then
        raise exception 'Bu haftaya en fazla % misafir katılabilir', MISAFIR_SINIR;
      end if;
      select count(*) into v_kac from public.oyuncular where masa_id = v_masa;
      v_renk := v_paleta[1 + (v_kac % array_length(v_paleta,1))];
      insert into public.oyuncular (masa_id, ad, renk, aktif)
      values (v_masa, v_ad, v_renk, true)
      returning id into v_oyuncu;
      v_yeni := true;
    end if;
  end if;

  update public.profiller set ad = v_ad where id = auth.uid();

  insert into public.hafta_misafirleri (hafta_id, profil_id, ad, oyuncu_id, yeni_acti)
  values (v_hafta, auth.uid(), v_ad, v_oyuncu, v_yeni)
  on conflict (hafta_id, profil_id) do update
    set ad = excluded.ad,
        oyuncu_id = coalesce(public.hafta_misafirleri.oyuncu_id, excluded.oyuncu_id);

  return public.tahmin_pencere(v_hafta);
end $$;

revoke all on function public.tahmin_misafir_katil(text,text) from public;
grant execute on function public.tahmin_misafir_katil(text,text) to authenticated;


-- ---------------------------------------------------------------------
-- 6) Misafir okur
-- ---------------------------------------------------------------------
create or replace function public.tahmin_misafir_pencere(p_kod text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_hafta uuid;
begin
  select h.id into v_hafta
  from public.haftalar h
  join public.hafta_misafirleri g on g.hafta_id = h.id and g.profil_id = auth.uid()
  where h.misafir_kod = btrim(coalesce(p_kod,'')) and h.misafir_kod is not null;

  if v_hafta is null then
    raise exception 'Bu haftaya erişimin yok ya da misafir girişi kapatıldı';
  end if;

  return public.tahmin_pencere(v_hafta);
end $$;

revoke all on function public.tahmin_misafir_pencere(text) from public;
grant execute on function public.tahmin_misafir_pencere(text) to authenticated;


-- ---------------------------------------------------------------------
-- 7) Misafir tahmin yazar — YALNIZ kendi satırı, YALNIZ maç başlamadan
-- ---------------------------------------------------------------------
create or replace function public.tahmin_misafir_yaz(
  p_kod text, p_karsilasma uuid, p_ev int, p_dep int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_hafta uuid;
begin
  if p_ev is null or p_dep is null then
    raise exception 'İki skoru da yazman gerekiyor';
  end if;
  if p_ev < 0 or p_ev > 30 or p_dep < 0 or p_dep > 30 then
    raise exception 'Skor 0 ile 30 arasında olmalı';
  end if;

  -- Bu maç, misafirin bağlı olduğu haftaya mı ait?
  select h.id into v_hafta
  from public.haftalar h
  join public.hafta_misafirleri g on g.hafta_id = h.id and g.profil_id = auth.uid()
  join public.karsilasmalar k on k.hafta_id = h.id and k.id = p_karsilasma
  where h.misafir_kod = btrim(coalesce(p_kod,''))
    and h.misafir_kod is not null
    and h.kapandi = false;

  if v_hafta is null then
    raise exception 'Yazma yetkin yok: link kapatılmış ya da bu maç bu haftada değil';
  end if;

  -- KİLİT: maç başladıysa tahmin yazılmaz (üyeler için de aynı kural)
  if not public.tahmin_acik_mi(p_karsilasma) then
    raise exception 'KILIT: maç başladı, tahmin kapandı';
  end if;

  insert into public.tahminler (karsilasma_id, profil_id, ev, dep, guncelleme)
  values (p_karsilasma, auth.uid(), p_ev, p_dep, now())
  on conflict (karsilasma_id, profil_id) do update
    set ev = excluded.ev, dep = excluded.dep, guncelleme = now();

  return public.tahmin_pencere(v_hafta);
end $$;

revoke all on function public.tahmin_misafir_yaz(text,uuid,int,int) from public;
grant execute on function public.tahmin_misafir_yaz(text,uuid,int,int) to authenticated;


-- =====================================================================
--  Kontrol
-- =====================================================================
select 'fonksiyonlar' as ne, string_agg(proname, ', ' order by proname) as sonuc
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('tahmin_kod_uret','tahmin_kod_kapat','tahmin_pencere',
                  'tahmin_misafir_katil','tahmin_misafir_pencere','tahmin_misafir_yaz')
union all
select 'haftalar.misafir_kod', count(*)::text
from information_schema.columns
where table_schema='public' and table_name='haftalar' and column_name='misafir_kod'
union all
select 'hafta_misafirleri sutunlari', string_agg(column_name, ', ' order by column_name)
from information_schema.columns
where table_schema='public' and table_name='hafta_misafirleri'
union all
select 'yama 09 hazir mi (anonim_mi)', count(*)::text
from pg_proc where pronamespace='public'::regnamespace and proname='anonim_mi';
