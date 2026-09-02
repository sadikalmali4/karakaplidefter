-- =====================================================================
--  YAMA 03 — TABELA BULUTA BAĞLANIYOR
--
--  NE DEĞİŞİYOR
--  1) masalar.ayar  : her masanın kendi ev kuralları (61 hedef, 101 cezaları,
--                     müeyyide metinleri). Artık kurallar cihazda değil masada.
--  2) maclar.celse  : bir maçın tamamı (partiler + eller + hızlı giriş) tek
--                     JSONB belge olarak. Aşağıda gerekçesi var.
--  3) partiler / eller / mac_oyunculari tabloları KALDIRILIYOR.
--  4) Bir masada aynı anda yalnız BİR açık tabela olabilir (veri bütünlüğü).
--
--  NEDEN BELGE (JSONB), NEDEN NORMALİZASYON DEĞİL
--  · İstatistiğin tamamı istemcide hesaplanıyor; SQL tarafında el sorgusu
--    yapan tek bir yer yok. Normalizasyonun getirisi kullanılmıyor.
--  · Tabelacı el eklerken tek satır yazıyor: yarım yazılmış maç durumu
--    (parti yazıldı, elleri yazılmadı) fiilen imkânsız hâle geliyor.
--  · Bir maç belgesi ~2-5 KB. Yılda birkaç yüz maç = birkaç MB.
--  Bu tablolar BOŞ olduğu için kayıp yok. Doluysa aşağıdaki DROP'ları
--  çalıştırmadan önce bana söyle.
--
--  ÖNCE YAMA 01 ve 02 çalıştırılmış olmalı.
--  KULLANIM: Supabase → SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MASA AYARLARI
--    Kuralı yalnız masayı KURAN değiştirebilir (p_masa_duzenle zaten öyle).
--    Bilerek böyle: kural ortada oynanırken değişmesin.
-- ---------------------------------------------------------------------
alter table public.masalar
  add column if not exists ayar jsonb not null default '{}'::jsonb;

comment on column public.masalar.ayar is
  'Masanın ev kuralları: {"batak":{...},"yz":{...}}. Yalnız kurucu değiştirebilir.';

-- ---------------------------------------------------------------------
-- 2) MAÇ = TEK BELGE
-- ---------------------------------------------------------------------
alter table public.maclar
  add column if not exists celse jsonb not null default '{}'::jsonb;

comment on column public.maclar.celse is
  'Maçın tamamı: {oyun,giris,tarih,yer,tabelaci,partiHedef,takimlar|oyuncular,esler,partiler[],hizli,not,kazanan,zabit}. Oyuncu kimlikleri public.oyuncular.id.';

-- kazanan/zabit sütunları artık belgenin içinde; şemada kalsınlar diye
-- zorunluluk yok. Eski NOT NULL'lar zaten yoktu.

-- ---------------------------------------------------------------------
-- 3) ARTIK KULLANILMAYAN TABLOLAR
-- ---------------------------------------------------------------------
drop table if exists public.eller           cascade;
drop table if exists public.partiler        cascade;
drop table if exists public.mac_oyunculari  cascade;
drop function if exists public.parti_maci(uuid);

-- ---------------------------------------------------------------------
-- 4) MASA BAŞINA TEK AÇIK TABELA
--    İki kişi aynı anda "Tabelayı Aç" derse ikincisi hata alsın; sessizce
--    iki paralel maç açılıp biri kaybolmasın.
-- ---------------------------------------------------------------------
create unique index if not exists ux_maclar_tek_acik
  on public.maclar (masa_id) where (bitti = false);

create index if not exists ix_maclar_masa_bitti
  on public.maclar (masa_id, bitti, tarih desc);

-- ---------------------------------------------------------------------
-- 5) YAZMA YETKİSİ — kim neyi değiştirebilir
--    · Açık tabelayı YALNIZ tabelacı yazar.
--    · Kapanmış maça tabelacı da dokunamaz; yalnız kurucu düzeltir/siler.
--      (Sicilin geriye dönük sessizce değişmemesi için.)
-- ---------------------------------------------------------------------
drop policy if exists p_mac_guncelle on public.maclar;
create policy p_mac_guncelle on public.maclar for update to authenticated
using      ((tabelaci_id = auth.uid() and bitti = false) or public.masa_kurucusu_mu(masa_id))
with check ((tabelaci_id = auth.uid())                   or public.masa_kurucusu_mu(masa_id));

drop policy if exists p_mac_sil on public.maclar;
create policy p_mac_sil on public.maclar for delete to authenticated
using ((tabelaci_id = auth.uid() and bitti = false) or public.masa_kurucusu_mu(masa_id));

-- ---------------------------------------------------------------------
-- 6) CANLI YAYIN — iddia defteri de aksın
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.iddialar;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.oyuncular;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 7) TEK SEFERLİK: mevcut masalara varsayılan kuralları yaz
-- ---------------------------------------------------------------------
update public.masalar set ayar = jsonb_build_object(
  'batak', jsonb_build_object('hedef',61,'minIhale',7,'toplamEl',13,
                              'tutunca','alinan','batinca','alinan','partiHedef',2),
  'yz',    jsonb_build_object('elSayisi',11,'partiHedef',1,'bitiren',-101,'acamayan',200,
                              'cifteCarpan',2,'okeyAktif',false,'okeyCarpan',2,
                              'muey3','Çay ısmarlar','muey4','Hesabı öder')
) where ayar = '{}'::jsonb;


-- ---------------------------------------------------------------------
-- 8) "BEN HANGİSİYİM?" — hesabı oyuncu kaydına bağlama
--
--    Yama 02'de bunu yalnız kurucu yapabiliyordu; masaya yeni katılan
--    kişi kurucu uyanana kadar kendi sicilini göremiyordu.
--    Artık: SAHİPSİZ bir oyuncu kaydını, o masanın onaylı üyesi kendisi
--    üstlenebilir. Sahibi olan kaydı kimse alamaz — onu yine kurucu taşır.
-- ---------------------------------------------------------------------
create or replace function public.oyuncu_sahiplen(p_oyuncu uuid)
returns setof public.oyuncular
language plpgsql
security definer
set search_path = public
as $$
declare v_masa uuid; v_sahip uuid;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın'; end if;

  select masa_id, profil_id into v_masa, v_sahip
    from public.oyuncular where id = p_oyuncu;
  if v_masa is null then raise exception 'Oyuncu bulunamadı'; end if;

  if not public.masa_uyesi_mi(v_masa) then
    raise exception 'Bu masanın onaylı üyesi değilsin';
  end if;
  if v_sahip is not null then
    if v_sahip = auth.uid() then
      return query select * from public.oyuncular o where o.id = p_oyuncu;
      return;
    end if;
    raise exception 'Bu oyuncu başka bir hesaba bağlı. Masayı kuran taşıyabilir.';
  end if;
  if exists (select 1 from public.oyuncular
             where masa_id = v_masa and profil_id = auth.uid()) then
    raise exception 'Bu masada zaten bir oyuncuya bağlısın';
  end if;

  update public.oyuncular set profil_id = auth.uid() where id = p_oyuncu;
  return query select * from public.oyuncular o where o.id = p_oyuncu;
end $$;

revoke all on function public.oyuncu_sahiplen(uuid) from public;
grant execute on function public.oyuncu_sahiplen(uuid) to authenticated;

-- kurucunun bağı KOPARABİLMESİ de lazım (yanlış eşleşmeyi geri almak için)
create or replace function public.oyuncu_coz(p_oyuncu uuid)
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
  update public.oyuncular set profil_id = null where id = p_oyuncu;
  return query select * from public.oyuncular o where o.id = p_oyuncu;
end $$;

revoke all on function public.oyuncu_coz(uuid) from public;
grant execute on function public.oyuncu_coz(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9) GÜVENLİK SIKILAŞTIRMASI
--    Yama 02'de oyuncu eklerken profil_id serbestti: masadaki biri,
--    başkasının hesabına bağlı bir oyuncu kaydı açabiliyordu (yer kapma).
--    Artık ya sahipsiz açılır, ya kendi adına.
-- ---------------------------------------------------------------------
drop policy if exists p_oyuncu_ekle on public.oyuncular;
create policy p_oyuncu_ekle on public.oyuncular for insert to authenticated
with check (
  public.masa_uyesi_mi(masa_id)
  and (profil_id is null or profil_id = auth.uid())
);

-- aynı şekilde düzenlemede de başkasının hesabına bağlanamasın
drop policy if exists p_oyuncu_duzenle on public.oyuncular;
create policy p_oyuncu_duzenle on public.oyuncular for update to authenticated
using      (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid())
with check (
  (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid())
  and (profil_id is null or profil_id = auth.uid()
       or public.masa_kurucusu_mu(masa_id))
);

-- =====================================================================
--  BİTTİ.
--  Özet:
--   · Kural masaya ait, değiştiren kurucu.
--   · Maç tek belge; açık tabelayı tabelacı yazar, kapananı kurucu düzeltir.
--   · Masada aynı anda tek açık tabela.
--   · Sahipsiz oyuncu kaydını üye kendi üstlenir; sahipliyi kurucu taşır.
-- =====================================================================
