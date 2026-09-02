//== yzDurumPuan
/* Bir oyuncunun bir eldeki puanı.
   Normal puanın DIŞINDA iki alan var (02.09.2026, kullanıcı):
     · SİLME  → ödül; toplamdan sabit bir miktar düşer (ayar: yz.silme, eksi değer)
     · CEZA   → elle yazılan ek ceza; normal puanın üstüne biner
   İkisi de her el, her oyuncu için ayrı ayrı tutulur. */
function yzDurumPuan(d){
  const a=DB.ayar.yz; if(!d) return 0;
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
  for(const id of c.oyuncular){
    const kart=document.querySelector(`.el-card[data-oy="${id}"]`);
    const s=kart.querySelector('.durumlar .chip.on');
    if(!s){eksik.push(ad(id));continue;}
    const tip=s.dataset.d,d={tip};
    if(tip==='kaldi'||tip==='cifte'){
      const v=kart.querySelector('.say')?.value;
      if(v===''||v==null) return toast(`${ad(id)} için kalan sayıyı gir`,true);
      d.sayi=Number(v);
    }
    if(tip==='bitirdi'){bitiren=id;d.okey=!!kart.querySelector('.okey')?.checked;}
    if(kart.querySelector('.silme.on')) d.silme=true;
    const cz=kart.querySelector('.cezaGir')?.value;
    if(cz!==''&&cz!=null&&Number(cz)) d.ceza=Number(cz);
    durum[id]=d;
  }
  if(eksik.length) return toast(`Durum seçilmedi: ${eksik.join(', ')}`,true);
  if(!bitiren) return toast('El bitiren oyuncuyu işaretle',true);
  if(c.mod==='esli'&&c.esler){
    const pr=c.esler.find(p=>p.includes(bitiren)), es=pr&&pr.find(x=>x!==bitiren);
    if(es&&durum[es]&&durum[es].tip!=='es'){
      const kor={tip:'es'};
      if(durum[es].silme) kor.silme=true;
      if(durum[es].ceza)  kor.ceza=durum[es].ceza;
      durum[es]=kor;
    }
  }
  parti.eller.push({durum}); kaydet(); render();
  const N=DB.ayar.yz.elSayisi||11;
  toast(parti.eller.length>=N?`${N}. el girildi — parti tamamlandı`:yzElYorum(c,durum),true);
}

//== yzElYorum
function yzElYorum(c,durum){
  const a=DB.ayar.yz;
  const bit=c.oyuncular.find(id=>durum[id]?.tip==='bitirdi');
  const ac =c.oyuncular.filter(id=>durum[id]?.tip==='acamadi');
  const ci =c.oyuncular.filter(id=>durum[id]?.tip==='cifte');
  const si =c.oyuncular.filter(id=>durum[id]?.silme);
  const cz =c.oyuncular.filter(id=>durum[id]?.ceza);
  if(si.length)    return `${liste(si.map(ad))} SİLDİ: hanesinden ${Math.abs(Number(a.silme)||0)} puan düştü. Masa bu hâli kıskançlıkla izlemiştir.`;
  if(cz.length)    return `${liste(cz.map(ad))} hakkında ek ceza yazılmıştır. Gerekçe tabelacıya aittir.`;
  if(ac.length>=2) return `${liste(ac.map(ad))} açamadı. Masanın yarısı seyirci konumundadır.`;
  if(ci.length)    return `${liste(ci.map(ad))} çifte gitti, bedeli iki katı. Cesaret pahalıdır.`;
  if(ac.length===1)return `${ad(ac[0])} açamadı: +${a.acamayan}. Savunması alınmamıştır.`;
  if(bit) return rast([`${ad(bit)} eli bitirdi. Masa sessizliğe gömülmüştür.`,
                       `${ad(bit)} ${a.bitiren} yazdı. İtiraz yolu kapalıdır.`]);
  return 'El kaydedildi.';
}
