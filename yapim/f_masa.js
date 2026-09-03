//== viewCelse
/* Bir grupta aynı anda birkaç masa açık olabilir.
   SECILI_MAC yoksa masaların listesi, varsa o masanın tabelası. */
function viewCelse(){
  if(DB.aktif&&!tabelaciMiyim()) return canliIzle();
  if(DB.aktif) return DB.aktif.giris==='hizli' ? hizliEkran() : (DB.aktif.oyun==='batak'?aktifBatak():aktifYz());
  if(!DB.ben) return karsilama();

  const oyn=grupOyunculari();
  if(oyn.length<3) return `<div class="card"><div class="empty">
      <div class="big">👥</div>
      <div class="serif" style="font-size:17px;color:var(--ink)">Kadro eksik</div>
      <div class="sm" style="margin-top:8px">Oynamak için en az 3 oyuncu gerekiyor. Şu an ${oyn.length} var.</div>
      <button class="btn-p" style="margin-top:16px" onclick="git('ayar')">Oyuncu Ekle</button>
      ${kurucuMu()?`<button class="btn-b" style="margin-top:8px" onclick="kadroSor()">⚡ Parkverde kadrosunu kur</button>`:''}
      </div></div>`;

  /* Talik edilmiş masa "açık" sayılmaz: ayrı kutuda bekler, sayaçlara girmez. */
  const yuruyen=DB.acik.filter(c=>!c.talik);
  const son=grupCelseleri().slice().sort((a,b)=>(b.tarih+(b._sira||'')).localeCompare(a.tarih+(a._sira||'')))[0];
  return `
    ${yuruyen.length?`<div class="card">
      <h3><span class="canli"></span>Açık Masalar (${yuruyen.length})</h3>
      ${yuruyen.map(acikMasaSatir).join('<div class="sep"></div>')}
    </div>`:''}
    ${talikKart()}
    <div class="card">
      <h3>${yuruyen.length?'Bir Masa Daha Aç':'Yeni Masa'}</h3>
      <div class="two">
        <button class="btn-p" style="flex-direction:column;padding:20px 10px;gap:5px" onclick="celseBaslat('batak')">
          <span style="font-size:24px">🂡</span><span>BATAK</span>
          <span class="xs" style="opacity:.78;font-weight:500;line-height:1.35">eşli · ihaleli<br>parti ${DB.ayar.batak.hedef} puan</span></button>
        <button class="btn-b" style="flex-direction:column;padding:20px 10px;gap:5px" onclick="celseBaslat('101')">
          <span style="font-size:24px">🀄</span><span>101</span>
          <span class="xs" style="opacity:.78;font-weight:500;line-height:1.35">parti ${DB.ayar.yz.elSayisi} el<br>çok puanlı kaybeder</span></button>
      </div>
      <button class="btn-g btn-full btn-sm" style="margin-top:10px" onclick="kuraCek()">🎲 Eş Kurası Çek</button>
      <button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="mocksAc()">☕ The Mocks · Masa Hesabı</button>
      <div class="xs dim" style="margin-top:8px">${yuruyen.length
        ?'İki masa aynı anda yürüyebilir; her masanın tabelasını ayrı kişi yazar. '
        :''}Kurayı defter çeker, itiraz kabul edilmez.</div>
    </div>
    ${cagriKart()}
    ${dogumKart()}
    ${acikIddiaKart()}
    ${son?`<div class="card"><h3>Son Maç</h3>${arsivSatir(son,true)}</div>`:''}
    ${liderKart()}`;
}

function macOzet(c){
  const m=macDurum(c);
  if(c.oyun==='batak'){
    const T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
    return {kim:`${T(0)}  vs  ${T(1)}`, skor:`${m.gTop[0]}–${m.gTop[1]}`,
            alt:c.partiHedef>1?`parti ${m.partiSkor[0]}–${m.partiSkor[1]}`:''};
  }
  const s=m.sira;
  return {kim:c.oyuncular.map(ad).join(', '),
          skor:s.length?`${ad(s[0].id)} ${s[0].puan}`:'—',
          alt:s.length>1?`sonuncu ${ad(s[s.length-1].id)} ${s[s.length-1].puan}`:''};
}
function acikMasaSatir(c){
  const o=macOzet(c), benim=c._hesap===OTURUM.id;
  const yazan=DB.oyuncular.find(x=>x.profilId===c._hesap&&x.masaId===c.grupId);
  return `<div class="row" style="gap:10px;align-items:flex-start">
    <div class="grow" style="min-width:0">
      <div class="row wrap" style="gap:6px">
        <span class="pill ${c.oyun==='batak'?'red':'blue'}">${c.oyun==='batak'?'BATAK':'101'}</span>
        <span class="pill gold">${esc(c.masaAd||'Masa')}</span>
        ${c.giris==='hizli'?'<span class="pill">⚡</span>':''}
        <span class="xs dim">✍️ ${esc(yazan?.ad||'tabelacı')}</span>
      </div>
      <div class="sm" style="margin-top:5px;font-weight:600" >${esc(o.kim)}</div>
      <div class="xs muted">${esc(o.skor)}${o.alt?' · '+esc(o.alt):''}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
      <button class="btn-sm ${benim?'btn-p':''}" onclick="macSec('${c.id}')">${benim?'Tabela':'İzle'}</button>
      ${benim?`<button class="btn-xs btn-gh" onclick="misafirPaylasId('${c.id}')">📱 Paylaş</button>`:''}
    </div>
  </div>`;
}
function macSec(id){
  SECILI_MAC=id; DB.aktif=DB.acik.find(c=>c.id===id)||null;
  render(); window.scrollTo(0,0);
}
function macBirak(){
  SECILI_MAC=null; DB.aktif=null;
  render(); window.scrollTo(0,0);
}
const varsayilanMasaAd=()=>`${DB.acik.filter(c=>!c.talik).length+1}. Masa`;

//== celseKur
async function celseKur(oyun){
  const s=secililer();
  const giris=document.querySelector('#mGiris .on')?.dataset.g||'hizli';
  /* Parti sayısı artık iki giriş şeklinde de seçiliyor (hızlı mod da
     gerçek tabela). Seçim yoksa oyunun varsayılanına düş. */
  const partiHedef= Number(document.querySelector('#mParti .on')?.dataset.p)
                 || (oyun==='batak' ? (DB.ayar.batak.partiHedef||2) : (DB.ayar.yz.partiHedef||1));
  const tabelaci=document.querySelector('#mTabelaci .chip.on')?.dataset.id || DB.ben || s[0];
  /* Tabela FİİLEN devredilir: seçilen kişinin hesabı varsa yazma yetkisi
     ona geçer (yama 07). Hesabı yoksa kalem açanda kalır — yoksa kimse
     yazamaz duruma düşer. */
  const tHesap=oy(tabelaci)?.profilId || null;
  const kalemBende=!tHesap || tHesap===OTURUM.id;
  const masaAd=($('#mMasaAd')?.value||'').trim()||varsayilanMasaAd();
  const c={oyun,giris,masaAd,tarih:$('#mTarih').value||bugun(),yer:yerOku(),
           tabelaci,partiHedef,not:'',bahis:bahisOku(),partiler:[{eller:[],kazanan:null}]};
  if(oyun==='batak'){
    if(s.length!==4) return toast('Batak için tam 4 oyuncu gerekli',true);
    c.takimlar=[{ad:'A',oyuncular:[s[0],s[1]]},{ad:'B',oyuncular:[s[2],s[3]]}];
    c.hizli={partiSkor:[0,0],puan:[0,0]};
  }else{
    if(s.length<3) return toast('En az 3 oyuncu gerekli',true);
    c.mod=document.querySelector('#mMod .on')?.dataset.m||'tek';
    if(c.mod==='esli'&&s.length!==4) return toast('Eşli 101 için tam 4 oyuncu gerekli',true);
    c.oyuncular=s; c.esler=c.mod==='esli'?[[s[0],s[2]],[s[1],s[3]]]:null;
    c.hizli={sira:s.slice(),puan:{}};
  }
  /* Aynı oyuncu iki masada birden oturamaz */
  const mesgul=s.filter(id=>DB.acik.some(a=>macOyunculari(a).includes(id)));
  if(mesgul.length) return toast(`${liste(mesgul.map(ad))} zaten açık bir masada`,true);

  const btn=$('#mKurBtn'); if(btn){btn.disabled=true;btn.innerHTML='<span class="yukleniyor"></span>';}
  try{
    const yazanHesap = kalemBende ? OTURUM.id : tHesap;
    const {data,error}=await sb.from('maclar').insert({
      masa_id:DB.aktifGrup, oyun, giris, tarih:c.tarih, yer:c.yer||null,
      tabelaci_id:yazanHesap, parti_hedef:Math.min(5,Math.max(1,partiHedef)),
      mod:oyun==='101'?c.mod:null, celse:c, bitti:false
    }).select('id,olusturma').single();
    if(error) throw error;
    Object.assign(c,{id:data.id,grupId:DB.aktifGrup,bitti:false,_hesap:yazanHesap,_sira:data.olusturma});
    DB.acik.push(c); SECILI_MAC=c.id; DB.aktif=c;
    /* Seçilen parti sayısı bir dahaki masaya varsayılan olsun — giriş
       şeklinden bağımsız, çünkü ikisinde de seçiliyor artık. */
    if(kurucuMu()&&DB.ayar[oyun==='batak'?'batak':'yz'].partiHedef!==partiHedef){
      DB.ayar[oyun==='batak'?'batak':'yz'].partiHedef=partiHedef;
      ayarYaz(true);
    }
    kapatModal(); git('celse');
    if(!kalemBende)
      toast(`Tabela ${ad(tabelaci)}'e devredildi. Yazma yetkisi artık onda; sen izliyorsun.`,true);
    else if(!tHesap && tabelaci!==DB.ben)
      toast(`${ad(tabelaci)}'in hesabı yok, tabelayı sen yazıyorsun. Hesap açınca devredebilirsin.`,true);
  }catch(e){
    toast(hataMetni(e),true);
    if(btn){btn.disabled=false;btn.textContent='Tabelayı Aç';}
  }
}
const macOyunculari=c=>c.oyun==='batak'?c.takimlar.flatMap(t=>t.oyuncular):(c.oyuncular||[]);

//== celseKesinlestir
async function celseKesinlestir(){
  const c=DB.aktif; if(!c) return;
  clearTimeout(_yazZaman);          // bekleyen gecikmeli yazma kapanışın üstüne binmesin
  const oncekiRozet=rozetSahipleri(c.oyun);
  /* Maç kapanıyor: yürüyen partinin süresi de mühürlensin */
  if(typeof sureKapat==='function') sureKapat(c.partiler[c.partiler.length-1]);
  c.not=$('#zNot').value.trim();
  if(c.giris==='detay'){
    const son=c.partiler[c.partiler.length-1];
    if(son&&son.eller.length&&son.kazanan==null)
      son.kazanan=c.oyun==='batak'?batakPartiKazanan(son):yzPartiKazanan(son,c);
    if(son&&!son.eller.length&&c.partiler.length>1) c.partiler.pop();
  }
  const m=macDurum(c);
  c.kazanan = c.oyun==='batak' ? (m.macKazanan??(m.partiSkor[0]>=m.partiSkor[1]?0:1)) : (m.macKazanan??m.sira[0].id);
  c.zabit=zabitUret(c);
  const btn=document.querySelector('#modalHost .btn-g');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="yukleniyor"></span>';}
  try{
    await aktifYaz();
    const {error}=await sb.from('maclar').update({
      celse:aktifBelge(c), bitti:true, kazanan:c.kazanan??null,
      zabit:c.zabit, aciklama:c.not||null, tarih:c.tarih
    }).eq('id',c.id);
    if(error) throw error;
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='Zabtı Üret';}
    return toast(hataMetni(e),true);
  }
  c.bitti=true;
  DB.acik=DB.acik.filter(x=>x.id!==c.id);
  DB.celseler.unshift(c); DB.aktif=null; SECILI_MAC=null;

  const sonra=rozetSahipleri(c.oyun), yeni=[];
  muayyideler(c.oyun).forEach(r=>{ if(oncekiRozet[r.ad]!==sonra[r.ad]) yeni.push(r); });

  /* Zabıt ve el değiştiren unvanlar akışa düşsün */
  const kazananAd = c.oyun==='batak'
    ? c.takimlar[c.kazanan]?.oyuncular.map(ad).join(' & ')
    : ad(c.kazanan);
  akisEkle('zabit',c.zabit,{mac_id:c.id,oyun:c.oyun,masaAd:c.masaAd||'',tarih:c.tarih,kazanan:kazananAd})
    .then(()=>Promise.all(yeni.map(r=>
      akisEkle('unvan',r.aciklama||'',{unvan:r.ad,k:r.k,kim:ad(r.kim),oyun:c.oyun}))))
    .then(()=>{ if(TAB==='akis') render(); })
    .catch(()=>{});

  kapatModal(); zabitGoster(c,yeni);
}

//== celseIptal
async function celseIptal(){
  const c=DB.aktif; if(!c) return;
  if(!confirm('Bu tabela SİLİNECEK, yazılan sayılar gidecek.\n\nOyun yarıda kaldıysa silmek yerine ⏸️ Ara düğmesiyle celseyi talik et — tabela olduğu gibi durur, sonra kaldığın elden devam edersin.\n\nYine de silinsin mi?')) return;
  clearTimeout(_yazZaman); _bekleyenYazi=false;
  const {error}=await sb.from('maclar').delete().eq('id',c.id);
  if(error) return toast(hataMetni(error),true);
  DB.acik=DB.acik.filter(x=>x.id!==c.id);
  DB.aktif=null; SECILI_MAC=null;
  render(); toast('Tabela silindi');
}

//== canliIzle
/* Tabelacı ben değilim: yazamam, canlı izlerim. */
function canliIzle(){
  const c=DB.aktif, m=macDurum(c);
  /* Talik edilmişse izleyecek canlı bir şey yok; şeridi göster, çık. */
  if(c.talik) return `${talikBanner(c)}
    <div class="card tight center">
      <button class="btn-gh btn-sm" onclick="macBirak()">← Masalar</button></div>`;
  const kim=DB.oyuncular.find(o=>o.profilId===c._hesap&&o.masaId===c.grupId);
  const bas2=`<div class="card">
    <div class="row" style="justify-content:space-between">
      <div><div class="serif" style="font-size:17px"><span class="canli"></span>${esc(c.masaAd||'Masa')} · canlı</div>
        <div class="xs dim">${c.oyun==='batak'?'Batak':'101'} · ${trh(c.tarih)}${c.yer?' · '+esc(c.yer):''} · ✍️ ${esc(kim?.ad||'tabelacı')}</div></div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <button class="btn-xs btn-gh" onclick="macBirak()">← Masalar</button>
        <button class="btn-xs btn-gh" onclick="yenile()">Yenile</button></div>
    </div><div class="sep"></div>`;

  /* YÜRÜYEN PARTİ ayrı gösterilir. Eskiden maçın TOPLAMI (gTop / top)
     yazılıyordu; 1. parti bitince 2. partinin sayıları onun üstüne
     biniyor gibi görünüyordu — tabelacının ekranıyla tutmuyordu. */
  const parti=m.aktif, pIdx=m.aktifIdx;
  const pAd=partiAd(c,pIdx), cikis=pAd==='Çıkıştırma';
  const alt=`</div>
    ${sureKarti(c)}
    ${gecmisPartiler(c)}
    <div class="card tight center xs dim">Tabelayı ${esc(kim?.ad||'tabelacı')} tutuyor.
      Ekran kendiliğinden güncellenir. Yukarıdaki sayılar <b>${esc(pAd)}</b> içindir;
      önceki partiler ayrı durur.</div>`;

  if(c.oyun==='batak'){
    const T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
    const {top}=batakPartiToplam(parti);
    const pKz=batakPartiKazanan(parti);
    return bas2+`
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="serif" style="font-size:15px">${cikis?'🔥 ':''}${esc(pAd)}</div>
        <div class="xs dim">${parti.eller.length} el · hedef ${DB.ayar.batak.hedef}</div>
      </div>
      ${[0,1].map(i=>`<div class="row" style="padding:7px 0">
        <span class="pill ${i?'blue':'red'}">${c.takimlar[i].ad}</span>
        <div class="grow" style="font-weight:600;font-size:14px">${esc(T(i))}</div>
        <div class="serif" style="font-size:22px;${pKz===i?'color:var(--gold)':''}">${top[i]}</div>
      </div>`).join('')}
      <div class="xs dim center" style="margin-top:6px">Parti skoru ${m.partiSkor[0]}–${m.partiSkor[1]}
        · ${c.partiHedef} parti üzerinden${c.partiler.length>1?` · maç toplamı ${m.gTop[0]}–${m.gTop[1]}`:''}</div>
      ${alt}`;
  }

  /* 101: yürüyen partinin puanları. Sıralama da o partiye göre. */
  const pt=yzPartiToplam(parti,c);
  const sr=c.oyuncular.slice().sort((x,y)=>pt[x]-pt[y]||ad(x).localeCompare(ad(y),'tr'));
  return bas2+`
    <div class="row" style="justify-content:space-between;margin-bottom:8px">
      <div class="serif" style="font-size:15px">${esc(pAd)}</div>
      <div class="xs dim">${parti.eller.length} / ${DB.ayar.yz.elSayisi} el</div>
    </div>
    ${sr.map((id,i)=>`<div class="row" style="padding:6px 0;gap:9px">
      <div class="rank ${i===0?'r1':(i===sr.length-1?'rs':'')}">${i+1}</div>
      ${avatar(id,30)}
      <div class="grow" style="margin-left:4px;font-weight:600;font-size:14px">${esc(ad(id))}</div>
      <div class="serif" style="font-size:19px">${pt[id]}</div></div>`).join('')}
    ${c.partiler.length>1?`<div class="xs dim center" style="margin-top:6px">Parti sayısı ${
      c.oyuncular.map(id=>`${ad(id)} ${m.partiKaz[id]||0}`).join(' · ')}</div>`:''}
    ${alt}`;
}
