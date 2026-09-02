//== tmisafir
/* =========================================================
   TAHMİN HAFTASINI WHATSAPP'TAN OYNATMAK

   İstek (kullanıcı, 02.09.2026): "Maç sonuçlarını açacağız ya, onu
   WhatsApp'tan da paylaşayım, gruptan bağlanıp oradan da yazsınlar;
   dışarıdan yazan da adını yazsın girsin." — Buradaki maçlar FUTBOL
   maçları; masa tabelasının misafiri f_misafir.js'te.

   AKIŞ
     Kurucu  → Divan → haftada "📱 Gruba At" → link + hazır mesaj
     Misafir → linke tıklar → adını yazar → tahminlerini girer

   GÜVENLİK — kural veritabanında (yama 10)
     · RLS açılmadı; üç security definer kapı:
         tahmin_misafir_katil · tahmin_misafir_pencere · tahmin_misafir_yaz
     · Misafir yalnız KENDİ tahminini yazar (profil_id = auth.uid()).
     · MAÇ BAŞLADIKTAN SONRA yazamaz — kilit sunucuda (tahmin_acik_mi),
       üyeler için de aynı kural.
     · Sonuç giremez, maç ekleyip silemez, haftayı kapatamaz.
     · Grubun arşivini, masalarını, akışını, borçlarını görmez.
     · Link hafta kapanınca ve kurucu kapatınca ölür.
     · AÇIK RİSK: link iletilebilir; linki gören herkes o haftaya
       tahmin yazabilir. Kapatma düğmesi kurucunun elinde.
   ========================================================= */

let TMISAFIR = null;          // {kod, ad, haftaId, oyuncuId, yeniActi, profilId}
let TM_PENCERE = null;        // sunucudan gelen son pencere
let _tmNabiz = null;

/* ---------- linkten kodu oku ---------- */
function tmisafirOku() {
  try {
    const k = new URL(location.href).searchParams.get('tahmin');
    if (!k) return null;
    localStorage.setItem('kkd_tahmin', k);
    return k;
  } catch (e) { return null; }
}
const tmisafirKodu = () => {
  try { return tmisafirOku() || localStorage.getItem('kkd_tahmin') || null; }
  catch (e) { return null; }
};
function tmisafirBirak() {
  try { localStorage.removeItem('kkd_tahmin'); } catch (e) {}
  TMISAFIR = null; clearInterval(_tmNabiz);
  location.href = location.origin + location.pathname;
}

/* ---------- adını sorduğumuz ekran ---------- */
function tmisafirGirisEkrani(hata) {
  const eskiAd = (() => { try { return localStorage.getItem('kkd_misafir_ad') || ''; } catch (e) { return ''; } })();
  return `<div class="orta"><div style="max-width:400px;margin:0 auto;width:100%">
    <div class="center" style="margin-bottom:18px">
      <div style="font-size:40px">⚽</div>
      <div class="serif" style="font-size:22px;margin-top:6px">Tahmin Yarışması</div>
      <div class="xs dim" style="margin-top:5px">Adını yaz, haftanın maçlarına skor tahmini gir.</div>
    </div>
    <div class="card">
      ${hata ? `<div class="uyari" style="margin-bottom:12px;border-color:#8C3A3A;color:#E8B4B4">${esc(hata)}</div>` : ''}
      <div class="field"><label class="fl">Adın</label>
        <input id="tmAd" maxlength="24" value="${esc(eskiAd)}" placeholder="Ufuk"
          onkeydown="if(event.key==='Enter')tmisafirKatil()">
        <div class="xs dim" style="margin-top:6px">Sıralamada bu ad görünecek. Hesap açmıyorsun, şifre yok.
          Grupta bu adla kayıtlıysan puanların o kayda işler.</div></div>
      <button class="btn-p btn-full" id="tmBtn" style="margin-top:12px" onclick="tmisafirKatil()">Yarışmaya Katıl</button>
    </div>
    <div class="card tight xs dim">
      Tahminler açıktır: herkes birbirinin tahminini görür. <b>Maç başlayınca kilitlenir</b> —
      o andan sonra ne sen ne başkası değiştirebilir. Puan: tam skor <b>5</b> ·
      doğru sonuç + gol farkı <b>3</b> · sadece doğru sonuç <b>2</b> · toplam gol de tutarsa <b>+1</b>.
    </div>
  </div></div>`;
}

/* ---------- katılma ---------- */
async function tmisafirKatil() {
  const kod = tmisafirKodu();
  const ad2 = ($('#tmAd')?.value || '').trim();
  if (!ad2) return toast('Adını yaz', true);
  const btn = $('#tmBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="yukleniyor"></span>'; }
  try { localStorage.setItem('kkd_misafir_ad', ad2); } catch (e) {}
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data, error } = await sb.rpc('tahmin_misafir_katil', { p_kod: kod, p_ad: ad2 });
    if (error) throw error;
    tmPencereKur(data, kod, ad2);
    DURUM = 'tmisafir'; tmNabizKur();
    render(); window.scrollTo(0, 0);
    toast(TMISAFIR.yeniActi
      ? `Hoş geldin ${ad2} — bu adla kadroya eklendin`
      : `Hoş geldin ${ad2} — kadrodaki kaydına bağlandın`, true);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Yarışmaya Katıl'; }
    const m = hataMetni(e);
    if (/anonymous|disabled|signups/i.test(m))
      return toast('Misafir girişi Supabase panelinde açık değil — masayı kuran açmalı', true);
    if (/function|does not exist|schema/i.test(m))
      return toast('Yama 10 çalıştırılmamış', true);
    toast(m, true);
  }
}

function tmPencereKur(p, kod, ad2) {
  TM_PENCERE = p;
  TMISAFIR = {
    kod: kod || TMISAFIR?.kod,
    ad: p.ben?.ad || ad2 || TMISAFIR?.ad || 'Misafir',
    haftaId: p.hafta.id,
    oyuncuId: p.ben?.oyuncu_id || null,
    yeniActi: !!p.ben?.yeni_acti,
    profilId: p.ben?.profil_id || null
  };
}

/* ---------- misafirin ekranı ---------- */
function tmisafirEkran() {
  const p = TM_PENCERE;
  if (!p) return tmisafirGirisEkrani('Hafta okunamadı.');
  const h = p.hafta, mac = p.maclar || [], hepsi = p.tahminler || [];
  if (h.kapandi) return `<div class="card"><div class="empty">
    <div class="big">✔️</div><div class="serif" style="font-size:17px;color:var(--ink)">Hafta kapandı</div>
    <div class="sm" style="margin-top:8px">Bu haftanın tahminleri artık yazılamıyor.</div>
    <button class="btn-gh" style="margin-top:14px" onclick="tmisafirBirak()">Çık</button></div></div>`;

  const benim = kid => hepsi.find(t => t.karsilasma_id === kid && t.profil_id === TMISAFIR.profilId);
  const acik = mac.filter(k => k.acik);

  return `
  <div class="card tight" style="border-color:var(--gold)">
    <div class="row" style="gap:9px">
      <div style="font-size:20px;flex-shrink:0">⚽</div>
      <div class="grow" style="min-width:0">
        <div class="sm" style="font-weight:700">${esc(TMISAFIR.ad)}
          <span class="xs dim" style="font-weight:500">· misafir</span></div>
        <div class="xs dim">${esc(h.masa_ad || '')} · ${esc(h.ad)} · ${mac.length} maç</div>
      </div>
      <button class="btn-xs btn-gh" style="flex-shrink:0" onclick="tmisafirTazele(true)">↻</button>
    </div>
    ${TMISAFIR.yeniActi ? `<div class="xs dim" style="margin-top:8px">
      <b>${esc(TMISAFIR.ad)}</b> adıyla kadroya eklendin; puanların bu ada işleyecek.</div>` : ''}
  </div>

  <div class="card">
    <h3>${esc(h.ad)}</h3>
    <div class="xs dim" style="margin-bottom:10px">Kutulara skoru yaz, kutudan çıkınca kaydediliyor.
      ${acik.length ? `<b>${acik.length} maç</b> açık; ` : ''}maç başlayınca kilitlenir.</div>
    ${mac.map(k => tmMacSatiri(k, benim(k.id), hepsi)).join('<div class="sep" style="margin:10px -14px"></div>')}
  </div>

  ${tmPano(mac, hepsi)}

  <div class="card tight xs dim center">Tam skor <b>5</b> · doğru sonuç + gol farkı <b>3</b> ·
    sadece doğru sonuç <b>2</b> · toplam gol de tutarsa <b>+1</b>.<br>
    <b style="text-decoration:underline;cursor:pointer" onclick="tmisafirBirak()">Çık</b></div>`;
}

function tmMacSatiri(k, ben, hepsi) {
  const digerleri = hepsi.filter(t => t.karsilasma_id === k.id);
  const bitti = k.ev_skor != null && k.dep_skor != null;
  const puan = t => bitti ? tahminPuan({ ev: t.ev, dep: t.dep }, { evSkor: k.ev_skor, depSkor: k.dep_skor }) : null;
  return `<div>
    <div class="row" style="justify-content:space-between;gap:8px">
      <div class="grow" style="min-width:0">
        <div style="font-weight:600;font-size:14px" class="ell">${esc(k.ev)} – ${esc(k.deplasman)}</div>
        <div class="xs dim">${saatMetni(k.baslangic)} · ${bitti ? 'sonuçlandı' : (k.acik ? kalanMetni(k.baslangic) : 'kilitli')}</div>
      </div>
      ${bitti ? `<div class="serif" style="font-size:20px;flex-shrink:0">${k.ev_skor}–${k.dep_skor}</div>` : ''}
    </div>

    ${k.acik ? `<div class="row" style="gap:6px;margin-top:8px;align-items:center">
      <input type="number" inputmode="numeric" id="tm-e-${k.id}" min="0" max="30" value="${ben ? ben.ev : ''}" placeholder="–"
        onchange="tmYaz('${k.id}')" onkeydown="if(event.key==='Enter')this.blur()"
        style="width:56px;text-align:center;font:600 16px Georgia,serif">
      <span class="dim">–</span>
      <input type="number" inputmode="numeric" id="tm-d-${k.id}" min="0" max="30" value="${ben ? ben.dep : ''}" placeholder="–"
        onchange="tmYaz('${k.id}')" onkeydown="if(event.key==='Enter')this.blur()"
        style="width:56px;text-align:center;font:600 16px Georgia,serif">
      <span class="xs" id="tm-n-${k.id}" style="color:${ben ? 'var(--green)' : 'var(--dim)'}">${ben ? '✓ kayıtlı' : 'iki sayıyı yaz'}</span>
    </div>`
    : (ben ? `<div class="xs" style="margin-top:6px">Tahminin: <b>${ben.ev}–${ben.dep}</b>
        ${bitti ? ` · <b class="${puan(ben) > 0 ? 'pos' : 'zero'}">${puanEtiketi(puan(ben))}</b>` : ''}</div>`
      : `<div class="xs dim" style="margin-top:6px">Tahmin girmedin.</div>`)}

    ${digerleri.length ? `<div class="row wrap" style="gap:5px;margin-top:7px">${digerleri
      .slice().sort((a, b) => (a.profil_id === TMISAFIR.profilId ? -1 : 0) - (b.profil_id === TMISAFIR.profilId ? -1 : 0))
      .map(t => {
        const pu = puan(t), o = t.profil_id === TMISAFIR.profilId;
        return `<span class="pill ${pu === 5 ? 'gold' : (pu > 0 ? 'green' : (bitti ? '' : (o ? 'gold' : 'blue')))}"
          style="${o ? 'font-weight:700' : ''}">${o ? 'sen' : esc(t.ad)} ${t.ev}–${t.dep}${pu !== null ? ' ' + puanEtiketi(pu) : ''}</span>`;
      }).join('')}</div>` : ''}
  </div>`;
}

/* Misafirin gördüğü sıralama — puanı burada, ham veriden hesaplıyoruz */
function tmPano(mac, hepsi) {
  const bitmis = mac.filter(k => k.ev_skor != null && k.dep_skor != null);
  if (!bitmis.length) return '';
  const t = {};
  bitmis.forEach(k => hepsi.filter(x => x.karsilasma_id === k.id).forEach(x => {
    const p = tahminPuan({ ev: x.ev, dep: x.dep }, { evSkor: k.ev_skor, depSkor: k.dep_skor });
    if (p === null) return;
    const s = t[x.profil_id] = t[x.profil_id] || { ad: x.ad, puan: 0, tam: 0 };
    s.puan += p; if (p === 5) s.tam++;
  }));
  const sira = Object.entries(t).sort((a, b) => b[1].puan - a[1].puan || b[1].tam - a[1].tam);
  if (!sira.length) return '';
  return `<div class="card"><h3>🏆 Sıralama</h3>
    <table><thead><tr><th>Kişi</th><th>Puan</th><th>🎯</th></tr></thead><tbody>
    ${sira.map(([pid, s], i) => `<tr>
      <td><div class="row" style="gap:8px"><span class="rank ${i === 0 ? 'r1' : ''}">${i + 1}</span>
        <span style="font-weight:${pid === TMISAFIR.profilId ? 700 : 600}">${
          pid === TMISAFIR.profilId ? 'sen' : esc(s.ad)}</span></div></td>
      <td><b>${s.puan}</b></td><td>${s.tam || '–'}</td></tr>`).join('')}
    </tbody></table></div>`;
}

/* ---------- yazma ---------- */
async function tmYaz(kid) {
  const not = (m, renk) => { const n = $(`#tm-n-${kid}`); if (n) { n.textContent = m; n.style.color = renk; } };
  const e = parseInt($(`#tm-e-${kid}`)?.value, 10), d = parseInt($(`#tm-d-${kid}`)?.value, 10);
  if (!Number.isInteger(e) || !Number.isInteger(d) || e < 0 || d < 0) return not('iki sayıyı yaz', 'var(--dim)');
  not('yazılıyor…', 'var(--dim)');
  try {
    const { data, error } = await sb.rpc('tahmin_misafir_yaz',
      { p_kod: TMISAFIR.kod, p_karsilasma: kid, p_ev: e, p_dep: d });
    if (error) throw error;
    TM_PENCERE = data;
    not('✓ kayıtlı', 'var(--green)');
  } catch (err) {
    const m = hataMetni(err);
    not('yazılamadı', 'var(--red)');
    if (/KILIT/i.test(m)) { toast('Maç başladı, tahmin kapandı', true); return tmisafirTazele(false); }
    toast(m, true);
  }
}

/* ---------- tazeleme ---------- */
async function tmisafirTazele(gorunur) {
  if (!TMISAFIR) return;
  try {
    const { data, error } = await sb.rpc('tahmin_misafir_pencere', { p_kod: TMISAFIR.kod });
    if (error) throw error;
    tmPencereKur(data);
    render();
    if (gorunur) toast('Güncellendi');
  } catch (e) { if (gorunur) toast(hataMetni(e), true); }
}
function tmNabizKur() {
  clearInterval(_tmNabiz);
  /* Yazarken ekranı çizmeyelim: odak kaçar. 20 sn'de bir, kutulara
     dokunulmuyorsa tazeliyoruz. */
  _tmNabiz = setInterval(() => {
    if (document.hidden) return;
    if (document.activeElement?.id?.startsWith('tm-')) return;
    tmisafirTazele(false);
  }, 20000);
}

/* =========================================================
   KURUCU TARAFI — haftayı gruba at
   ========================================================= */
function tahminPaylasAc(hid) {
  if (!kurucuMu()) return toast('Linki masayı kuran üretir', true);
  const h = haftalar().find(x => x.id === hid);
  if (!h) return;
  TAHMIN_HAFTA = hid;
  acModal(`<h2 class="serif" style="margin:0 0 4px">Haftayı Gruba At</h2>
    <div class="xs dim" style="margin-bottom:13px">WhatsApp'a link gönderilir. Linke tıklayan
      <b>adını yazıp</b> haftanın maçlarına tahmin girer; hesap açması gerekmez.</div>

    <div class="uyari" style="margin-bottom:13px">
      <b>Bilmen gereken:</b> link iletilebilir; linki gören herkes bu haftaya tahmin yazabilir.
      Göremediği şeyler: masalar, arşiv, sohbet, borçlar. Maç sonucu giremez, maç ekleyip silemez,
      haftayı kapatamaz. <b>Maç başlayınca tahmin kilitlenir</b> — kilit veritabanında.
      İstediğin an kapatırsın.
    </div>

    <div id="tmKutu"><button class="btn-p btn-full" id="tmUretBtn" onclick="tahminLinkUret('${hid}')">
      🔗 Link Üret</button></div>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}

async function tahminLinkUret(hid) {
  const btn = $('#tmUretBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="yukleniyor"></span>'; }
  try {
    const { data, error } = await sb.rpc('tahmin_kod_uret', { p_hafta: hid });
    if (error) throw error;
    tahminKutuCiz(hid, data);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Link Üret'; }
    const m = hataMetni(e);
    if (/function|does not exist|schema/i.test(m))
      return toast('Yama 10 çalıştırılmamış — SQL Editor\'de supabase_yama_10.sql', true);
    toast(m, true);
  }
}

const tahminLinki = kod => `${location.origin}${location.pathname}?tahmin=${encodeURIComponent(kod)}`;

function tahminMesaji(hid, kod) {
  const h = haftalar().find(x => x.id === hid);
  const mac = haftaMaclari(hid);
  const g = aktifGrup() || {};
  const L = [`${g.emoji || '⚽'} ${String(g.ad || 'Masa')} — ${h?.ad || 'Tahmin haftası'}`, ''];
  mac.forEach((k, i) => L.push(`${i + 1}. ${k.ev} – ${k.deplasman}  (${saatMetni(k.baslangic)})`));
  L.push('');
  L.push('Tahminini buradan gir (ad yazman yeterli, hesap gerekmez):');
  L.push(tahminLinki(kod));
  L.push('');
  L.push('Tam skor 5 · doğru sonuç + gol farkı 3 · sadece sonuç 2 · toplam gol de tutarsa +1');
  L.push('Maç başlayınca kilitlenir.');
  return L.join('\n');
}

function tahminKutuCiz(hid, kod) {
  const k = $('#tmKutu'); if (!k) return;
  k.innerHTML = `
    <div class="card tight" style="background:var(--panel2);margin:0 0 11px">
      <div class="xs dim">Haftanın misafir linki</div>
      <div class="sm" style="word-break:break-all;margin-top:5px;font-family:ui-monospace,monospace">${esc(tahminLinki(kod))}</div>
    </div>
    <button class="btn-g btn-full" onclick="tahminWp('${hid}','${esc(kod)}')">📱 WhatsApp'ta Paylaş</button>
    <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick='kopyala(tahminMesaji("${hid}","${esc(kod)}"))'>📋 Fikstürü ve Linki Kopyala</button>
    <button class="btn-dn btn-full btn-sm" style="margin-top:8px" onclick="tahminKapat('${hid}')">🚫 Misafir Girişini Kapat</button>
    <div class="xs dim" style="margin-top:8px">Kapatınca link ölür ve bu haftaya katılmış misafirler düşer.
      Hafta kapanınca da kendiliğinden kapanır. Yazılmış tahminler silinmez.</div>`;
}
function tahminWp(hid, kod) {
  window.open('https://wa.me/?text=' + encodeURIComponent(tahminMesaji(hid, kod)), '_blank');
}
async function tahminKapat(hid) {
  if (!confirm('Misafir linki iptal edilecek; o linkle girenler düşecek. Yazdıkları tahminler kalır. Emin misin?')) return;
  try {
    const { error } = await sb.rpc('tahmin_kod_kapat', { p_hafta: hid });
    if (error) throw error;
    kapatModal(); toast('Misafir girişi kapatıldı', true);
  } catch (e) { toast(hataMetni(e), true); }
}
