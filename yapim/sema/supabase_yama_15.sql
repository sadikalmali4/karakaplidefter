-- =====================================================================
--  YAMA 15 — VAPID ANAHTARI DÖNDÜRÜLDÜ: ESKİ ABONELİKLERİ TEMİZLE
--
--  NEDEN: Eski VAPID özel anahtarı (KcgR95wy…) bir commit yorumunda
--  PUBLIC depoya girmişti. Dosyanın bugünkü hâli temiz ama git geçmişi
--  silinmedi; geçmişte kalan bir anahtarı "artık dosyada yok" diye
--  güvenli saymak yanlış olur. Bu yüzden anahtar DÖNDÜRÜLDÜ (07.09.2026).
--
--  SONUÇ: push_abonelikleri içindeki kayıtlar ESKİ açık anahtarla
--  kurulmuştu (tarayıcı aboneliği hangi applicationServerKey ile
--  kurulduysa ona bağlı kalır). Yeni anahtarla o aboneliklere bildirim
--  GÖNDERİLEMEZ — sunucu 403 alır. Ölü kayıt bırakmanın faydası yok:
--  her gönderimde hata üretir ve "kime gitti" tablosunu kirletir.
--
--  KULLANICIYA ETKİSİ: uygulamayı bir kez açan herkes yeniden abone olur
--  (pushHazirla izin zaten verilmişse SORMADAN abone ediyor). Yani kimse
--  elle bir şey yapmayacak; bildirimler ilk açılışta kendiliğinden döner.
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run.
-- =====================================================================

-- Kaç kayıt silinecek, önce görülsün (Run'dan sonra ikinci sonuç sekmesi)
select count(*) as silinecek_abonelik from public.push_abonelikleri;

-- Eski anahtarla kurulmuş bütün abonelikler
delete from public.push_abonelikleri;

select count(*) as kalan_abonelik from public.push_abonelikleri;

-- =====================================================================
--  BİTTİ. Sırasıyla yapılacaklar (yalnız Supabase panosunda):
--   1) Edge Functions → bildirim-gonder → Secrets:
--        VAPID_PUBLIC  = (Masaüstü/VAPID_YENI_ANAHTAR.txt içindeki)
--        VAPID_PRIVATE = (aynı dosyadaki)
--        VAPID_SUBJECT = mailto:ik@alga.com.tr
--   2) Bu SQL'i çalıştır (eski abonelikler gitsin).
--   3) VAPID_YENI_ANAHTAR.txt dosyasını SİL.
--  Uygulamadaki açık anahtar 10.3'te güncellendi; kimsenin bir şey
--  yapması gerekmiyor, ilk açılışta yeniden abone olunuyor.
-- =====================================================================
