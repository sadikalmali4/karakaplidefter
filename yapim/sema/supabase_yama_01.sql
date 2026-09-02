-- =====================================================================
--  YAMA 01 — masa kurma
--
--  SORUN: insert().select() sırasında PostgreSQL, RETURNING ile dönecek
--  satıra OKUMA kuralını da uyguluyor. Okuma kuralı "bu masanın üyesi
--  misin?" diye soruyor; üyeliği açan AFTER INSERT tetikleyicisi ise o
--  anda henüz görünür değil → "new row violates row-level security policy".
--
--  ÇÖZÜM: masa + kurucu üyeliği tek bir security definer fonksiyonda,
--  aynı işlemde oluşsun; satır ondan sonra dönsün. Kod üretimi de
--  istemciden alınıp buraya taşındı (çakışırsa kendi içinde yeniden dener).
--
--  KULLANIM: SQL Editor → New query → yapıştır → Run
-- =====================================================================

create or replace function public.masa_kur(p_ad text, p_emoji text default '🍀')
returns setof public.masalar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kod  text;
  v_id   uuid;
  v_harf text := 'ABCDEFGHJKLMNPRSTUVYZ23456789';   -- karışan harfler (I,O,Q,0,1) yok
begin
  if auth.uid() is null then
    raise exception 'Önce giriş yapmalısın';
  end if;
  if length(btrim(coalesce(p_ad,''))) = 0 then
    raise exception 'Masa adı boş olamaz';
  end if;
  if length(btrim(p_ad)) > 40 then
    raise exception 'Masa adı en fazla 40 karakter';
  end if;

  for i in 1..10 loop
    v_kod := '';
    for j in 1..6 loop
      v_kod := v_kod || substr(v_harf, 1 + floor(random()*length(v_harf))::int, 1);
    end loop;
    begin
      insert into public.masalar (ad, emoji, kod, kuran_id)
      values (btrim(p_ad), coalesce(nullif(btrim(p_emoji),''), '🍀'), v_kod, auth.uid())
      returning masalar.id into v_id;
      exit;                                  -- yazdı, döngüden çık
    exception when unique_violation then
      v_id := null;                          -- kod çakıştı, yeniden dene
    end;
  end loop;

  if v_id is null then
    raise exception 'Masa kodu üretilemedi, tekrar dene';
  end if;

  -- tetikleyici zaten ekliyor; aynı işlemde garanti altına alalım
  insert into public.masa_uyeleri (masa_id, profil_id, rol, durum)
  values (v_id, auth.uid(), 'kurucu', 'onayli')
  on conflict do nothing;

  return query select * from public.masalar m where m.id = v_id;
end $$;

revoke all on function public.masa_kur(text,text) from public;
grant execute on function public.masa_kur(text,text) to authenticated;

-- doğrudan insert'e artık gerek yok; kural kalsın ama fonksiyon tercih edilsin
comment on function public.masa_kur(text,text) is
  'Masa kurar ve çağıranı kurucu üye yapar. İstemci bunu çağırmalı, masalar tablosuna doğrudan insert etmemeli.';


-- ---------------------------------------------------------------------
--  TEST ÇÖPÜNÜ TEMİZLE
--  Bağlantıyı denerken açtığım geçici kayıtlar. Silmesi güvenli.
-- ---------------------------------------------------------------------
delete from public.masalar where kod like 'ZZ%';
delete from auth.users  where email like 'zztest_%@karakaplidefter.local';
