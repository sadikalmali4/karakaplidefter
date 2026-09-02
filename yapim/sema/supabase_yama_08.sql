-- =====================================================================
--  YAMA 08 — TAHMİN YARIŞMASI
--
--  Haftanın maçları girilir, masadaki herkes skor tahmini yazar.
--  Tahminler AÇIKTIR: herkes birbirinin tahminini görür.
--  Maç başlayınca KİLİTLENİR — ve bu kilit veritabanındadır, arayüzde
--  değil. Yoksa uygulamayı kurcalayan biri maç başladıktan sonra
--  tahminini değiştirebilirdi.
--
--  Puanlama uygulamada hesaplanır (ham veriden), burada tutulmaz:
--  bir sonuç düzeltilince bütün geçmiş kendiliğinden doğrulanır.
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) HAFTALAR
-- ---------------------------------------------------------------------
create table if not exists public.haftalar (
  id         uuid primary key default gen_random_uuid(),
  masa_id    uuid not null references public.masalar(id) on delete cascade,
  ad         text not null check (length(btrim(ad)) between 1 and 60),
  kapandi    boolean not null default false,   -- hafta bitti, şampiyon ilan edildi
  olusturan  uuid references public.profiller(id) on delete set null,
  olusturma  timestamptz not null default now()
);
create index if not exists ix_haftalar_masa on public.haftalar(masa_id, olusturma desc);

-- ---------------------------------------------------------------------
-- 2) KARŞILAŞMALAR
-- ---------------------------------------------------------------------
create table if not exists public.karsilasmalar (
  id          uuid primary key default gen_random_uuid(),
  hafta_id    uuid not null references public.haftalar(id) on delete cascade,
  sira        int  not null default 1,
  ev          text not null check (length(btrim(ev)) between 1 and 40),
  deplasman   text not null check (length(btrim(deplasman)) between 1 and 40),
  baslangic   timestamptz not null,            -- KİLİT ZAMANI
  ev_skor     int check (ev_skor >= 0),
  dep_skor    int check (dep_skor >= 0),
  olusturma   timestamptz not null default now()
);
create index if not exists ix_karsilasma_hafta on public.karsilasmalar(hafta_id, sira);

-- ---------------------------------------------------------------------
-- 3) TAHMİNLER
-- ---------------------------------------------------------------------
create table if not exists public.tahminler (
  karsilasma_id uuid not null references public.karsilasmalar(id) on delete cascade,
  profil_id     uuid not null references public.profiller(id) on delete cascade,
  ev            int  not null check (ev  between 0 and 30),
  dep           int  not null check (dep between 0 and 30),
  olusturma     timestamptz not null default now(),
  guncelleme    timestamptz not null default now(),
  primary key (karsilasma_id, profil_id)
);
create index if not exists ix_tahmin_profil on public.tahminler(profil_id);

-- ---------------------------------------------------------------------
-- 4) YARDIMCILAR  (RLS özyinelemesine girmemek için security definer)
-- ---------------------------------------------------------------------
create or replace function public.hafta_masasi(p_hafta uuid)
returns uuid language sql security definer stable set search_path = public
as $$ select masa_id from public.haftalar where id = p_hafta; $$;

create or replace function public.karsilasma_masasi(p_kars uuid)
returns uuid language sql security definer stable set search_path = public
as $$
  select h.masa_id from public.karsilasmalar k
  join public.haftalar h on h.id = k.hafta_id
  where k.id = p_kars;
$$;

-- Tahmin hâlâ açık mı? Maç başladıysa kapalı.
create or replace function public.tahmin_acik_mi(p_kars uuid)
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.karsilasmalar
    where id = p_kars and baslangic > now()
  );
$$;

revoke all on function public.hafta_masasi(uuid)        from public;
revoke all on function public.karsilasma_masasi(uuid)   from public;
revoke all on function public.tahmin_acik_mi(uuid)      from public;
grant execute on function public.hafta_masasi(uuid)      to authenticated;
grant execute on function public.karsilasma_masasi(uuid) to authenticated;
grant execute on function public.tahmin_acik_mi(uuid)    to authenticated;

-- ---------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------
alter table public.haftalar      enable row level security;
alter table public.karsilasmalar enable row level security;
alter table public.tahminler     enable row level security;

-- --- haftalar: masa okur, kurucu yönetir ---
drop policy if exists p_hafta_oku on public.haftalar;
create policy p_hafta_oku on public.haftalar for select to authenticated
using (public.masa_uyesi_mi(masa_id));

drop policy if exists p_hafta_ac on public.haftalar;
create policy p_hafta_ac on public.haftalar for insert to authenticated
with check (public.masa_kurucusu_mu(masa_id) and olusturan = auth.uid());

drop policy if exists p_hafta_duzenle on public.haftalar;
create policy p_hafta_duzenle on public.haftalar for update to authenticated
using (public.masa_kurucusu_mu(masa_id)) with check (public.masa_kurucusu_mu(masa_id));

drop policy if exists p_hafta_sil on public.haftalar;
create policy p_hafta_sil on public.haftalar for delete to authenticated
using (public.masa_kurucusu_mu(masa_id));

-- --- karşılaşmalar: masa okur, kurucu yönetir (sonucu da o girer) ---
drop policy if exists p_kars_oku on public.karsilasmalar;
create policy p_kars_oku on public.karsilasmalar for select to authenticated
using (public.masa_uyesi_mi(public.hafta_masasi(hafta_id)));

drop policy if exists p_kars_yaz on public.karsilasmalar;
create policy p_kars_yaz on public.karsilasmalar for all to authenticated
using      (public.masa_kurucusu_mu(public.hafta_masasi(hafta_id)))
with check (public.masa_kurucusu_mu(public.hafta_masasi(hafta_id)));

-- --- tahminler: HERKES GÖRÜR, kendi tahminini MAÇ BAŞLAMADAN yazar ---
drop policy if exists p_tahmin_oku on public.tahminler;
create policy p_tahmin_oku on public.tahminler for select to authenticated
using (public.masa_uyesi_mi(public.karsilasma_masasi(karsilasma_id)));

comment on policy p_tahmin_oku on public.tahminler is
  'Tahminler açıktır: masadaki herkes birbirinin tahminini görür.';

drop policy if exists p_tahmin_yaz on public.tahminler;
create policy p_tahmin_yaz on public.tahminler for insert to authenticated
with check (
  profil_id = auth.uid()
  and public.masa_uyesi_mi(public.karsilasma_masasi(karsilasma_id))
  and public.tahmin_acik_mi(karsilasma_id)        -- KİLİT
);

drop policy if exists p_tahmin_duzelt on public.tahminler;
create policy p_tahmin_duzelt on public.tahminler for update to authenticated
using      (profil_id = auth.uid() and public.tahmin_acik_mi(karsilasma_id))
with check (profil_id = auth.uid() and public.tahmin_acik_mi(karsilasma_id));

drop policy if exists p_tahmin_sil on public.tahminler;
create policy p_tahmin_sil on public.tahminler for delete to authenticated
using (profil_id = auth.uid() and public.tahmin_acik_mi(karsilasma_id));

comment on policy p_tahmin_duzelt on public.tahminler is
  'Tahmin yalnız maç başlamadan önce yazılır/değiştirilir. Kilit burada, '
  'arayüzde değil: uygulamayı kurcalayan biri de maç sonrası tahmin giremez.';

-- ---------------------------------------------------------------------
-- 6) CANLI YAYIN
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['haftalar','karsilasmalar','tahminler'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  Kontrol
-- ---------------------------------------------------------------------
select tablename, policyname, cmd
from pg_policies
where schemaname='public' and tablename in ('haftalar','karsilasmalar','tahminler')
order by tablename, policyname;
