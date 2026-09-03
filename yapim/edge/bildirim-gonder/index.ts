// =====================================================================
//  bildirim-gonder — Supabase Edge Function (Deno)
//
//  Masa çağrısı atılınca istemci bunu çağırır; bu fonksiyon o masanın
//  bütün push aboneliklerine VAPID ile şifreli push gönderir.
//
//  KURULUM (bir kez):
//    1) supabase/functions/bildirim-gonder/index.ts  ← bu dosya
//    2) Secret'ler (Supabase → Project Settings → Edge Functions → Secrets
//       veya:  supabase secrets set ... ):
//         VAPID_PUBLIC   = BGmk0OslRwGU7rX2XANgiUlsnXCPI04kSvhxM5QLmWRk3jBMFf4c9M1mICVK9BF9FaeVQQr-7f5ajVGgEBLT0Ps
//         VAPID_PRIVATE  = KcgR95wyxr62dv0-dKHwaPBvVgfBXOSXZw9iGUx-Lyk
//         VAPID_SUBJECT  = mailto:ik@alga.com.tr
//       (SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik gelir.)
//    3) Dağıt:  supabase functions deploy bildirim-gonder
//
//  NOT: service_role anahtarını yalnız bu fonksiyon (sunucu) kullanır;
//  istemciye asla konmaz.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ornek@ornek.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { masa_id, gonderen, baslik, govde, url } = await req.json();
    if (!masa_id) return json({ hata: "masa_id gerekli" }, 400);

    const sb = createClient(SB_URL, SERVICE);
    const { data: aboneler, error } = await sb
      .from("push_abonelikleri")
      .select("endpoint, p256dh, auth, profil_id")
      .eq("masa_id", masa_id);
    if (error) throw error;

    const yuk = JSON.stringify({
      baslik: baslik ?? "Kara Kaplı Defter",
      govde: govde ?? "Masaya çağrı var.",
      url: url ?? "/",
      tag: "kkd-cagri",
    });

    let gonderilen = 0, silinen = 0;
    for (const a of aboneler ?? []) {
      // Çağrıyı atanın kendi cihazına gönderme
      if (gonderen && a.profil_id === gonderen) continue;
      const sub = { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } };
      try {
        await webpush.sendNotification(sub, yuk);
        gonderilen++;
      } catch (e) {
        // 404/410 = abonelik ölmüş; temizle
        const kod = (e as { statusCode?: number }).statusCode;
        if (kod === 404 || kod === 410) {
          await sb.from("push_abonelikleri").delete().eq("endpoint", a.endpoint);
          silinen++;
        }
      }
    }
    return json({ ok: true, gonderilen, silinen });
  } catch (e) {
    return json({ hata: String(e) }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
