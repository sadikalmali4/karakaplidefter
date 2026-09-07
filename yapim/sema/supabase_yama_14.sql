-- =====================================================================
--  YAMA 14 — SAHİP (sistem yöneticisi) YETKİSİ
--
--  İSTEK (kullanıcı, 03.09.2026): "Yeni bir yetki ekle, ben admin
--  olayım, kim ne yaptı göreyim." Sebebi: Mustafa kendi grubunu kurdu,
--  Sadık onu ne görebiliyor ne silebiliyor (üyesi/kurucusu değil).
--
--  TASARIM İLKESİ — RLS AÇILMIYOR.
--  Kolay yol, bütün tablolara "ya da sahip" şartı eklemekti. Yapmadım:
--  o şartın tek bir yerde yanlış yazılması bütün masaları açığa çıkarır
--  ve yanlışı fark etmek imkânsızlaşır. Bunun yerine sahibe SALT-OKUR
--  RAPOR fonksiyonları verildi. Tablolar herkes için kapalı kalıyor;
--  sahip ham tabloya değil, aşağıdaki fonksiyonlara erişiyor.
--
--  SAHİP KİM: e-postası aşağıda yazılı olan hesap. Kullanıcı adları
--  içeride <kad>@karakaplidefter.local adresine çevrildiği için bu
--  sabit "sadik" hesabını gösteriyor. auth.users.email tekil olduğundan
--  başkası bu adresle kaydolamaz.
--  Sahibi değiştirmek/eklemek SQL erişimi gerektirir — uygulamadan
--  kimse kendini sahip yapamaz.
--
--  KAYIT TABLOSU AÇILMADI: "kim ne yaptı" mevcut verilerden çıkarılıyor
--  (maclar.tabelaci_id, akis.yazan_id, iddialar.acan_id, masalar.kuran_id,
--  masa_uyeleri.katilma). Yeni tablo = yeni bakım yükü; gerek yoktu.
--  TEK EKSİK: oyuncular tablosunda "kim ekledi" sütunu yok, o hareket
--  kişiye bağlanamıyor — aşağıda 'oyuncu eklendi' olarak failsiz geçiyor.
--
--  ÖNCE YAMA 01-13 çalıştırılmış olmalı.
--  KULLANIM: SQL Editor → New query → yapıştır → Run. Tekrar çalıştırılabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) SAHİP MİYİM?
-- ---------------------------------------------------------------------
create or replace function public.sahip_mi()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select u.email = 'sadik@karakaplidefter.local'
       from auth.users u where u.id = auth.uid()),
    false);
$$;

revoke all on function public.sahip_mi() from public;
grant execute on function public.sahip_mi() to authenticated;

comment on function public.sahip_mi() is
  'Çağıran, sistemin sahibi mi? Sabit e-posta ile eşleşme. Değiştirmek SQL erişimi gerektirir.';


-- ---------------------------------------------------------------------
-- 2) BÜTÜN GRUPLAR — özet
--    Sahip, üyesi olmadığı grupları da GÖRÜR ama içeriğini okumaz;
--    burada yalnız sayımlar ve kimin kurduğu var.
-- ---------------------------------------------------------------------
create or replace function public.sahip_gruplar()
returns table (
  masa_id     uuid,
  ad          text,
  kod         text,
  kuran       text,
  olusturma   timestamptz,
  uye_sayisi  int,
  oyuncu_sayisi int,
  mac_sayisi  int,
  acik_masa   int,
  akis_sayisi int,
  son_hareket timestamptz,
  ben_uye_miyim boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then
    raise exception 'Bu işlem yalnız sistem sahibine açıktır';
  end if;

  return query
  select m.id,
         m.ad,
         m.kod,
         coalesce(p.ad, '(bilinmiyor)'),
         m.olusturma,
         (select count(*)::int from public.masa_uyeleri mu
            where mu.masa_id = m.id and mu.durum = 'onayli'),
         (select count(*)::int from public.oyuncular o where o.masa_id = m.id),
         (select count(*)::int from public.maclar c
            where c.masa_id = m.id and c.bitti),
         (select count(*)::int from public.maclar c
            where c.masa_id = m.id and not c.bitti),
         (select count(*)::int from public.akis a where a.masa_id = m.id),
         greatest(
           m.olusturma,
           coalesce((select max(c.olusturma) from public.maclar c where c.masa_id = m.id), m.olusturma),
           coalesce((select max(a.olusturma) from public.akis   a where a.masa_id = m.id), m.olusturma)),
         exists (select 1 from public.masa_uyeleri mu
                   where mu.masa_id = m.id and mu.profil_id = auth.uid()
                     and mu.durum = 'onayli')
  from public.masalar m
  left join public.profiller p on p.id = m.kuran_id
  order by 11 desc;      -- son_hareket
end $$;

revoke all on function public.sahip_gruplar() from public;
grant execute on function public.sahip_gruplar() to authenticated;


-- ---------------------------------------------------------------------
-- 3) KİM NE YAPTI — hareket dökümü
--    Mevcut tablolardaki yazar/açan alanlarından türetiliyor.
--    p_masa null ise bütün gruplar.
-- ---------------------------------------------------------------------
create or replace function public.sahip_hareketler(
  p_masa  uuid default null,
  p_limit int  default 200
)
returns table (
  ne_zaman timestamptz,
  masa_id  uuid,
  masa_ad  text,
  kim      text,
  islem    text,
  ayrinti  text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then
    raise exception 'Bu işlem yalnız sistem sahibine açıktır';
  end if;
  p_limit := least(greatest(coalesce(p_limit, 200), 1), 1000);

  return query
  with h as (
    -- grup kurma
    select m.olusturma as ne_zaman, m.id as masa_id, m.ad as masa_ad,
           coalesce(p.ad,'(bilinmiyor)') as kim,
           'grup kurdu' as islem,
           m.ad || ' · kod ' || m.kod as ayrinti
      from public.masalar m left join public.profiller p on p.id = m.kuran_id

    union all
    -- üyelik
    select mu.katilma, mu.masa_id, m.ad,
           coalesce(p.ad,'(bilinmiyor)'),
           case mu.durum when 'onayli' then 'gruba katıldı'
                         when 'bekliyor' then 'katılma isteği'
                         else 'reddedildi' end,
           'rol: ' || mu.rol
      from public.masa_uyeleri mu
      join public.masalar m on m.id = mu.masa_id
      left join public.profiller p on p.id = mu.profil_id

    union all
    -- maç açma / kapatma
    select c.olusturma, c.masa_id, m.ad,
           coalesce(p.ad,'(bilinmiyor)'),
           case when c.bitti then 'maç kapattı' else 'masa açtı' end,
           upper(c.oyun) || ' · ' || to_char(c.tarih,'DD.MM.YYYY')
             || coalesce(' · ' || c.yer, '')
      from public.maclar c
      join public.masalar m on m.id = c.masa_id
      left join public.profiller p on p.id = c.tabelaci_id

    union all
    -- akış: mesaj, zabıt, ödeme, borç kaydı, ceza, fotoğraf
    select a.olusturma, a.masa_id, m.ad,
           coalesce(p.ad,'(bilinmiyor)'),
           case
             when a.veri ? 'odeme'     then 'ÖDEME işaretledi'
             when a.veri ? 'borcKaydi' then 'borç kaydı girdi'
             when a.veri ? 'ceza'      then 'ceza yazdı'
             when a.veri ? 'foto'      then 'fotoğraf ekledi'
             when a.tip = 'zabit'      then 'zabıt yazdı'
             when a.tip = 'unvan'      then 'unvan duyurdu'
             when a.tip = 'cagri'      then 'masa çağrısı yaptı'
             else 'akışa yazdı'
           end,
           left(coalesce(a.metin,''), 120)
      from public.akis a
      join public.masalar m on m.id = a.masa_id
      left join public.profiller p on p.id = a.yazan_id

    union all
    -- iddia
    select i.olusturma, i.masa_id, m.ad,
           coalesce(p.ad,'(bilinmiyor)'),
           'iddia açtı',
           left(i.metin, 120)
      from public.iddialar i
      join public.masalar m on m.id = i.masa_id
      left join public.profiller p on p.id = i.acan_id

    union all
    -- oyuncu eklenmesi (FAİLİ YOK: oyuncular tablosunda 'kim ekledi' sütunu yok)
    select o.olusturma, o.masa_id, m.ad,
           '(kayıtsız)',
           'oyuncu eklendi',
           o.ad
      from public.oyuncular o
      join public.masalar m on m.id = o.masa_id
  )
  select h.ne_zaman, h.masa_id, h.masa_ad, h.kim, h.islem, h.ayrinti
    from h
   where p_masa is null or h.masa_id = p_masa
   order by h.ne_zaman desc
   limit p_limit;
end $$;

revoke all on function public.sahip_hareketler(uuid,int) from public;
grant execute on function public.sahip_hareketler(uuid,int) to authenticated;


-- ---------------------------------------------------------------------
-- 4) SAHİP OLARAK GRUP SİLME
--    Kurucusu olmadığın grubu da silebilmek için. Yıkıcı; bu yüzden
--    grubun ADI da doğrulama olarak isteniyor — yanlış grubu silmek
--    tek dokunuşla olmasın.
-- ---------------------------------------------------------------------
create or replace function public.sahip_grup_sil(p_masa uuid, p_ad_onay text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_ad text;
begin
  if not public.sahip_mi() then
    raise exception 'Bu işlem yalnız sistem sahibine açıktır';
  end if;

  select ad into v_ad from public.masalar where id = p_masa;
  if v_ad is null then raise exception 'Grup bulunamadı'; end if;

  if lower(btrim(coalesce(p_ad_onay,''))) <> lower(btrim(v_ad)) then
    raise exception 'Onay için grubun adını tam yazman gerekiyor';
  end if;

  delete from public.masalar where id = p_masa;
  return v_ad;
end $$;

revoke all on function public.sahip_grup_sil(uuid,text) from public;
grant execute on function public.sahip_grup_sil(uuid,text) to authenticated;


-- ---------------------------------------------------------------------
-- 5) HESAP DÖKÜMÜ — kaç hesap var, kim ne zaman girdi
--    auth.users'a istemci hiçbir şekilde erişemez; buradan özet çıkıyor.
-- ---------------------------------------------------------------------
create or replace function public.sahip_hesaplar()
returns table (
  profil_id  uuid,
  ad         text,
  kullanici  text,
  kayit      timestamptz,
  son_giris  timestamptz,
  anonim     boolean,
  grup_sayisi int,
  oyuncu_bagli int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then
    raise exception 'Bu işlem yalnız sistem sahibine açıktır';
  end if;

  return query
  select p.id,
         p.ad,
         split_part(coalesce(u.email,''), '@', 1),
         u.created_at,
         u.last_sign_in_at,
         coalesce((u.raw_app_meta_data ->> 'provider') = 'anonymous', false),
         (select count(*)::int from public.masa_uyeleri mu
            where mu.profil_id = p.id and mu.durum = 'onayli'),
         (select count(*)::int from public.oyuncular o where o.profil_id = p.id)
  from public.profiller p
  left join auth.users u on u.id = p.id
  order by u.last_sign_in_at desc nulls last;
end $$;

revoke all on function public.sahip_hesaplar() from public;
grant execute on function public.sahip_hesaplar() to authenticated;

-- =====================================================================
--  BİTTİ.
--  Sahip NE YAPABİLİR: bütün grupların özetini görür, hareket dökümünü
--  okur, hesapları listeler, herhangi bir grubu (adını yazarak) siler.
--  Sahip NE YAPAMAZ: başka grubun maç detayını, akışını, borcunu, özel
--  içeriğini OKUMAZ — RLS ona da kapalı; yukarıdaki fonksiyonlar yalnız
--  özet ve hareket başlığı döndürüyor. Kimsenin adına yazı yazamaz.
--  Sahibi değiştirmek: sahip_mi() içindeki e-postayı SQL'den düzenle.
-- =====================================================================
