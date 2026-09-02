//== batakElPuan
/* Bir eli puana çevirir.
   el.alinan = İHALEYİ ALAN takımın çıkardığı el sayısı.

   EV KURALI (02.09.2026, kullanıcı): İhaleyi alan takım 13'ün tamamını
   alırsa (ŞLEM), karşı takım ihaleye girilen sayı kadar BATAR — yani
   -ihale yazar. Önceki hâlde 0 yazıyordu, yanlıştı.

   Şlemi ihaleyi ALMAYAN takım yaparsa (alinan=0) zaten ihale batmış
   olur: alan takım -ihale yazar, karşı takım 13 yazar. O yön doğruydu. */
function batakElPuan(el,a){
  /* HAM SATIR: tabelaya kâğıttaki gibi iki sayı doğrudan yazılmış.
     İhale/koz dökümü yoktur; ne yazıldıysa o geçerlidir (eksi dahil). */
  if(el && Array.isArray(el.ham)) return [Number(el.ham[0])||0, Number(el.ham[1])||0];
  const t=[0,0], alan=el.ihaleTakim, karsi=1-alan;
  const tuttu=el.alinan>=el.ihale, slem=el.alinan===a.toplamEl;

  t[alan]= tuttu ? (a.tutunca==='ihale'?el.ihale:el.alinan) : -el.ihale;

  if(slem)                             t[karsi]=(a.slem==='yok')?0:-el.ihale;
  else if(!tuttu&&a.batinca==='onuc')  t[karsi]=a.toplamEl;
  else if(!tuttu&&a.batinca==='ihale') t[karsi]=el.ihale;
  else                                 t[karsi]=a.toplamEl-el.alinan;
  return t;
}

//== batakElYorum
function batakElYorum(c,el){
  const a=DB.ayar.batak;
  const T=i=>c.takimlar[i].oyuncular.map(ad).join(' & ');
  const fark=el.ihale-el.alinan;
  if(el.alinan===a.toplamEl)
    return `ŞLEM. ${T(el.ihaleTakim)} masaya tek el bırakmadı.${a.slem==='yok'?'':` ${T(1-el.ihaleTakim)} ${el.ihale} batmıştır.`} Kibir kayda geçirilmiştir.`;
  if(fark>=4) return rast([
    `${T(el.ihaleTakim)} ${el.ihale} dedi, ${el.alinan} çıkardı. Aradaki ${fark} el hayal gücüne verilmiştir.`,
    `${el.ihale} ihaleden ${el.alinan} el. Mahkeme bu beyanı gerçeğe aykırı bulmuştur.`]);
  if(fark>0) return rast([
    `Batak. ${fark} el eksik. "Az kalmıştı" savunması dinlenmemiştir.`,
    `${T(el.ihaleTakim)} ${fark} el eksikle batmıştır. Kayıt düşülmüştür.`]);
  if(el.alinan-el.ihale>=3) return `${el.ihale} ihaleyle ${el.alinan} el. Mütevazı beyan, cezasız bırakılmıştır.`;
  return rast(['İhale tutmuştur. Sıradaki.',`${T(el.ihaleTakim)} sözünü tutmuştur; nadir görülen bir hâldir.`]);
}
