/* =========================================================
   GEÇMİŞ MAÇ — eski defterdeki maçları deftere geçir
   Tasarım kuralı: seçim SIRASI hiçbir şey belirlemez.
   Batak'ta A takımı ve B takımı ayrı ayrı seçilir.
   101'de kimlerin oynadığı seçilir, sıralama ▲▼ ile dizilir.
   ========================================================= */
let GECMIS_OYUN='batak';
let GC_A=[], GC_B=[], GC_SIRA=[], GC_PUAN={};

function gecmisAc(oyun){
  if(oyun&&oyun!==GECMIS_OYUN){ GC_A=[];GC_B=[];GC_SIRA=[];GC_PUAN={}; }
  if(oyun) GECMIS_OYUN=oyun;
  const o=GECMIS_OYUN, oyn=grupOyunculari();
  if(oyn.length<3) return toast('Önce oyuncuları ekle',true);

  acModal(`
    <h2 class="serif" style="margin:0 0 4px">Geçmiş Maç Ekle</h2>
    <div class="xs dim" style="margin-bottom:14px">Daha önce oynanmış bir maçı deftere geçirir.
      Sicil, unvanlar ve kürsü buna göre yeniden hesaplanır.</div>

    <div class="field"><label class="fl">Oyun</label>
      <div class="seg">
        <button class="${o==='batak'?'on':''}" onclick="gecmisAc('batak')">🂡 Batak</button>
        <button class="${o==='101'?'on':''}" onclick="gecmisAc('101')">🀄 101</button>
      </div></div>

    <div class="two" style="margin-top:10px">
      <div><label class="fl">Tarih</label><input type="date" id="gcTarih" max="${bugun()}" value="${bugun()}"></div>
      <div><label class="fl">Yer</label><select id="gcYer">${yerListesi().map(y=>`<option>${esc(y)}</option>`).join('')}<option value="">— başka —</option></select></div>
    </div>

    <div id="gcGovde" style="margin-top:12px"></div>

    ${bahisSecici(DB.ayar.bahis)}

    <div class="field" style="margin-top:12px"><label class="fl">Şerh <span style="text-transform:none;letter-spacing:0">(isteğe bağlı)</span></label>
      <textarea id="gcNot" rows="2" placeholder="Masaya dair bir not..."></textarea></div>

    <button class="btn-g btn-full" id="gcBtn" style="margin-top:14px" onclick="gecmisKaydet()">Deftere Geçir</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
  gcCiz();
}

/* --------- gövde: oyuna göre --------- */
function gcCiz(){
  const k=$('#gcGovde'); if(!k) return;
  k.innerHTML = GECMIS_OYUN==='batak' ? gcBatakGovde() : gcYzGovde();
}

/* ---------------- BATAK ---------------- */
function gcBatakGovde(){
  const oyn=grupOyunculari();
  const cip=(takim)=>oyn.map(p=>{
    const bende=(takim==='A'?GC_A:GC_B).includes(p.id);
    const otekide=(takim==='A'?GC_B:GC_A).includes(p.id);
    return `<div class="chip ${bende?'on':''}" style="${otekide?'opacity:.3;pointer-events:none':''}"
      onclick="gcTakim('${takim}','${p.id}')">${avatar(p.id,20)}${esc(p.ad)}</div>`;
  }).join('');

  const pa=GC_PUAN.A, pb=GC_PUAN.B;
  const kz = (Number.isFinite(pa)&&Number.isFinite(pb)&&pa!==pb) ? (pa>pb?0:1)
           : (GC_PUAN.kazanan!=null?GC_PUAN.kazanan:null);
  const T=l=>l.length?l.map(ad).join(' & '):'—';

  return `
  <div class="field"><label class="fl"><span class="pill red">A</span> A takımı — 2 kişi
    <span class="dim" style="text-transform:none;letter-spacing:0">(${GC_A.length}/2)</span></label>
    <div class="row wrap">${cip('A')}</div></div>

  <div class="field" style="margin-top:12px"><label class="fl"><span class="pill blue">B</span> B takımı — 2 kişi
    <span class="dim" style="text-transform:none;letter-spacing:0">(${GC_B.length}/2)</span></label>
    <div class="row wrap">${cip('B')}</div></div>

  <div class="card tight" style="margin:12px 0 0;background:var(--panel2)">
    <div class="row" style="justify-content:space-between;gap:8px">
      <div class="sm"><span class="pill red">A</span> ${esc(T(GC_A))}</div>
      <div class="sm"><span class="pill blue">B</span> ${esc(T(GC_B))}</div>
    </div></div>

  <div class="field" style="margin-top:12px"><label class="fl">Toplam puan</label>
    <div class="two">
      <div><input type="number" inputmode="numeric" placeholder="A puanı" value="${pa??''}"
        onchange="gcPuan('A',this.value)"></div>
      <div><input type="number" inputmode="numeric" placeholder="B puanı" value="${pb??''}"
        onchange="gcPuan('B',this.value)"></div>
    </div>
    <div class="xs dim" style="margin-top:5px">Eski defterdeki toplamı yaz. Kazanan buradan anlaşılır.</div></div>

  ${kz!=null?`<div class="uyari" style="margin-top:12px">🏆 Kazanan: <b>${esc(T(kz===0?GC_A:GC_B))}</b>
    ${(Number.isFinite(pa)&&Number.isFinite(pb))?`(${pa}–${pb})`:''}</div>`
   :`<div class="field" style="margin-top:12px"><label class="fl">Kazanan takım</label>
      <div class="seg">
        <button class="${GC_PUAN.kazanan===0?'on':''}" onclick="gcPuan('kazanan',0)">A takımı</button>
        <button class="${GC_PUAN.kazanan===1?'on':''}" onclick="gcPuan('kazanan',1)">B takımı</button></div>
      <div class="xs dim" style="margin-top:5px">Puanı hatırlamıyorsan sadece kazananı seç, yeter.</div></div>`}

  <details style="margin-top:10px"><summary>Parti skorunu da yazayım</summary><div class="two">
    <div><label class="fl">A parti</label><input type="number" min="0" max="9" placeholder="2"
      value="${GC_PUAN.pA??''}" onchange="gcPuan('pA',this.value)"></div>
    <div><label class="fl">B parti</label><input type="number" min="0" max="9" placeholder="1"
      value="${GC_PUAN.pB??''}" onchange="gcPuan('pB',this.value)"></div>
  </div></details>`;
}
function gcTakim(takim,id){
  const bu = takim==='A'?GC_A:GC_B;
  const i=bu.indexOf(id);
  if(i>=0) bu.splice(i,1);
  else{
    if(bu.length>=2) return toast('Takımda 2 kişi olur — birini çıkar',true);
    bu.push(id);
  }
  gcCiz();
}
function gcPuan(alan,v){
  if(alan==='kazanan') GC_PUAN.kazanan=Number(v);
  else{
    const n=parseInt(v,10);
    GC_PUAN[alan]=Number.isFinite(n)?n:undefined;
  }
  gcCiz();
}

/* ---------------- 101 ---------------- */
function gcYzGovde(){
  const oyn=grupOyunculari();
  const cip=oyn.map(p=>`<div class="chip ${GC_SIRA.includes(p.id)?'on':''}"
      onclick="gcYzSec('${p.id}')">${avatar(p.id,20)}${esc(p.ad)}</div>`).join('');
  return `
  <div class="field"><label class="fl">Kimler oynadı?
    <span class="dim" style="text-transform:none;letter-spacing:0">(${GC_SIRA.length} kişi)</span></label>
    <div class="row wrap">${cip}</div></div>

  ${GC_SIRA.length?`<div class="field" style="margin-top:12px">
    <label class="fl">Sıralama — ▲▼ ile diz</label>
    <div class="card tight" style="margin:0;background:var(--panel2)">
      ${GC_SIRA.map((id,i)=>`<div class="row" style="padding:6px 0;gap:8px">
        <div class="rank ${i===0?'r1':(i===GC_SIRA.length-1?'rs':'')}">${i+1}</div>
        ${avatar(id,28)}
        <div class="grow" style="min-width:0;margin-left:3px">
          <div style="font-weight:600;font-size:13.5px" class="ell">${esc(ad(id))}</div>
          <div class="xs dim">${i===0?'🏆 birinci':(i===GC_SIRA.length-1?'💸 sonuncu':'')}</div></div>
        <input type="number" inputmode="numeric" placeholder="puan" style="width:78px"
          value="${GC_PUAN[id]??''}" onchange="gcYzPuan('${id}',this.value)">
        <div style="display:flex;flex-direction:column;gap:3px">
          <button class="btn-xs" onclick="gcTasi(${i},-1)" ${i===0?'disabled':''}>▲</button>
          <button class="btn-xs" onclick="gcTasi(${i},1)" ${i===GC_SIRA.length-1?'disabled':''}>▼</button>
        </div></div>`).join('')}
    </div>
    <div class="xs dim" style="margin-top:6px">En üstteki birinci, en alttaki sonuncu.
      Puanı hatırlamıyorsan boş bırak — sıralama yeter.</div></div>`:''}`;
}
function gcYzSec(id){
  const i=GC_SIRA.indexOf(id);
  if(i>=0) GC_SIRA.splice(i,1);
  else{
    if(GC_SIRA.length>=6) return toast('En fazla 6 oyuncu',true);
    GC_SIRA.push(id);
  }
  gcCiz();
}
function gcYzPuan(id,v){
  const n=Number(v);
  GC_PUAN[id]= (v===''||v==null)?undefined:(Number.isFinite(n)?n:0);
}
function gcTasi(i,d){
  const j=i+d;
  if(j<0||j>=GC_SIRA.length) return;
  [GC_SIRA[i],GC_SIRA[j]]=[GC_SIRA[j],GC_SIRA[i]];
  gcCiz();
}

/* ---------------- kaydet ---------------- */
async function gecmisKaydet(){
  const o=GECMIS_OYUN, tarih=$('#gcTarih').value;
  if(!tarih) return toast('Tarih gerekli',true);
  if(tarih>bugun()) return toast('İleri tarihli maç olmaz',true);

  const c={oyun:o,giris:'hizli',masaAd:'Geçmiş',tarih,yer:$('#gcYer').value.trim(),
           tabelaci:DB.ben||null,partiHedef:o==='batak'?2:1,not:$('#gcNot').value.trim(),
           bahis:bahisOku(),partiler:[{eller:[],kazanan:null}]};

  if(o==='batak'){
    if(GC_A.length!==2||GC_B.length!==2) return toast('Her takımda 2 kişi olmalı',true);
    const pa=GC_PUAN.A, pb=GC_PUAN.B;
    let kz;
    if(Number.isFinite(pa)&&Number.isFinite(pb)&&pa!==pb) kz = pa>pb?0:1;
    else if(GC_PUAN.kazanan===0||GC_PUAN.kazanan===1) kz = GC_PUAN.kazanan;
    else return toast('Kazanan takımı seç ya da puanları yaz',true);

    let sA=GC_PUAN.pA, sB=GC_PUAN.pB;
    if(!Number.isFinite(sA)||!Number.isFinite(sB)||sA===sB){ sA=kz===0?2:1; sB=kz===0?1:2; }
    else if((sA>sB)!==(kz===0)) return toast('Parti skoru kazanan takımla çelişiyor',true);

    c.takimlar=[{ad:'A',oyuncular:GC_A.slice()},{ad:'B',oyuncular:GC_B.slice()}];
    c.hizli={partiSkor:[sA,sB],puan:[Number.isFinite(pa)?pa:0,Number.isFinite(pb)?pb:0]};
    c.kazanan=kz;
    if(!c.tabelaci) c.tabelaci=GC_A[0];
  }else{
    if(GC_SIRA.length<3) return toast('101 için en az 3 oyuncu gerekli',true);
    const puan={};
    GC_SIRA.forEach(id=>{ puan[id]= GC_PUAN[id]===undefined?null:GC_PUAN[id]; });
    c.mod='tek'; c.oyuncular=GC_SIRA.slice(); c.esler=null;
    c.hizli={sira:GC_SIRA.slice(),puan};
    c.kazanan=GC_SIRA[0];
    if(!c.tabelaci) c.tabelaci=GC_SIRA[0];
  }

  const btn=$('#gcBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  try{
    c.zabit=zabitUret(c);
    const {data,error}=await sb.from('maclar').insert({
      masa_id:DB.aktifGrup, oyun:o, giris:'hizli', tarih, yer:c.yer||null,
      tabelaci_id:OTURUM.id, parti_hedef:c.partiHedef, mod:o==='101'?'tek':null,
      celse:JSON.parse(JSON.stringify(c)), bitti:true,
      kazanan:c.kazanan??null, zabit:c.zabit, aciklama:c.not||null
    }).select('id,olusturma').single();
    if(error) throw error;
    Object.assign(c,{id:data.id,grupId:DB.aktifGrup,bitti:true,_hesap:OTURUM.id,_sira:data.olusturma});
    DB.celseler.push(c);
    /* Geçmiş maçlar akışa DÜŞMEZ: arka arkaya 20 tane girilince akış çöp olur. */
    GC_A=[];GC_B=[];GC_SIRA=[];GC_PUAN={};
    kapatModal(); ARSIV_FILTRE='hepsi'; git('arsiv');
    toast(`${trh(tarih)} maçı deftere geçti. Sicil yeniden hesaplandı.`,true);
  }catch(e){
    toast(hataMetni(e),true);
    btn.disabled=false; btn.textContent='Deftere Geçir';
  }
}
