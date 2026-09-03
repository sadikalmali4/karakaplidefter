//== sure
/* =========================================================
   OYUN SÜRESİ — parti parti sayaç

   İstek (kullanıcı, 03.09.2026): "Canlı izlerken oyuna süre de koyar
   mısın, sayaç olsun; ilk parti şu kadar, ikinci parti şu kadar,
   toplam süre gibi. Sadece istatistik bilgi açısından."

   VERİ — şema değişmedi, damgalar celse içinde:
     parti.basla  → o partinin İLK eli yazıldığı an
     parti.son    → o partiye en son yazma anı
     parti.bitis  → parti kapatıldığı an
   Damgayı kaydet() atıyor (tek yazma yolu), parti kapanışını
   partiKapat/celseKapat atıyor.

   ESKİ KAYITLAR: damgası yok. Uydurmuyoruz — "—" gösteriyoruz.
   Süre bir istatistik; puanı, sırayı, borcu etkilemiyor.
   ========================================================= */

const SURE_BICIM = ms => {
  if (!(ms > 0)) return '—';
  const dk = Math.round(ms / 60000);
  if (dk < 1) return 'yeni başladı';
  if (dk < 60) return dk + ' dk';
  const sa = Math.floor(dk / 60), kalan = dk % 60;
  return kalan ? `${sa} sa ${kalan} dk` : `${sa} sa`;
};
const _an = t => { const d = new Date(t || 0); return isNaN(d) ? 0 : d.getTime(); };

/* Bir partinin süresi. Açık partide "şu ana kadar". */
function partiSuresi(p) {
  const b = _an(p?.basla);
  if (!b) return { ms: 0, suruyor: false };
  const s = _an(p?.bitis) || _an(p?.son);
  const kapali = !!p?.bitis;
  return { ms: Math.max(0, (kapali ? s : Date.now()) - b), suruyor: !kapali };
}
/* Maçın toplam süresi = PARTİ SÜRELERİNİN TOPLAMI.
   İlk baştan sona duvar saati DEĞİL: celse talik edilip gece
   beklerse "toplam 24 sa" gibi anlamsız bir sayı çıkıyordu.
   Aradaki molalar sayılmıyor, masada oynanan süre sayılıyor.
   kapaliMs: bitmiş partilerin toplamı (sayaç bunun üstüne ekliyor). */
function macSuresi(c) {
  let kapaliMs = 0, acikBas = 0;
  (c?.partiler || []).forEach(p => {
    if (!_an(p.basla)) return;
    if (p.bitis) kapaliMs += Math.max(0, _an(p.bitis) - _an(p.basla));
    else acikBas = _an(p.basla);
  });
  if (!kapaliMs && !acikBas) return { ms: 0, suruyor: false, kapaliMs: 0, acikBas: 0 };
  const ms = kapaliMs + (acikBas ? Math.max(0, Date.now() - acikBas) : 0);
  return { ms, suruyor: !!acikBas, kapaliMs, acikBas };
}

/* --------------------------------------------------------------
   Süre kartı — canlı izlemede ve tabelacının ekranında
   -------------------------------------------------------------- */
function sureKarti(c, baslikGoster) {
  const ps = c?.partiler || [];
  if (!ps.some(p => p.basla)) return '';          // eski kayıt: damga yok
  const t = macSuresi(c);
  return `<div class="card tight">
    ${baslikGoster === false ? '' : '<div class="xs dim" style="margin-bottom:7px">⏱️ SÜRE</div>'}
    ${ps.map((p, i) => {
      const s = partiSuresi(p);
      if (!s.ms && !s.suruyor) return '';
      return `<div class="row" style="justify-content:space-between;padding:3px 0">
        <span class="sm ${s.suruyor ? '' : 'dim'}">${partiAd(c, i)}${s.suruyor ? ' <span class="canli"></span>' : ''}</span>
        <span class="sm" style="font-weight:600">${
          s.suruyor ? `<span class="sureSayac" data-bas="${esc(p.basla)}">${SURE_BICIM(s.ms)}</span>` : SURE_BICIM(s.ms)}</span>
      </div>`;
    }).join('')}
    ${ps.filter(p => p.basla).length > 1 ? `<div class="row" style="justify-content:space-between;
        padding:6px 0 0;margin-top:4px;border-top:1px solid var(--line)">
      <span class="sm" style="font-weight:700">Toplam</span>
      <span class="sm" style="font-weight:700;color:var(--gold)">${
        t.suruyor ? `<span class="sureSayac" data-taban="${t.kapaliMs}" data-bas="${new Date(t.acikBas).toISOString()}">${
          SURE_BICIM(t.ms)}</span>` : SURE_BICIM(t.ms)}</span>
    </div>` : ''}
    <div class="xs dim" style="margin-top:7px">Her partide ilk sayının yazıldığı andan itibaren. Partiler arası molalar sayılmaz.</div>
  </div>`;
}

/* Saniyede bir yalnız sayaç metnini tazeler — tam çizim yapmaz,
   yoksa yazarken odak kaçar. */
let _sureTik = null;
function sureTikBasla() {
  clearInterval(_sureTik);
  _sureTik = setInterval(() => {
    const n = document.querySelectorAll('.sureSayac');
    if (!n.length) { clearInterval(_sureTik); _sureTik = null; return; }
    n.forEach(x => {
      const taban = Number(x.dataset.taban) || 0;
      x.textContent = SURE_BICIM(taban + (Date.now() - _an(x.dataset.bas)));
    });
  }, 1000);
}

/* --------------------------------------------------------------
   Damgalama — kaydet() ve parti kapanışından çağrılıyor
   -------------------------------------------------------------- */
function sureDamgala(c) {
  if (!c) return;
  const p = (c.partiler || [])[(c.partiler || []).length - 1];
  if (!p || !(p.eller || []).length) return;
  const simdi = new Date().toISOString();
  if (!p.basla) p.basla = simdi;
  p.son = simdi;
}
function sureKapat(p) {
  if (!p) return;
  if (p.basla && !p.bitis) p.bitis = new Date().toISOString();
}

/* Zabıta düşen satır */
function sureZabitNotu(c) {
  const ps = (c?.partiler || []).filter(p => p.basla);
  if (!ps.length) return '';
  const t = macSuresi(c);
  if (ps.length === 1) return `SÜRE: Celse ${SURE_BICIM(t.ms)} sürmüştür.`;
  /* Toplam = parti sürelerinin toplamı; aradaki molalar sayılmaz. */
  const dokum = (c.partiler || []).map((p, i) => {
    const s = partiSuresi(p);
    return s.ms ? `${partiAd(c, i)} ${SURE_BICIM(s.ms)}` : null;
  }).filter(Boolean).join(', ');
  return `SÜRE: Celse toplam ${SURE_BICIM(t.ms)} sürmüştür (${dokum}).`;
}
