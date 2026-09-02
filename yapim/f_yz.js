//== yzDurumPuan
/* Bir oyuncunun bir eldeki puanı.
   Normal puanın DIŞINDA iki alan var (02.09.2026, kullanıcı):
     · SİLME  → ödül; toplamdan sabit bir miktar düşer (ayar: yz.silme, eksi değer)
     · CEZA   → elle yazılan ek ceza; normal puanın üstüne biner
   İkisi de her el, her oyuncu için ayrı ayrı tutulur. */
function yzDurumPuan(d){
  const a=DB.ayar.yz; if(!d) return 0;
  /* ELLE GIRIS: uygulama kural yorumlamiyor. Sayi yazilir, ceza eklenir,
     odul dusulur. Ev kurallari degistiginde kod degistirmek gerekmiyor. */
  if(d.tip==='elle')
    return (Number(d.sayi)||0) + (Number(d.ceza)||0) - (Number(d.odul)||0);
  let p=0;
  switch(d.tip){
    case 'bitirdi': p=(a.okeyAktif&&d.okey)?a.bitiren*a.okeyCarpan:a.bitiren; break;
    case 'es':      p=0; break;
    case 'acamadi': p=a.acamayan; break;
    case 'kaldi':   p=Number(d.sayi)||0; break;
    case 'cifte':   p=(Number(d.sayi)||0)*a.cifteCarpan; break;
    default:        p=0;
  }
  if(d.silme) p += (Number(a.silme)||0);      // ödül (eksi)
  if(d.ceza)  p += (Number(d.ceza)||0);       // ek ceza (artı)
  return p;
}
/* puanın kırılımı: tabelada ayrı sütun göstermek için */
function yzKirilim(d){
  const a=DB.ayar.yz;
  if(!d) return {normal:0,odul:0,ceza:0,toplam:0};
  /* Elle giriste kirilim dogrudan yazilan uc alandan gelir. */
  if(d.tip==='elle'){
    const n0=Number(d.sayi)||0, z=Number(d.ceza)||0, o=Number(d.odul)||0;
    return {normal:n0, ceza:z, odul:-o, toplam:n0+z-o};
  }
  let n=0;
  switch(d.tip){
    case 'bitirdi': n=(a.okeyAktif&&d.okey)?a.bitiren*a.okeyCarpan:a.bitiren; break;
    case 'acamadi': n=a.acamayan; break;
    case 'kaldi':   n=Number(d.sayi)||0; break;
    case 'cifte':   n=(Number(d.sayi)||0)*a.cifteCarpan; break;
  }
  const odul=d.silme?(Number(a.silme)||0):0;
  const ceza=d.ceza?(Number(d.ceza)||0):0;
  return {normal:n,odul,ceza,toplam:n+odul+ceza};
}

//== yzDurumSec
function yzDurumSec(el){
  const kart=el.closest('.el-card');
  /* silme ve ceza durumdan bağımsız; onların düğmeleri ayrı kutuda */
  kart.querySelectorAll('.durumlar .chip').forEach(x=>x.classList.remove('on'));
  el.classList.add('on');
  const tip=el.dataset.d, ek=kart.querySelector('.ek'), a=DB.ayar.yz;
  if(tip==='kaldi'||tip==='cifte'){
    ek.style.display='block';
    ek.innerHTML=`<label class="fl">Elinde kalan sayı${tip==='cifte'?` (×${a.cifteCarpan} yazılır)`:''}</label>
      <input type="number" inputmode="numeric" class="say" placeholder="örn. 48">`;
    ek.querySelector('.say').focus();
  }else if(tip==='bitirdi'&&a.okeyAktif){
    ek.style.display='block';
    ek.innerHTML=`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="okey" style="width:18px;height:18px"> Okeyle bitirdi (×${a.okeyCarpan})</label>`;
  }else{ek.style.display='none';ek.innerHTML='';}
}
/* silme rozeti: durum seçiminden bağımsız açılıp kapanır */
function yzSilmeSec(el){ el.classList.toggle('on'); }

//== yzElEkle
function yzElEkle(){
  const c=DB.aktif,parti=yzMac(c).aktif,durum={},eksik=[];
  let bitiren=null;
  const say=x=>{ const v=x?.value; return (v===''||v==null)?null:Number(v); };
  for(const id of c.oyuncular){
    const kart=document.querySelector(`.el-card[data-oy="${id}"]`);
    const s=say(kart.querySelector('.say'));
    const cz=say(kart.querySelector('.cezaGir'));
    const od=say(kart.querySelector('.odulGir'));
    const bt=!!kart.querySelector('.bitirdi')?.checked;
    if(s===null&&cz===null&&od===null&&!bt){ eksik.push(ad(id)); continue; }
    const d={tip:'elle'};
    if(s!==null)  d.sayi=s;
    if(cz)        d.ceza=cz;
    if(od)        d.odul=od;
    if(bt){ d.bitirdi=true; bitiren=id; }
    durum[id]=d;
  }
  /* Hicbir sey yazilmayan oyuncuya 0 yazilir — "durum secilmedi" diye
     tutmuyoruz artik, cunku sifir da gecerli bir sonuc. */
  eksik.forEach(()=>{});
  c.oyuncular.forEach(id=>{ if(!durum[id]) durum[id]={tip:'elle',sayi:0}; });
  parti.eller.push({durum}); kaydet(); render();
  const N=DB.ayar.yz.elSayisi||11;
  toast(parti.eller.length>=N?`${N}. el girildi — parti tamamlandı`:yzElYorum(c,durum),true);
}

//== yzElYorum
function yzElYorum(c,durum){
  const p=id=>yzDurumPuan(durum[id]);
  const bit=c.oyuncular.filter(id=>durum[id]&&(durum[id].bitirdi||durum[id].tip==='bitirdi'));
  const agir=c.oyuncular.slice().sort((x,y)=>p(y)-p(x))[0];
  const cezali=c.oyuncular.filter(id=>durum[id]&&durum[id].ceza);
  const odullu=c.oyuncular.filter(id=>durum[id]&&durum[id].odul);
  if(bit.length) return rast([
    `${liste(bit.map(ad))} eli bitirdi. Masa sessizliğe gömülmüştür.`,
    `${liste(bit.map(ad))} bitirdi; itiraz yolu kapalıdır.`]);
  if(cezali.length) return `${liste(cezali.map(ad))} ceza yemiştir. Savunması alınmamıştır.`;
  if(odullu.length) return `${liste(odullu.map(ad))} ödül almıştır; masa bunu şüpheyle karşılamıştır.`;
  if(agir&&p(agir)>0) return `Elin en ağır hanesi ${ad(agir)}'e yazılmıştır: ${p(agir)}.`;
  return 'El kaydedildi.';
}
