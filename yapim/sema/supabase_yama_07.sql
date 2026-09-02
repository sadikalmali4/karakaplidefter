-- =====================================================================
--  YAMA 07 — TABELAYI DEVRETMEK
--
--  SORUN: Maç kurulurken "Tabelayı kim tutuyor?" diye seçilen kişi
--  yalnızca ZABITTA görünüyordu; yazma yetkisi masayı AÇAN hesapta
--  kalıyordu. Kurallar başka birini tabelacı yazmayı engelliyordu:
--      p_mac_ac      with check (... and tabelaci_id = auth.uid())
--      p_mac_guncelle with check (tabelaci_id = auth.uid() or kurucu)
--  Yani arayüz yapamayacağı bir şeyi vaat ediyordu.
--
--  ÇÖZÜM: tabelacı, masanın ONAYLI bir üyesi olmak şartıyla başkası
--  olabilir. Böylece masada telefon elden ele geçebiliyor.
--
--  Değişmeyen: kapanmış maça tabelacı dokunamaz (bitti = false şartı),
--  başkasının açtığı tabelaya yazamaz, kural değiştiremez.
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- Onaylı üye mi? (RLS özyinelemesine girmemek için security definer)
create or replace function public.masa_onayli_uyesi_mi(p_masa uuid, p_profil uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.masa_uyeleri
    where masa_id = p_masa and profil_id = p_profil and durum = 'onayli'
  );
$$;

revoke all on function public.masa_onayli_uyesi_mi(uuid,uuid) from public;
grant execute on function public.masa_onayli_uyesi_mi(uuid,uuid) to authenticated;

-- --- maç açma: tabelacı ben ya da masanın onaylı bir üyesi ------------
drop policy if exists p_mac_ac on public.maclar;
create policy p_mac_ac on public.maclar for insert to authenticated
with check (
  public.masa_uyesi_mi(masa_id)
  and (
    tabelaci_id = auth.uid()
    or public.masa_onayli_uyesi_mi(masa_id, tabelaci_id)
  )
);

comment on policy p_mac_ac on public.maclar is
  'Masayı onaylı her üye açabilir. Tabelacı kendisi ya da masanın başka bir onaylı üyesi olabilir.';

-- --- maç güncelleme: devretmeye izin ver -----------------------------
-- using      : kim dokunabilir  → açık maçın tabelacısı veya kurucu
-- with check : yeni hâl ne olabilir → tabelacı yine onaylı bir üye olsun
drop policy if exists p_mac_guncelle on public.maclar;
create policy p_mac_guncelle on public.maclar for update to authenticated
using (
  (tabelaci_id = auth.uid() and bitti = false)
  or public.masa_kurucusu_mu(masa_id)
)
with check (
  public.masa_uyesi_mi(masa_id)
  and (
    tabelaci_id = auth.uid()
    or public.masa_onayli_uyesi_mi(masa_id, tabelaci_id)
  )
);

comment on policy p_mac_guncelle on public.maclar is
  'Açık maçı tabelacısı veya kurucu güncelleyebilir; tabela masanın onaylı '
  'başka bir üyesine devredilebilir. Kapanmış maça tabelacı dokunamaz.';

-- =====================================================================
--  Kontrol: politikalar yerinde mi?
-- =====================================================================
-- NOT: pg_policies gorunumunde sutun adi policyname'dir (polname degil;
-- o, pg_policy katalogunun sutunu). Yanlis ad yazilirsa hata en sonda
-- cikar ama Supabase betigi tek islem calistirdigi icin HEPSI geri alinir.
select policyname, cmd
from pg_policies
where schemaname='public' and tablename='maclar'
order by policyname;
