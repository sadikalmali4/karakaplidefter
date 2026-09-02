-- =====================================================================
--  YAMA 09 — MİSAFİR TABELACI (WhatsApp linkiyle sonuç girme)
--
--  İSTEK: Masa açılınca link WhatsApp grubuna atılacak; hesabı olmayan
--  kişi linke tıklayıp ADINI yazıp o maçın tabelasına sonuç girecek.
--
--  TASARIM İLKESİ: misafire RLS AÇILMIYOR. Misafirin eli hiçbir tabloya
--  doğrudan değmiyor; yalnız aşağıdaki security definer fonksiyonlardan
--  geçiyor. Böylece "yanlışlıkla fazla yetki" ihtimali kalmıyor:
--
--    misafir_katil(kod, ad)          → kendini o maça bağlar
--    misafir_mac(kod)                → SADECE o maçı ve oyuncularını okur
--    misafir_celse_yaz(kod, celse, el) → SADECE o maçın celse alanını yazar
--
--  Misafirin YAPAMADIKLARI (fonksiyon başka hiçbir alana dokunmuyor):
--    · maçı bitirmek (bitti), kazanan/zabıt yazmak
--    · tabelacıyı değiştirmek, maçı silmek
--    · grubun arşivini, öteki maçları, akışı, borçları, tahminleri görmek
--    · başka bir masaya/maça geçmek
--
--  Link ölümü: maç kapanınca (bitti = true) ve tabelacı "misafir yazmayı
--  kapat" deyince (misafir_kod = null) aynı anda biter.
--
--  ÖN KOŞUL: Supabase panelinde Authentication → Sign In / Providers →
--  "Anonymous sign-ins" AÇIK olmalı. Anonim kullanıcı Supabase'de
--  authenticated rolündedir; JWT'sinde is_anonymous = true taşır.
--  Aşağıdaki anonim_mi() o iddiayı okuyor ve anonim kullanıcının
--  masa kurmasını / gruba katılmasını / akışa yazmasını engelliyor.
--
--  KULLANIM: SQL Editor → New query → hepsini yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Anonim kullanıcı mı?  (yeni yüzey açılmasın)
-- ---------------------------------------------------------------------
create or replace function public.anonim_mi()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

grant execute on function public.anonim_mi() to authenticated;

-- Anonim kullanıcı masa KURAMAZ. (masa_kur fonksiyonu tek giriş kapısı;
-- masalar tablosundaki insert kuralını da ayrıca kısıyoruz.)
drop policy if exists p_masa_kur on public.masalar;
create policy p_masa_kur on public.masalar for insert to authenticated
with check (kuran_id = auth.uid() and not public.anonim_mi());

comment on policy p_masa_kur on public.masalar is
  'Masayı ancak gerçek hesap kurar. Anonim (misafir) oturum masa kuramaz.';

-- Anonim kullanıcı gruba katılma isteği GÖNDEREMEZ.
drop policy if exists p_uye_istek on public.masa_uyeleri;
create policy p_uye_istek on public.masa_uyeleri for insert to authenticated
with check (profil_id = auth.uid() and not public.anonim_mi());

comment on policy p_uye_istek on public.masa_uyeleri is
  'Kişi yalnız kendi adına üyelik isteği açar. Anonim oturum hiç açamaz.';

-- Anonim kullanıcı akışa YAZAMAZ (grup üyeliği şartı zaten var; bu ek kilit).
drop policy if exists p_akis_yaz on public.akis;
create policy p_akis_yaz on public.akis for insert to authenticated
with check (
  yazan_id = auth.uid()
  and public.masa_uyesi_mi(masa_id)
  and not public.anonim_mi()
);

comment on policy p_akis_yaz on public.akis is
  'Akışa yalnız masanın üyesi, kendi adına yazar. Anonim oturum yazamaz.';


-- ---------------------------------------------------------------------
-- 1) Maçta misafir kodu
-- ---------------------------------------------------------------------
alter table public.maclar add column if not exists misafir_kod text;

create unique index if not exists ux_maclar_misafir_kod
  on public.maclar(misafir_kod) where misafir_kod is not null;

comment on column public.maclar.misafir_kod is
  'WhatsApp linkindeki kod. null ise misafir yazma kapalıdır.';


-- ---------------------------------------------------------------------
-- 2) Kim misafir olarak katıldı
-- ---------------------------------------------------------------------
create table if not exists public.mac_misafirleri (
  mac_id    uuid not null references public.maclar(id) on delete cascade,
  profil_id uuid not null references public.profiller(id) on delete cascade,
  ad        text not null check (length(btrim(ad)) between 1 and 24),
  katilma   timestamptz not null default now(),
  primary key (mac_id, profil_id)
);

alter table public.mac_misafirleri enable row level security;

-- Tabelacı ve kurucu kimlerin katıldığını görsün. Misafirin kendisi bu
-- tabloyu okumaz; ihtiyacı olan her şeyi fonksiyonlar döndürüyor.
drop policy if exists p_misafir_oku on public.mac_misafirleri;
create policy p_misafir_oku on public.mac_misafirleri for select to authenticated
using (
  exists (
    select 1 from public.maclar m
    where m.id = mac_misafirleri.mac_id
      and (m.tabelaci_id = auth.uid() or public.masa_kurucusu_mu(m.masa_id))
  )
);

-- insert/update/delete için POLİTİKA YOK: yalnız security definer
-- fonksiyonlar yazabilir.


-- ---------------------------------------------------------------------
-- 3) Yardımcı: celse içindeki toplam el sayısı (çakışma denetimi için)
-- ---------------------------------------------------------------------
create or replace function public.celse_el_sayisi(p_celse jsonb)
returns int
language sql
immutable
as $$
  select coalesce(sum(jsonb_array_length(coalesce(p.value -> 'eller', '[]'::jsonb))), 0)::int
  from jsonb_array_elements(coalesce(p_celse -> 'partiler', '[]'::jsonb)) as p(value);
$$;


-- ---------------------------------------------------------------------
-- 4) Tabelacı: misafir kodunu üret / kapat
-- ---------------------------------------------------------------------
create or replace function public.misafir_kod_uret(p_mac uuid)
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
  from public.maclar
  where id = p_mac and bitti = false
    and (tabelaci_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

  if not found then
    raise exception 'Bu maçın linkini yalnız tabelacısı üretebilir (maç açık olmalı)';
  end if;

  if v_var is not null then
    return v_var;                       -- zaten var, aynısını ver
  end if;

  for i in 1..10 loop
    v_kod := '';
    for j in 1..10 loop
      v_kod := v_kod || substr(v_harf, 1 + floor(random()*length(v_harf))::int, 1);
    end loop;
    begin
      update public.maclar set misafir_kod = v_kod where id = p_mac;
      return v_kod;
    exception when unique_violation then
      null;                             -- çakıştı, yeniden dene
    end;
  end loop;

  raise exception 'Kod üretilemedi, tekrar dene';
end $$;

revoke all on function public.misafir_kod_uret(uuid) from public;
grant execute on function public.misafir_kod_uret(uuid) to authenticated;


create or replace function public.misafir_kod_kapat(p_mac uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.anonim_mi() then
    raise exception 'Misafir oturumu bunu yapamaz';
  end if;

  update public.maclar set misafir_kod = null
  where id = p_mac
    and (tabelaci_id = auth.uid() or public.masa_kurucusu_mu(masa_id));

  if not found then
    raise exception 'Yetkin yok';
  end if;

  delete from public.mac_misafirleri where mac_id = p_mac;
end $$;

revoke all on function public.misafir_kod_kapat(uuid) from public;
grant execute on function public.misafir_kod_kapat(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5) Misafirin gördüğü tek pencere
--    Not: oyuncular tablosundan SADECE bu maçta oturan kişiler dönüyor.
-- ---------------------------------------------------------------------
create or replace function public.misafir_pencere(p_mac uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'mac', jsonb_build_object(
      'id',          m.id,
      'masa_id',     m.masa_id,
      'masa_ad',     s.ad,
      'oyun',        m.oyun,
      'giris',       m.giris,
      'mod',         m.mod,
      'tarih',       m.tarih,
      'yer',         m.yer,
      'parti_hedef', m.parti_hedef,
      'bitti',       m.bitti,
      'celse',       m.celse,
      'el_sayisi',   public.celse_el_sayisi(m.celse),
      'tabelaci_ad', (select o.ad from public.oyuncular o
                       where o.masa_id = m.masa_id and o.profil_id = m.tabelaci_id
                       limit 1)
    ),
    'ayar', s.ayar,
    'oyuncular', coalesce((
      select jsonb_agg(jsonb_build_object('id',o.id,'ad',o.ad,'renk',o.renk,'foto_url',o.foto_url))
      from public.oyuncular o
      where o.masa_id = m.masa_id
    ), '[]'::jsonb),
    'misafirler', coalesce((
      select jsonb_agg(jsonb_build_object('ad',g.ad) order by g.katilma)
      from public.mac_misafirleri g where g.mac_id = m.id
    ), '[]'::jsonb)
  )
  from public.maclar m
  join public.masalar s on s.id = m.masa_id
  where m.id = p_mac;
$$;

revoke all on function public.misafir_pencere(uuid) from public;
-- doğrudan çağrılmaz; aşağıdaki iki fonksiyon kullanır
grant execute on function public.misafir_pencere(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 6) Misafir katılır: adını yazar, o maça bağlanır
-- ---------------------------------------------------------------------
create or replace function public.misafir_katil(p_kod text, p_ad text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mac uuid;
  v_ad  text := btrim(coalesce(p_ad,''));
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

  select id into v_mac
  from public.maclar
  where misafir_kod = btrim(coalesce(p_kod,''))
    and misafir_kod is not null
    and bitti = false;

  if v_mac is null then
    raise exception 'Bu link geçersiz ya da masa kapanmış';
  end if;

  -- kendi profil adını yazdığı adla eşle (yalnız kendi satırı)
  update public.profiller set ad = v_ad where id = auth.uid();

  insert into public.mac_misafirleri (mac_id, profil_id, ad)
  values (v_mac, auth.uid(), v_ad)
  on conflict (mac_id, profil_id) do update set ad = excluded.ad;

  return public.misafir_pencere(v_mac);
end $$;

revoke all on function public.misafir_katil(text,text) from public;
grant execute on function public.misafir_katil(text,text) to authenticated;


-- ---------------------------------------------------------------------
-- 7) Misafir okur
-- ---------------------------------------------------------------------
create or replace function public.misafir_mac(p_kod text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_mac uuid;
begin
  select m.id into v_mac
  from public.maclar m
  join public.mac_misafirleri g on g.mac_id = m.id and g.profil_id = auth.uid()
  where m.misafir_kod = btrim(coalesce(p_kod,'')) and m.misafir_kod is not null;

  if v_mac is null then
    raise exception 'Bu masaya erişimin yok ya da misafir girişi kapatıldı';
  end if;

  return public.misafir_pencere(v_mac);
end $$;

revoke all on function public.misafir_mac(text) from public;
grant execute on function public.misafir_mac(text) to authenticated;


-- ---------------------------------------------------------------------
-- 8) Misafir yazar — YALNIZ celse alanı
--
--  p_beklenen_el: istemcinin yazarken ekranında gördüğü toplam el sayısı.
--  Sunucuda daha fazla el varsa başkası araya yazmış demektir; yazma
--  reddedilir ve güncel hâl döner. Böylece iki kişi birbirinin satırını
--  ezmiyor (JSONB tek parça yazıldığı için asıl risk buydu).
-- ---------------------------------------------------------------------
create or replace function public.misafir_celse_yaz(p_kod text, p_celse jsonb, p_beklenen_el int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mac    uuid;
  v_simdi  int;
  v_yeni   int;
begin
  select m.id, public.celse_el_sayisi(m.celse) into v_mac, v_simdi
  from public.maclar m
  join public.mac_misafirleri g on g.mac_id = m.id and g.profil_id = auth.uid()
  where m.misafir_kod = btrim(coalesce(p_kod,''))
    and m.misafir_kod is not null
    and m.bitti = false;

  if v_mac is null then
    raise exception 'Yazma yetkin yok: link kapatılmış ya da masa bitmiş';
  end if;

  if p_beklenen_el is not null and v_simdi > p_beklenen_el then
    raise exception 'CAKISMA: masaya bu arada başka biri yazdı (sunucu %, sen %)',
      v_simdi, p_beklenen_el;
  end if;

  v_yeni := public.celse_el_sayisi(p_celse);
  if v_yeni < v_simdi then
    raise exception 'CAKISMA: gönderdiğin tabela sunucudakinden eksik (% < %)',
      v_yeni, v_simdi;
  end if;

  -- SADECE celse. bitti, kazanan, zabit, tabelaci_id, masa_id el sürülmez.
  update public.maclar set celse = p_celse where id = v_mac;

  return public.misafir_pencere(v_mac);
end $$;

revoke all on function public.misafir_celse_yaz(text,jsonb,int) from public;
grant execute on function public.misafir_celse_yaz(text,jsonb,int) to authenticated;


-- =====================================================================
--  Kontrol
-- =====================================================================
select 'fonksiyonlar' as ne, string_agg(proname, ', ' order by proname) as sonuc
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('anonim_mi','celse_el_sayisi','misafir_kod_uret','misafir_kod_kapat',
                  'misafir_pencere','misafir_katil','misafir_mac','misafir_celse_yaz')
union all
select 'misafir_kod sutunu', count(*)::text
from information_schema.columns
where table_schema='public' and table_name='maclar' and column_name='misafir_kod'
union all
select 'anonim kilitleri', string_agg(policyname, ', ' order by policyname)
from pg_policies
where schemaname='public' and policyname in ('p_masa_kur','p_uye_istek','p_akis_yaz');
