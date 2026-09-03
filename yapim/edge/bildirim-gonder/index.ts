// =====================================================================
//  bildirim-gonder — Supabase Edge Function (Deno) — SAĞLAM SÜRÜM
//  Açılışta çökmez; web-push içeride dinamik yüklenir, secret yoksa
//  net mesaj döner. GET ile "durum" verir (hata ayıklama için).
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ornek@ornek.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Sağlık/durum: hangi secret var, web-push yüklenebiliyor mu
  if (req.method === "GET") {
    let wp = "?";
    try { await import("npm:web-push@3.6.7"); wp = "yuklendi"; }
    catch (e) { wp = "HATA: " + String(e); }
    return json({
      vapid_public: !!VAPID_PUBLIC, vapid_private: !!VAPID_PRIVATE,
      vapid_subject: VAPID_SUBJECT, service_role: !!SERVICE, web_push: wp,
    });
  }

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE)
      return json({ hata: "VAPID_PUBLIC / VAPID_PRIVATE secret'leri eksik" }, 400);

    const { masa_id, gonderen, baslik, govde, url } = await req.json().catch(() => ({}));
    if (!masa_id) return json({ hata: "masa_id gerekli" }, 400);

    const webpush = (await import("npm:web-push@3.6.7")).default;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const sb = createClient(SB_URL, SERVICE);
    const { data: aboneler, error } = await sb
      .from("push_abonelikleri")
      .select("endpoint, p256dh, auth, profil_id")
      .eq("masa_id", masa_id);
    if (error) throw error;

    const yuk = JSON.stringify({
      baslik: baslik ?? "Kara Kaplı Defter",
      govde: govde ?? "Masaya çağrı var.",
      url: url ?? "/", tag: "kkd-cagri",
    });

    let gonderilen = 0, silinen = 0;
    for (const a of aboneler ?? []) {
      if (gonderen && a.profil_id === gonderen) continue;
      const sub = { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } };
      try { await webpush.sendNotification(sub, yuk); gonderilen++; }
      catch (e) {
        const kod = (e as { statusCode?: number }).statusCode;
        if (kod === 404 || kod === 410) {
          await sb.from("push_abonelikleri").delete().eq("endpoint", a.endpoint);
          silinen++;
        }
      }
    }
    return json({ ok: true, abone: (aboneler ?? []).length, gonderilen, silinen });
  } catch (e) {
    return json({ hata: String(e) }, 500);
  }
});

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s, headers: { ...cors, "Content-Type": "application/json" },
  });
}
