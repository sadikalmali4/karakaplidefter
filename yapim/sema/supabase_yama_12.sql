-- =====================================================================
--  YAMA 12 — GÜVENLİK: İÇ PENCERE FONKSİYONLARINI KAPAT
--
--  BULGU (03.09.2026, yamaların canlıda olup olmadığını yoklarken):
--  Yama 09 ve 10'daki fonksiyonlar KİMLİK DOĞRULAMASIZ çağrılabiliyor.
--  Sayfanın açık anahtarıyla (publishable key) yapılan çıplak bir POST
--  isteği fonksiyonu ÇALIŞTIRIYOR:
--
--      POST /rest/v1/rpc/misafir_pencere  {"p_mac": "<uuid>"}   → çalıştı
--      POST /rest/v1/rpc/tahmin_pencere   {"p_hafta":"<uuid>"}  → çalıştı
--
--  SEBEP: betiklerde "revoke all ... from public" yazdım ama Supabase
--  public şemada ALTER DEFAULT PRIVILEGES ile anon/authenticated
--  rollerine AYRI BİR grant veriyor. PUBLIC'ten geri almak o ayrı
--  grant'ı kaldırmıyor — anon rolünün EXECUTE yetkisi yerinde kalıyor.
--
--  RİSK: misafir_pencere / tahmin_pencere SECURITY DEFINER ve İÇLERİNDE
--  YETKİ DENETİMİ YOK — çünkü yalnızca öteki fonksiyonlardan
--  çağrılacaklardı, o fonksiyonlar denetimi yapıyor. Doğrudan
--  çağrılabildikleri için, elinde bir maç/hafta kimliği (uuid) olan
--  herkes o maçın tabelasını, oyuncu adlarını ve haftanın bütün
--  tahminlerini okuyabilirdi. Kimliklerin tahmin edilemez olması
--  güvenlik sayılmaz.
--
--  ÇÖZÜM — iki katman:
--    1) anon rolünden EXECUTE geri alınıyor (yama 09/10/11'in bütün
--       fonksiyonları). Artık oturumsuz istek fonksiyona hiç giremez.
--    2) İki pencere fonksiyonunun İÇİNE yetki şartı konuyor: çağıran
--       ya masanın üyesi olacak ya o maça/haftaya kayıtlı misafir.
--       Böylece grant bir gün yine sızsa da veri çıkmaz.
--
--  Meşru yol bozulmuyor: misafir_mac / misafir_celse_yaz /
--  tahmin_misafir_pencere / tahmin_misafir_yaz zaten çağıranı
--  mac_misafirleri / hafta_misafirleri tablosunda doğruluyor; pencereye
--  vardıklarında auth.uid() o tablolarda kayıtlı oluyor.
--
--  KULLANIM: SQL Editor → New query → hepsini yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) anon rolünden EXECUTE geri al
--    (authenticated'de kalıyor; uygulamanın kullandığı rol o)
-- ---------------------------------------------------------------------
revoke execute on function public.anonim_mi()                              from anon;
revoke execute on function public.celse_el_sayisi(jsonb)                   from anon;
revoke execute on function public.misafir_kod_uret(uuid)                   from anon;
revoke execute on function public.misafir_kod_kapat(uuid)                  from anon;
revoke execute on function public.misafir_pencere(uuid)                    from anon;
revoke execute on function public.misafir_katil(text,text)                 from anon;
revoke execute on function public.misafir_mac(text)                        from anon;
revoke execute on function public.misafir_celse_yaz(text,jsonb,int)        from anon;
revoke execute on function public.tahmin_kod_uret(uuid)                    from anon;
revoke execute on function public.tahmin_kod_kapat(uuid)                   from anon;
revoke execute on function public.tahmin_pencere(uuid)                     from anon;
revoke execute on function public.tahmin_misafir_katil(text,text)          from anon;
revoke execute on function public.tahmin_misafir_pencere(text)             from anon;
revoke execute on function public.tahmin_misafir_yaz(text,uuid,int,int)    from anon;
revoke execute on function public.akis_hesap_kaydi_mi(jsonb)               from anon;

-- Bundan sonra public şemada açılacak fonksiyonlar da anon'a kapalı olsun.
alter default privileges in schema public revoke execute on functions from anon;


-- ---------------------------------------------------------------------
-- 2) misafir_pencere: içine yetki şartı
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
      select jsonb_agg(jsonb_build_object('ad',g.ad,'oyuncu_id',g.oyuncu_id) order by g.katilma)
      from public.mac_misafirleri g where g.mac_id = m.id
    ), '[]'::jsonb),
    'ben', (select jsonb_build_object('ad',g.ad,'oyuncu_id',g.oyuncu_id,'yeni_acti',g.yeni_acti)
              from public.mac_misafirleri g
              where g.mac_id = m.id and g.profil_id = auth.uid())
  )
  from public.maclar m
  join public.masalar s on s.id = m.masa_id
  where m.id = p_mac
    -- YETKİ: masanın üyesi ya da bu maça kayıtlı misafir
    and (
      public.masa_uyesi_mi(m.masa_id)
      or exists (select 1 from public.mac_misafirleri g
                 where g.mac_id = m.id and g.profil_id = auth.uid())
    );
$$;

revoke all on function public.misafir_pencere(uuid) from public;
revoke execute on function public.misafir_pencere(uuid) from anon;
grant execute on function public.misafir_pencere(uuid) to authenticated;

comment on function public.misafir_pencere(uuid) is
  'Bir maçın misafir penceresi. Çağıran masanın üyesi ya da o maça '
  'kayıtlı misafir olmalı; yoksa boş döner. Doğrudan çağrılmaz.';


-- ---------------------------------------------------------------------
-- 3) tahmin_pencere: içine yetki şartı
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
  where h.id = p_hafta
    -- YETKİ: masanın üyesi ya da bu haftaya kayıtlı misafir
    and (
      public.masa_uyesi_mi(h.masa_id)
      or exists (select 1 from public.hafta_misafirleri g
                 where g.hafta_id = h.id and g.profil_id = auth.uid())
    );
$$;

revoke all on function public.tahmin_pencere(uuid) from public;
revoke execute on function public.tahmin_pencere(uuid) from anon;
grant execute on function public.tahmin_pencere(uuid) to authenticated;

comment on function public.tahmin_pencere(uuid) is
  'Bir tahmin haftasının penceresi. Çağıran masanın üyesi ya da o '
  'haftaya kayıtlı misafir olmalı; yoksa boş döner. Doğrudan çağrılmaz.';


-- =====================================================================
--  Kontrol — anon'da EXECUTE kalmış mı?
--  Beklenen: 0 satır. Satır çıkarsa o fonksiyon hâlâ açıktır.
-- =====================================================================
select p.proname, r.rolname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
cross join (select 'anon'::name as rolname) r
where p.proname in ('anonim_mi','celse_el_sayisi','misafir_kod_uret','misafir_kod_kapat',
                    'misafir_pencere','misafir_katil','misafir_mac','misafir_celse_yaz',
                    'tahmin_kod_uret','tahmin_kod_kapat','tahmin_pencere',
                    'tahmin_misafir_katil','tahmin_misafir_pencere','tahmin_misafir_yaz',
                    'akis_hesap_kaydi_mi')
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;
