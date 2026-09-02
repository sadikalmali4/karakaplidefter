-- =====================================================================
--  YAMA 04 — AYNI ANDA BİRDEN ÇOK MASA + AKIŞ (konuşma/yorum/tepki)
--
--  NE DEĞİŞİYOR
--  1) Bir grupta aynı anda BİRDEN ÇOK açık tabela olabilir.
--     (Yama 03'te tek tabelaya kilitlemiştim; 8 kişi ikiye bölünüp iki
--      masada oynayınca bu kilit yanlış oldu.)
--  2) akis.yanit_id — akıştaki bir girdinin altına YORUM yazılabilsin.
--  3) Tepkiler de canlı aksın.
--
--  ÖNCE YAMA 01, 02, 03 çalıştırılmış olmalı.
--  KULLANIM: Supabase → SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TEK AÇIK TABELA KİLİDİNİ KALDIR
--    Artık "1. Masa" ve "2. Masa" aynı akşam paralel yürüyebilir.
--    Hangi tabelayı kimin yazdığı maclar.tabelaci_id'de duruyor; iki
--    kişi iki masayı ayrı ayrı yazar, birbirinin satırına dokunamaz.
-- ---------------------------------------------------------------------
drop index if exists public.ux_maclar_tek_acik;

-- ---------------------------------------------------------------------
-- 2) AKIŞTA YORUM
--    Üst düzey girdi: yanit_id null. Yorum: yanit_id = üstteki girdi.
--    Girdi silinince altındaki yorumlar da gider (cascade).
-- ---------------------------------------------------------------------
alter table public.akis
  add column if not exists yanit_id uuid references public.akis(id) on delete cascade;

create index if not exists ix_akis_yanit on public.akis(yanit_id)
  where yanit_id is not null;

-- üst düzey akış listesi için
create index if not exists ix_akis_masa_ust on public.akis(masa_id, olusturma desc)
  where yanit_id is null;

-- makul uzunluk sınırı (roman yazılmasın, tabloyu şişirmesin)
do $$ begin
  alter table public.akis add constraint akis_metin_boy
    check (metin is null or length(metin) <= 4000);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 3) CANLI YAYIN — tepkiler de anında görünsün
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.akis_tepkileri;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 4) KİŞİYE ÖZEL DAVET — onay beklemeden içeri
--
--    Sorun: normal akışta kodla katılan "bekliyor"a düşüyor, kurucu
--    onaylayana kadar bekliyor. 8 kişilik arkadaş grubunda gereksiz sürtünme.
--
--    Çözüm: davet linki bir OYUNCUYA bağlanır (…?kod=XXX&oyuncu=<uuid>).
--    Link yalnız o oyuncu SAHİPSİZKEN çalışır; ilk kullanan üstlenince
--    kayıt sahiplenilmiş olur ve link bir daha kimseyi içeri almaz.
--    Yani davet TEK KULLANIMLIK: iletilse bile ikinci kişiyi sokmaz.
--    Genel koda (masaya_katil) dokunulmadı; o hâlâ onaydan geçiyor.
-- ---------------------------------------------------------------------
create or replace function public.davetle_katil(p_kod text, p_oyuncu uuid)
returns table (masa_id uuid, masa_ad text, oyuncu_ad text)
language plpgsql
security definer
set search_path = public
as $$
declare v_masa public.masalar%rowtype; v_oy public.oyuncular%rowtype;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın'; end if;

  select * into v_masa from public.masalar where upper(kod) = upper(btrim(p_kod));
  if not found then raise exception 'Böyle bir grup kodu yok'; end if;

  select * into v_oy from public.oyuncular where id = p_oyuncu;
  if not found or v_oy.masa_id <> v_masa.id then
    raise exception 'Bu davet bu gruba ait değil';
  end if;

  -- zaten bu hesaba bağlıysa: sorunsuz, tekrar girişte de çalışsın
  if v_oy.profil_id = auth.uid() then
    insert into public.masa_uyeleri (masa_id, profil_id, rol, durum)
    values (v_masa.id, auth.uid(), 'uye', 'onayli')
    on conflict (masa_id, profil_id) do update set durum = 'onayli';
    return query select v_masa.id, v_masa.ad, v_oy.ad;
    return;
  end if;

  if v_oy.profil_id is not null then
    raise exception 'Bu davet kullanılmış. Gruba kuran kişi seni eklesin.';
  end if;
  if exists (select 1 from public.oyuncular
             where masa_id = v_masa.id and profil_id = auth.uid()) then
    raise exception 'Bu grupta zaten bir oyuncuya bağlısın';
  end if;

  insert into public.masa_uyeleri (masa_id, profil_id, rol, durum)
  values (v_masa.id, auth.uid(), 'uye', 'onayli')
  on conflict (masa_id, profil_id) do update set durum = 'onayli';

  update public.oyuncular set profil_id = auth.uid() where id = p_oyuncu;

  return query select v_masa.id, v_masa.ad, v_oy.ad;
end $$;

revoke all on function public.davetle_katil(text,uuid) from public;
grant execute on function public.davetle_katil(text,uuid) to authenticated;

-- =====================================================================
--  BİTTİ.
--   · Bir grupta istediğin kadar masa aynı anda açık olabilir.
--   · Akıştaki her girdinin altına yorum yazılır, emoji ile tepki verilir.
--   · Kişiye özel davet linki onay beklemeden içeri alır, tek kullanımlık.
-- =====================================================================
