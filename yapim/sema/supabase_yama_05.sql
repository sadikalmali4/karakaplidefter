-- =====================================================================
--  YAMA 05 — YETKİ SIKILAŞTIRMASI
--
--  İstenen model (02.09.2026, kullanıcı):
--    · Üye geçmişe dönük hiçbir şeyi değiştiremesin.
--    · Üye yalnız KENDİ açtığı masanın tabelasını yazsın.
--    · Kural, kadro, grup ayarı yalnız grubu kuranda olsun.
--
--  Bunların çoğu zaten kurulu (yama 03):
--    · maclar UPDATE: açık tabelayı yalnız tabelacı, kapananı yalnız kurucu.
--    · masalar UPDATE (kurallar): yalnız kurucu.
--    · masa_uyeleri onay/çıkarma: yalnız kurucu.
--
--  Bu yamada kapatılan İKİ GEVŞEK YER:
--    1) İDDİA KARARI: masadaki HERKES her iddiayı "tuttu/tutmadı" diye
--       kapatabiliyordu. Artık yalnız iddianın TARAFLARI veya kurucu.
--    2) OYUNCU EKLEME: her üye başkası adına oyuncu açabiliyordu.
--       Artık kurucu herkesi, üye yalnız KENDİSİNİ ekleyebilir.
--
--  ÖNCE YAMA 01-04 çalıştırılmış olmalı.
--  KULLANIM: Supabase → SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) İDDİA KARARINI TARAFLARA VE KURUCUYA BAĞLA
--    Oyuncu kaydı ile hesap arasındaki bağ oyuncular.profil_id'de.
-- ---------------------------------------------------------------------
create or replace function public.iddia_tarafi_mi(p_kim uuid, p_kime uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.oyuncular o
    where o.profil_id = auth.uid()
      and o.id in (p_kim, p_kime)
  );
$$;

revoke all on function public.iddia_tarafi_mi(uuid,uuid) from public;
grant execute on function public.iddia_tarafi_mi(uuid,uuid) to authenticated;

drop policy if exists p_iddia_karar on public.iddialar;
create policy p_iddia_karar on public.iddialar for update to authenticated
using (
  public.masa_uyesi_mi(masa_id)
  and ( public.masa_kurucusu_mu(masa_id)
        or public.iddia_tarafi_mi(kim_id, kime_id)
        or acan_id = auth.uid() )
)
with check (
  public.masa_uyesi_mi(masa_id)
  and ( public.masa_kurucusu_mu(masa_id)
        or public.iddia_tarafi_mi(kim_id, kime_id)
        or acan_id = auth.uid() )
);

comment on policy p_iddia_karar on public.iddialar is
  'İddiayı yalnız tarafları, kaydı açan veya grubu kuran karara bağlayabilir.';

-- ---------------------------------------------------------------------
-- 2) OYUNCU EKLEMEYİ KURUCUYA (VE KENDİNE) BAĞLA
--    Üye, davet linkiyle gelirken kendi kaydına bağlanıyor; yeni oyuncu
--    açma ihtiyacı yalnız kurucuda. Üye yine kendini ekleyebilir ki
--    kadroda karşılığı olmayan biri sicilini başlatabilsin.
-- ---------------------------------------------------------------------
drop policy if exists p_oyuncu_ekle on public.oyuncular;
create policy p_oyuncu_ekle on public.oyuncular for insert to authenticated
with check (
  public.masa_uyesi_mi(masa_id)
  and ( public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid() )
);

comment on policy p_oyuncu_ekle on public.oyuncular is
  'Kurucu herkesi ekler; üye yalnız kendisini (profil_id = auth.uid()).';

-- ---------------------------------------------------------------------
-- 3) OYUNCU KALDIRMAYI/DÜZENLEMEYİ NETLEŞTİR
--    Kurucu her oyuncuyu; üye YALNIZ kendi bağlı olduğu kaydı düzenler.
--    (Yama 03'teki hâli buydu; burada açıkça tekrar kuruluyor ki
--     yamaların hangi sırada çalıştığı önemli olmasın.)
-- ---------------------------------------------------------------------
drop policy if exists p_oyuncu_duzenle on public.oyuncular;
create policy p_oyuncu_duzenle on public.oyuncular for update to authenticated
using      (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid())
with check (
  (public.masa_kurucusu_mu(masa_id) or profil_id = auth.uid())
  and (profil_id is null or profil_id = auth.uid() or public.masa_kurucusu_mu(masa_id))
);

-- =====================================================================
--  BİTTİ.
--  Sonuç — üyenin yapabildikleri:
--   · Kendi açtığı masanın tabelasını yazmak (kapanınca o da biter).
--   · Kendi oyuncu kaydını düzenlemek (ad, fotoğraf, doğum günü).
--   · Akışa yazmak, kendi yazdığını silmek, tepki vermek.
--   · İddia açmak; tarafı olduğu iddiayı karara bağlamak.
--  Yapamadıkları: kural değiştirmek, kadroya başkasını eklemek,
--  kapanmış maça dokunmak, grubu düzenlemek/silmek, üye almak/atmak.
-- =====================================================================
