//== muayyideler
/* Batak'ta ihale de puan da TAKIMA aittir; eşlerin istatistiği birbirinin
   aynısı çıkar. Bu yüzden unvan artık tek kişi değil, BAŞA BAŞ OLANLARIN
   HEPSİ. Eşler birlikte oynadıkça unvanı paylaşırlar; farklı eşlerle
   oynayıp sayılar ayrıştıkça unvan kendiliğinden tek kişiye döner. */
function muayyideler(oyun){
  const v=Object.values(istatistik(oyun)).filter(p=>p.celse>0);
  const out=[]; if(!v.length) return out;

  /* en yüksek / en düşük — başa baş olanların TAMAMINI döndürür */
  const enb=(l,f)=>{ if(!l.length) return null;
    const en=Math.max(...l.map(f)); return en>0 ? l.filter(p=>f(p)===en) : null; };
  const enk=(l,f)=>{ if(!l.length) return null;
    const en=Math.min(...l.map(f)); return l.filter(p=>f(p)===en); };
  const ek=(k,ad2,kim,acik,tip)=>{
    if(kim&&kim.length) out.push({k,ad:ad2,kim:kim.map(p=>p.id||p),aciklama:acik,tip:tip||'iyi'});
  };
  const b=x=>x[0];                       // başa baş olanların değerleri aynı

  const sampiyon=enb(v,p=>p.gal*1000+p.oran);
  ek('🏆','Emsal Karar',sampiyon,sampiyon&&`${b(sampiyon).gal} maç birinciliği. Artık içtihattır.`);

  if(oyun==='batak'){
    const sp=enk(v,p=>p.toplamPuan);
    ek('💸','Masanın Sponsoru',sp,sp&&`Toplam ${b(sp).toplamPuan} puan. Masayı fiilen finanse etmektedir.`,'kotu');

    const mut=enb(v,p=>p.ihale);
    ek('🏗️','İhale Müteahhidi',mut,mut&&`${b(mut).ihale} ihale. İştahı sabittir, sonuçları değişkendir.`);

    const enkaz=enb(v.filter(p=>p.ihale>=3),p=>p.batOran);
    ek('💥','Enkaz Ustası',enkaz,enkaz&&`${b(enkaz).ihale} ihalenin ${b(enkaz).ihaleBat} tanesini batırdı (%${Math.round(b(enkaz).batOran*100)}). Yıkım ustasıdır.`,'kotu');

    const buz=v.filter(p=>p.ihale>=3&&p.ihaleBat===0);
    ek('🧊','Buzdolabı',buz.length?buz:null,buz.length&&`${b(buz).ihale} ihale, sıfır batak. Soğukkanlılığı rahatsız edicidir.`);

    const nisan=enb(v.filter(p=>p.ihale>=3),p=>p.ihaleTam);
    ek('🎯','Keskin Nişancı',nisan,nisan&&`${b(nisan).ihaleTam} ihale tutturdu. Ağzından çıkanı kulağı duyuyor.`);

    const slem=enb(v,p=>p.slem);
    ek('🧨','Şlemci',slem,slem&&`${b(slem).slem} kez masaya tek el bırakmadı. Kibri kayda geçirilmiştir.`);

    const bey=enk(v.filter(p=>p.celse>=2),p=>p.ihale/Math.max(1,p.celse));
    const mutIds=(mut||[]).map(p=>p.id);
    if(bey&&mut&&!bey.some(p=>mutIds.includes(p.id)))
      ek('🎩','Beyefendi',bey,`Maç başına ${(b(bey).ihale/b(bey).celse).toFixed(1)} ihale. Riski eşine bırakma sanatı.`);

    const cik=enb(v,p=>p.cikisGal);
    ek('🩸','Çıkıştırma Celladı',cik,cik&&`Çıkıştırmada ${b(cik).cikisGal} galibiyet. Soğukkanlı katildir.`);

    const kur=enb(v,p=>p.cikisKay);
    ek('⚰️','Çıkıştırma Kurbanı',kur,kur&&`Çıkıştırmada ${b(kur).cikisKay} yenilgi. Son virajda direksiyon kilitlenmektedir.`,'kotu');
  }else{
    const sp=enb(v,p=>p.toplamPuan);
    ek('💸','Masanın Sponsoru',sp,sp&&`Toplam ${b(sp).toplamPuan} ceza puanı. Kendi rekorunu kendisi kırmaktadır.`,'kotu');

    const bit=enb(v,p=>p.elBitirdi);
    ek('✂️','İnfaz Memuru',bit,bit&&`${b(bit).elBitirdi} el bitirdi. Masaya merhameti yoktur.`);

    const kap=enb(v,p=>p.acamadi);
    ek('🔒','Kapalı Dosya',kap,kap&&`${b(kap).acamadi} el açamadı, ${b(kap).acamadi*DB.ayar.yz.acamayan} puan ceza yazıldı.`,'kotu');

    const kum=enb(v,p=>p.cifte);
    ek('🎲','Çifte Kumrusu',kum,kum&&`${b(kum).cifte} kez çifte gitti. Cesaretin bedeli iki katıdır.`);

    const agir=enb(v,p=>p.enAgirCeza);
    ek('🐢','Ağır Ceza',agir,agir&&`Tek elde ${b(agir).enAgirCeza} puan yedi. Rekor kendisindedir.`,'kotu');

    const nazar=enb(v,p=>p.ikinci);
    ek('🧿','Nazar Boncuğu',nazar,nazar&&`${b(nazar).ikinci} kez ikinci oldu. Kürsüye en yakın uzaklıktır.`);

    const hesap=enb(v,p=>p.son);
    ek('🧾','Hesabı Ödeyen',hesap,hesap&&`${b(hesap).son} kez sonuncu. Garson kendisini tanımaktadır.`,'kotu');

    const sil=enb(v,p=>p.silmeSay||0);
    ek('🧹','Silgi',sil,sil&&`${b(sil).silmeSay} kez silme yaptı. Hanesini temizlemekte mahirdir.`);

    const cez=enb(v,p=>p.ekCeza||0);
    ek('⚖️','Sicili Kabarık',cez,cez&&`Elle yazılmış ${b(cez).ekCeza} puan ek ceza. Gerekçeler tabelacıda saklıdır.`,'kotu');
  }

  const dus=enb(v.filter(p=>p.seriTip==='hasret'&&p.seri>=2),p=>p.seri);
  ek('📉','Serbest Düşüş',dus,dus&&`Galibiyet hasreti ${b(dus).seri}. maça çıktı. Dosya ilgili birime sevk edilmiştir.`,'kotu');

  const ser=enb(v.filter(p=>p.seriTip==='gal'&&p.seri>=2),p=>p.seri);
  ek('🔥','Müktesep Hak',ser,ser&&`Üst üste ${b(ser).seri} maç birinci. Tesadüf savunması reddedilmiştir.`);

  const dev=enb(v,p=>p.celse);
  ek('🪑','Kürsü Müdavimi',dev,dev&&`${b(dev).celse} maç. Masanın demirbaşıdır.`);
  return out;
}

/* unvan sahiplerini yazıya çevir: "Sadık ve Volkan" */
const unvanKisi=kim=>Array.isArray(kim)?kim:[kim];
const unvanAd=kim=>liste(unvanKisi(kim).map(ad));
function unvanAvatar(kim,b){
  const l=unvanKisi(kim), g=l.slice(0,3);
  return g.map(id=>avatar(id,b||26)).join('')+(l.length>3?`<span class="xs dim">+${l.length-3}</span>`:'');
}

//== rozetSahipleri
function rozetSahipleri(oyun){
  /* Unvanın el değiştirip değiştirmediğini anlamak için sahiplerin
     tamamını tek anahtara çeviriyoruz; eş değişince de fark edilsin. */
  const m={};
  muayyideler(oyun).forEach(x=>m[x.ad]=unvanKisi(x.kim).slice().sort().join(','));
  return m;
}

//== genelMuayyideler
/* oyundan bağımsız unvanlar: iddia + doğum günü (bunlar kişiseldir) */
function genelMuayyideler(){
  const out=[];
  const v=Object.values(iddiaSicil()).filter(p=>p.kazandi+p.kaybetti>0);
  if(v.length){
    const laf=v.slice().sort((a,b)=>(b.kaybetti-b.kazandi)-(a.kaybetti-a.kazandi))[0];
    if(laf&&laf.kaybetti>laf.kazandi) out.push({k:'🎤',ad:'Ağzı Kalabalık',kim:[laf.id],tip:'kotu',
      aciklama:`${laf.kaybetti} iddia kaybetti, ${laf.kazandi} kazandı. Konuşmadan önce düşünmesi tavsiye olunur.`});
    const er=v.slice().sort((a,b)=>(b.kazandi-b.kaybetti)-(a.kazandi-a.kaybetti))[0];
    if(er&&er.kazandi>er.kaybetti) out.push({k:'🪙',ad:'Sözünün Eri',kim:[er.id],
      aciklama:`${er.kazandi} iddia tuttu. Beyanı senet hükmündedir.`});
    const acikci=v.slice().sort((a,b)=>b.acik-a.acik)[0];
    if(acikci&&acikci.acik>=2) out.push({k:'📿',ad:'Vaatler Bakanı',kim:[acikci.id],
      aciklama:`${acikci.acik} açık iddia. Hepsinin vadesi gelecektir.`});
  }
  const dgler=DB.oyuncular.filter(o=>o.dogum&&dgKalan(o.dogum)===0);
  dgler.forEach(o=>out.push({k:'🎂',ad:'Doğum Günü Çocuğu',kim:[o.id],
    aciklama:`Bugün ${yas(o.dogum)??'?'} yaşına bastı. Masa, kaybetse dahi üzülmemesini kararlaştırmıştır.`}));

  /* Borç / ısmarlama temelli ünvanlar — grup geneli (batak+101 ortak).
     borcTablosu() güncel bakiyeyi verir: eksi borç, artı alacak. */
  borcUnvanlari().forEach(x=>out.push(x));
  return out;
}

/* Kişi başına güncel borç/alacak dökümü — ortak taraflarda her üyeye
   aynı miktar yazılır (batak eş mantığının aynısı). */
function borcUnvanVeri(){
  const per={};
  const al=id=>per[id]=per[id]||{id,borc:0,alacak:0,kalem:{},odeme:0};
  const t=(typeof borcTablosu==='function')?borcTablosu():{};
  Object.entries(t).forEach(([k,v])=>{
    if(!v) return;
    const i=k.indexOf('|'), ne=k.slice(i+1);
    tarafKisiler(k.slice(0,i)).forEach(id=>{
      const p=al(id);
      if(v<0){ p.borc+=-v; p.kalem[ne]=(p.kalem[ne]||0)+(-v); }
      else   { p.alacak+=v; }
    });
  });
  (DB.akis||[]).forEach(a=>{ const o=a.veri&&a.veri.odeme; if(!o) return;
    const tf=(o.taraf&&o.taraf.length)?o.taraf:[o.kim];
    tf.forEach(id=>{ if(id) al(id).odeme+=(Number(o.adet)||0); });
  });
  return per;
}

function borcUnvanlari(){
  const out=[], per=borcUnvanVeri();
  const v=Object.values(per);
  if(!v.length) return out;
  /* başa baş olanların HEPSİ (eşit borç → ortak ünvan) */
  const enb=(f,esik)=>{ const m=Math.max(...v.map(f));
    return m>=(esik||1) ? v.filter(p=>f(p)===m) : null; };
  const kim=l=>l.map(p=>p.id);
  const b=l=>l[0];

  const kahve=enb(p=>p.kalem['Kahve']||0);
  if(kahve) out.push({k:'☕',ad:'Kahve Rejonu',kim:kim(kahve),tip:'kotu',
    aciklama:`${b(kahve).kalem['Kahve']} kahve borçlu. Ocak kendisine emanettir.`});

  const cay=enb(p=>p.kalem['Çay']||0);
  if(cay) out.push({k:'🫖',ad:'Çay Ocağı',kim:kim(cay),tip:'kotu',
    aciklama:`${b(cay).kalem['Çay']} çay borçlu. Demlik hiç boş kalmaz.`});

  const acik=enb(p=>p.borc,2);
  if(acik) out.push({k:'🧾',ad:'Açık Hesap',kim:kim(acik),tip:'kotu',
    aciklama:`Toplam ${b(acik).borc} kalem borç. Defter kabarıktır, ödeme günü meçhuldür.`});

  const banka=enb(p=>p.alacak,2);
  if(banka) out.push({k:'🏦',ad:'Masanın Bankası',kim:kim(banka),
    aciklama:`Toplam ${b(banka).alacak} kalem alacak. Faizsiz, ama unutmaz.`});

  const comert=enb(p=>p.odeme,2);
  if(comert) out.push({k:'🤝',ad:'Cömert Baba',kim:kim(comert),
    aciklama:`${b(comert).odeme} kalem borcunu ifa etti. Sözünde durmak nadir bir hasletdir.`});

  const temiz=v.filter(p=>p.borc===0&&(p.alacak>0||p.odeme>0));
  if(temiz.length && !acik) out.push({k:'✨',ad:'Sabıkasız',kim:kim(temiz),
    aciklama:`Üstünde tek kalem borç yok. Sicili tertemizdir.`});

  return out;
}

//== viewRozet
function viewRozet(){
  const oyun=ROZET_OYUN;
  const secim=`<div class="seg" style="margin-bottom:12px">
    <button class="${oyun==='batak'?'on':''}" onclick="ROZET_OYUN='batak';render()">Batak</button>
    <button class="${oyun==='101'?'on':''}" onclick="ROZET_OYUN='101';render()">101</button></div>`;
  const r=muayyideler(oyun);
  if(!r.length && !genelMuayyideler().length)
    return secim+`<div class="card"><div class="empty"><div class="big">🏅</div>
    Henüz unvan dağıtılmadı.<div class="sm" style="margin-top:6px">Birkaç maç oyna, unvanlar sahiplerini bulsun.</div></div></div>`
    + borcKart() + efsaneKart();
  const gen=genelMuayyideler();
  const iyi=r.filter(x=>x.tip!=='kotu').concat(gen.filter(x=>x.tip!=='kotu'));
  const kotu=r.filter(x=>x.tip==='kotu').concat(gen.filter(x=>x.tip==='kotu'));
  const kart=x=>{
    const l=unvanKisi(x.kim);
    return `<div class="rozet"><div class="k">${x.k}</div><div class="grow" style="min-width:0">
      <div style="font-weight:700;font-size:13.5px">${esc(x.ad)}
        ${l.length>1?'<span class="pill" style="margin-left:4px">ortak</span>':''}</div>
      <div style="font-size:12.5px;color:var(--gold);margin-top:1px">${esc(unvanAd(x.kim))}</div>
      <div class="xs muted" style="margin-top:2px">${esc(x.aciklama||'')}</div></div>
      <div class="row" style="gap:4px;flex-shrink:0">${unvanAvatar(x.kim,26)}</div></div>`;
  };
  const svTablo=DB.oyuncular.map(o=>({o,n:toplamMac(o.id)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n);
  return secim+`
  ${iyi.length?`<div class="card"><h3>🏆 Şeref Levhası</h3><div class="stack">${iyi.map(kart).join('')}</div></div>`:''}
  ${kotu.length?`<div class="card"><h3>⚠️ Utanç Duvarı</h3><div class="stack">${kotu.map(kart).join('')}</div></div>`:''}
  ${borcKart()}
  ${aramizdaKart(oyun)}
  ${efsaneKart()}
  ${oyun==='batak'?`<div class="card tight xs dim">Batak'ta ihale ve puan takıma aittir; eşler
    başa başsa unvanı <b>ortak</b> taşır. Farklı eşlerle oynadıkça sayılar ayrışır, unvan tek kişiye döner.</div>`:''}
  ${svTablo.length?`<div class="card"><h3>Kıdem</h3>${svTablo.map(({o,n})=>{const s=seviye(n);
    const sonra=SEVIYELER.find(x=>x.n>n);
    return `<div class="row" style="padding:7px 0;gap:9px">${avatar(o.id,28)}
      <div class="grow"><div style="font-weight:600;font-size:13.5px">${esc(o.ad)}</div>
        <div class="xs dim">${s.k} ${s.ad}${sonra?` · ${sonra.n-n} maç sonra ${sonra.ad}`:' · zirve'}</div></div>
      <div class="serif dim" style="font-size:16px">${n}</div></div>`;}).join('')}</div>`:''}`;
}
