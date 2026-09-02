/* =========================================================
   TABELAYI DEVRETMEK — masada telefon elden ele geçsin
   Yazma yetkisi maclar.tabelaci_id'de duruyor. Devretmek onu masanın
   başka bir ONAYLI üyesine yazmak demek (kural: yama 07).
   Hesabı olmayan oyuncuya devredilemez — yoksa tabelayı kimse yazamaz.
   ========================================================= */

/* Devredilebilecek kişiler: masanın onaylı üyeleri, ben hariç */
function devirAdaylari(){
  const c=DB.aktif; if(!c) return [];
  return DB.oyuncular
    .filter(o=>o.masaId===c.grupId && o.profilId && o.profilId!==c._hesap)
    .map(o=>({...o, masada:macOyunculari(c).includes(o.id)}))
    /* masada oturanlar önce: tabela genelde oyunculardan birine geçer */
    .sort((a,b)=>(b.masada-a.masada)||a.ad.localeCompare(b.ad,'tr'));
}

function devretAc(){
  const c=DB.aktif;
  if(!c) return;
  if(!tabelaciMiyim()&&!kurucuMu()) return toast('Tabelayı yalnız tutan kişi veya kurucu devredebilir',true);
  if(c.bitti) return toast('Kapanmış tabela devredilemez',true);

  const aday=devirAdaylari();
  const hesapsiz=DB.oyuncular.filter(o=>o.masaId===c.grupId&&!o.profilId&&macOyunculari(c).includes(o.id));

  acModal(`<h2 class="serif" style="margin:0 0 4px">Tabelayı Devret</h2>
    <div class="xs dim" style="margin-bottom:14px">Yazma yetkisi seçilen kişiye geçer; sen izlemeye düşersin.
      Girilmiş eller yerinde kalır.</div>
    ${aday.length?`<div class="row wrap" id="dvKim">${aday.map(o=>
      `<div class="chip" data-h="${o.profilId}" data-o="${o.id}" onclick="tekSecChip(this)">
        ${avatar(o.id,20)}${esc(o.ad)}${o.masada?'':'<span class="xs dim" style="font-weight:500">· masada değil</span>'}
      </div>`).join('')}</div>
      <button class="btn-p btn-full" id="dvBtn" style="margin-top:16px" onclick="devret()">Devret</button>`
     :`<div class="uyari">Devredebileceğin kimse yok: masadaki diğer oyuncuların hesabı açılmamış.
        Ayarlar → Davet Linkleri'nden kendi linklerini gönder, hesap açtıklarında devredebilirsin.</div>`}
    ${hesapsiz.length?`<div class="xs dim" style="margin-top:10px">Hesabı olmayanlar:
      ${hesapsiz.map(o=>esc(o.ad)).join(', ')}. Onlara devredilemez — telefonu uzatman gerekir.</div>`:''}
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function devret(){
  const c=DB.aktif; if(!c) return;
  const sec=document.querySelector('#dvKim .chip.on');
  if(!sec) return toast('Kimi seçtiğini söyle',true);
  const hesap=sec.dataset.h, oyuncuId=sec.dataset.o;
  const btn=$('#dvBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  try{
    /* Bekleyen yazı varsa önce onu bitir; yoksa devirden sonra yazamayız. */
    await aktifYaz();
    /* Zabıtta görünen tabelacı adı da devredilen kişi olsun */
    const yeniCelse=Object.assign({},aktifBelge(c),{tabelaci:oyuncuId});
    const {error}=await sb.from('maclar')
      .update({tabelaci_id:hesap, celse:yeniCelse}).eq('id',c.id);
    if(error) throw error;
    c.tabelaci=oyuncuId; c._hesap=hesap;
    await akisEkle('mesaj',`Tabela ${ad(oyuncuId)}'e devredilmiştir. Kayıtların sıhhati bundan sonra kendisine aittir.`,
                   {devir:{mac:c.id,kim:oyuncuId}});
    kapatModal(); await yenile(true);
    toast(`Tabela ${ad(oyuncuId)}'e geçti. Artık o yazıyor.`,true);
  }catch(e){
    toast(hataMetni(e),true);
    if(btn){ btn.disabled=false; btn.textContent='Devret'; }
  }
}
