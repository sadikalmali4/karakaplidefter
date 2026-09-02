/* =========================================================
   YER — masanın mutat mekânları
   Liste ayarda tutulur (ayar.yerler); yoksa varsayılan ikili kullanılır.
   Listede olmayan bir yere gidilirse serbest yazılabilir.
   ========================================================= */
const YER_VARSAYILAN=['Parkverde','Kemerdere'];
function yerListesi(){
  const l=DB.ayar&&DB.ayar.yerler;
  return (Array.isArray(l)&&l.length)?l:YER_VARSAYILAN;
}
/* son oynanan yer öne seçili gelsin — genelde bir dönem aynı yerde oynanır */
function sonYer(){
  const l=grupCelseleri().slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));
  return (l[0]&&l[0].yer)||yerListesi()[0];
}
function yerSecici(secili){
  const l=yerListesi();
  const listedeMi=l.includes(secili);
  return `<div class="field"><label class="fl">Yer</label>
    <div class="row wrap" id="mYerSec">${l.map(y=>
      `<div class="chip ${y===secili?'on':''}" data-y="${esc(y)}" onclick="yerSec(this)">📍 ${esc(y)}</div>`).join('')}</div>
    <input id="mYer" placeholder="başka bir yerde oynandıysa yaz..." style="margin-top:8px"
      value="${esc(listedeMi?'':(secili||''))}" oninput="yerYaziliyor()"></div>`;
}
function yerSec(el){
  el.parentElement.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
  const i=$('#mYer'); if(i) i.value='';
}
function yerYaziliyor(){
  if(($('#mYer')?.value||'').trim())
    document.querySelectorAll('#mYerSec .chip').forEach(x=>x.classList.remove('on'));
}
function yerOku(){
  const s=($('#mYer')?.value||'').trim();
  return s || document.querySelector('#mYerSec .chip.on')?.dataset.y || '';
}
