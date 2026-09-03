-- =====================================================================
--  YAMA 13 — PUSH ABONELİKLERİ (masa çağrısı bildirimi)
--
--  #1 Push bildirimi için abonelik deposu. Her cihaz/oyuncu için bir
--  satır; Edge Function (bildirim-gonder) buradan okuyup şifreli push
--  atar. Kişi yalnız kendi aboneliğini yazar/siler; masanın üyeleri
--  aynı masadaki abonelikleri OKUYABİLİR (fonksiyon service_role ile
--  okuyacağı için şart değil ama zararsız ve hata ayıklamayı kolaylaştırır).
--
--  ÖN KOŞUL: yama 09 (anonim_mi). KULLANIM: SQL Editor → yapıştır → Run
-- =====================================================================

create table if not exists public.push_abonelikleri (
  endpoint   text primary key,
  profil_id  uuid not null references public.profiller(id) on delete cascade,
  masa_id    uuid not null references public.masalar(id)   on delete cascade,
  p256dh     text not null,
  auth       text not null,
  olusturma  timestamptz not null default now()
);
create index if not exists ix_push_masa on public.push_abonelikleri(masa_id);

alter table public.push_abonelikleri enable row level security;

-- Kişi kendi aboneliğini yazar (anonim misafir push almaz)
drop policy if exists p_push_yaz on public.push_abonelikleri;
create policy p_push_yaz on public.push_abonelikleri for insert to authenticated
with check (profil_id = auth.uid() and not public.anonim_mi()
            and public.masa_uyesi_mi(masa_id));

drop policy if exists p_push_guncelle on public.push_abonelikleri;
create policy p_push_guncelle on public.push_abonelikleri for update to authenticated
using (profil_id = auth.uid()) with check (profil_id = auth.uid());

-- Kişi kendi aboneliğini siler
drop policy if exists p_push_sil on public.push_abonelikleri;
create policy p_push_sil on public.push_abonelikleri for delete to authenticated
using (profil_id = auth.uid());

-- Masanın üyeleri okuyabilir (Edge Function service_role ile okur; bu ek)
drop policy if exists p_push_oku on public.push_abonelikleri;
create policy p_push_oku on public.push_abonelikleri for select to authenticated
using (public.masa_uyesi_mi(masa_id));

-- Kontrol
select policyname, cmd from pg_policies
where schemaname='public' and tablename='push_abonelikleri' order by policyname;
