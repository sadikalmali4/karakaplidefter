-- =====================================================================
--  YAMA 11 — BORÇ ÖDEMESİNİ YALNIZ MASAYI KURAN İŞARETLER
--
--  OLAN (kullanıcı, 03.09.2026): "Dün Hüseyin, Ali'yle olan borcunu
--  ödedim dedi ve ödediği akışa düştü. Ben dışında kimse
--  işaretleyememesi lazım."
--
--  SEBEP: ödeme kaydı bir AKIŞ satırı (veri.odeme). Akışa masanın her
--  üyesi yazabildiği için borçlu kendi ödemesini kayda geçirebiliyordu
--  ve borç tabelasından düşüyordu. Düğmeyi gizlemek yetmez — kural
--  veritabanında olmalı, yoksa uygulamayı kurcalayan yine yazar.
--
--  ÇÖZÜM: akış satırı veri.odeme ya da veri.borcKaydi taşıyorsa,
--  o satırı yalnız masayı KURAN yazabilir. Sohbet, zabıt, çağrı,
--  iddia gibi öteki akış satırları eskisi gibi herkese açık.
--
--  Aynı kilit GÜNCELLEME ve SİLME için de kondu: borçlu, kurucunun
--  yazdığı ödeme satırını sonradan değiştirip/silip tabloyu
--  oynatamasın. (Kurucu kendi yazdığını silebilir.)
--
--  ÖN KOŞUL: yama 09 çalıştırılmış olmalı (anonim_mi).
--
--  KULLANIM: SQL Editor → New query → hepsini yapıştır → Run
-- =====================================================================

-- Bu akış satırı bir HESAP kaydı mı? (ödeme ya da elle borç kaydı)
create or replace function public.akis_hesap_kaydi_mi(p_veri jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(p_veri ? 'odeme', false) or coalesce(p_veri ? 'borcKaydi', false);
$$;

grant execute on function public.akis_hesap_kaydi_mi(jsonb) to authenticated;


-- --- YAZMA ------------------------------------------------------------
drop policy if exists p_akis_yaz on public.akis;
create policy p_akis_yaz on public.akis for insert to authenticated
with check (
  yazan_id = auth.uid()
  and public.masa_uyesi_mi(masa_id)
  and not public.anonim_mi()
  and (
    not public.akis_hesap_kaydi_mi(veri)          -- sıradan akış satırı
    or public.masa_kurucusu_mu(masa_id)           -- hesap kaydı → yalnız kurucu
  )
);

comment on policy p_akis_yaz on public.akis is
  'Akışa masanın üyesi kendi adına yazar; anonim oturum yazamaz. '
  'Ödeme ve borç kaydı (veri.odeme / veri.borcKaydi) YALNIZ masayı kurana aittir.';


-- --- DÜZELTME ---------------------------------------------------------
-- Var olan kural aynen korunuyor (kişi yalnız KENDİ satırını düzeltir);
-- üstüne yalnızca hesap kaydı kilidi ekleniyor. Kurucuya başkasının
-- satırını düzenleme yetkisi VERİLMİYOR — bu yama onu genişletmemeli.
drop policy if exists p_akis_duzelt on public.akis;
create policy p_akis_duzelt on public.akis for update to authenticated
using (
  yazan_id = auth.uid()
  and (not public.akis_hesap_kaydi_mi(veri) or public.masa_kurucusu_mu(masa_id))
)
with check (yazan_id = auth.uid());


-- --- SİLME ------------------------------------------------------------
drop policy if exists p_akis_sil on public.akis;
create policy p_akis_sil on public.akis for delete to authenticated
using (
  (yazan_id = auth.uid() or public.masa_kurucusu_mu(masa_id))
  and (not public.akis_hesap_kaydi_mi(veri) or public.masa_kurucusu_mu(masa_id))
);

comment on policy p_akis_sil on public.akis is
  'Kişi kendi akış satırını, kurucu masanın her satırını siler. '
  'Ödeme/borç kaydını yalnız kurucu silebilir.';


-- =====================================================================
--  Kontrol
-- =====================================================================
select policyname, cmd
from pg_policies
where schemaname='public' and tablename='akis'
order by policyname;
