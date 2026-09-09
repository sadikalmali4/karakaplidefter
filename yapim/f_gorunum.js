/* =========================================================
   GÖRÜNÜM — tema rengi, yazı tipi, büyütme
   Kişiye özel, CİHAZDA saklanır (localStorage); buluta gitmez,
   başkasının ekranını değiştirmez. baslat() ve her değişiklikte
   gorunumUygula() <html>'e data-tema / data-yazi / data-boy basar,
   gerisini CSS yapar.
   ========================================================= */

const TEMALAR=[
  {k:'', ad:'Bordo', renk:'#A32E38'},
  {k:'cuha', ad:'Yeşil Çuha', renk:'#2E6B45'},
  {k:'gece', ad:'Gece Mavisi', renk:'#345E80'},
  {k:'moru', ad:'Patlıcan', renk:'#6E3A5F'},
  {k:'komur', ad:'Kömür', renk:'#5A524C'}
];
function gorunumOku(){
  try{ return {
    tema: localStorage.getItem('kkd_tema')||'',
    yazi: localStorage.getItem('kkd_yazi')||'klasik',
    boy:  localStorage.getItem('kkd_boy')||'normal'
  }; }catch(e){ return {tema:'',yazi:'klasik',boy:'normal'}; }
}
function gorunumUygula(){
  const g=gorunumOku(), h=document.documentElement;
  if(g.tema) h.setAttribute('data-tema',g.tema); else h.removeAttribute('data-tema');
  if(g.yazi==='modern') h.setAttribute('data-yazi','modern'); else h.removeAttribute('data-yazi');
  if(g.boy==='buyuk') h.setAttribute('data-boy','buyuk'); else h.removeAttribute('data-boy');
}
function gorunumSet(alan,deger){
  try{ localStorage.setItem('kkd_'+alan,deger); }catch(e){}
  gorunumUygula();
  render();
}

function gorunumKart(){
  const g=gorunumOku();
  return `<div class="card">
    <h3>🎨 Görünüm</h3>
    <div class="xs dim" style="margin-bottom:10px">Yalnız senin cihazında geçerli — kimsenin ekranını değiştirmez.</div>

    <label class="fl">Masa Rengi</label>
    <div class="row wrap" style="gap:8px;margin:6px 0 14px">
      ${TEMALAR.map(t=>`<button class="chip ${g.tema===t.k?'on':''}" onclick="gorunumSet('tema','${t.k}')"
        style="gap:7px"><span style="width:14px;height:14px;border-radius:50%;background:${t.renk};display:inline-block;border:1px solid rgba(255,255,255,.2)"></span>${t.ad}</button>`).join('')}
    </div>

    <label class="fl">Yazı Tipi</label>
    <div class="seg" style="margin:6px 0 14px">
      <button class="${g.yazi!=='modern'?'on':''}" onclick="gorunumSet('yazi','klasik')" style="font-family:Georgia,serif">Klasik</button>
      <button class="${g.yazi==='modern'?'on':''}" onclick="gorunumSet('yazi','modern')">Modern</button>
    </div>

    <label class="fl">Yazı Boyu</label>
    <div class="seg" style="margin:6px 0 4px">
      <button class="${g.boy!=='buyuk'?'on':''}" onclick="gorunumSet('boy','normal')">Normal</button>
      <button class="${g.boy==='buyuk'?'on':''}" onclick="gorunumSet('boy','buyuk')" style="font-size:16px">Büyük</button>
    </div>
    <div class="xs dim" style="margin-top:6px">Büyük, ekrandaki her şeyi biraz büyütür — gözü yorulan için.</div>
  </div>`;
}
