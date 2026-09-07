/* =========================================================
   GRUP YÖNETİMİ — listeden doğrudan silme

   Önceden: silmek için o gruba GEÇMEK, sonra Düzenle → Grubu Sil
   gerekiyordu. Yanlışlıkla ikinci kez kurulmuş boş bir grubu temizlemek
   için aktif grubu değiştirmek zorunda kalmak saçmaydı.

   Şimdi: Ayarlar → Gruplarım listesinde her satırda "Sil" var (yalnız
   kurucu olduğun gruplarda). Aktif olmayan grup da silinebiliyor.

   NE KADAR "ADMIN": Kurucu olduğu grupları görür ve siler. Üyesi
   OLMADIĞI grupları göremez — bu bir eksiklik değil, RLS'in ta kendisi.
   Kimse başkasının masasını göremesin diye böyle; kurucu da istisna
   değil. Zaten uygulamada gruplar kodla kuruluyor, "başkasının grubu"
   diye bir şey senin hesabına hiç görünmez.
   ========================================================= */

async function grupSilListeden(id){
  const g=grup(id);
  if(!g) return;
  if(g.rol!=='kurucu') return toast('Yalnız grubu kuran silebilir',true);

  const macN=DB.celseler.filter(c=>c.grupId===id).length;
  const acikN=DB.acik.filter(c=>c.grupId===id).length;
  const oyN=(g.uyeler||[]).length;
  const bos=macN===0&&acikN===0;
  const tek=DB.gruplar.length<=1;

  /* Dolu grubu silmek gerçekten yıkıcı: iki aşamalı onay + ne gideceğinin dökümü */
  acModal(`
    <h2 class="serif" style="margin:0 0 4px">${g.emoji} ${esc(g.ad)} — Grubu Sil</h2>
    <div class="xs dim" style="margin-bottom:12px">Bu işlemin geri dönüşü yoktur.</div>

    <div class="card tight" style="margin:0 0 12px;background:var(--panel2)">
      <div class="xs dim" style="margin-bottom:6px">SİLİNECEKLER</div>
      <div class="sm">· ${oyN} oyuncu kaydı</div>
      <div class="sm">· ${macN} kapanmış maç ve zabıtları</div>
      ${acikN?`<div class="sm">· ${acikN} AÇIK masa (yarıda kalmış tabela)</div>`:''}
      <div class="sm">· grubun akışı, iddia defteri, borç hesabı, efsaneleri, kuralları</div>
    </div>

    ${bos
      ? `<div class="uyari" style="margin-bottom:12px">Bu grupta hiç maç yok — <b>boş</b> görünüyor.
          Yanlışlıkla ikinci kez kurulmuş olması muhtemel.</div>`
      : `<div class="card tight" style="margin:0 0 12px;border-color:var(--red)">
          <div class="sm" style="color:#D2A08F"><b>Bu grup DOLU.</b> ${macN} maçlık sicil,
          rekorlar ve borç kayıtları birlikte gidecek. Silmeden önce
          <b>Ayarlar → Defter → Yedek Al</b> demen tavsiye edilir.</div></div>`}

    ${tek?`<div class="xs dim" style="margin-bottom:12px">Bu tek grubun. Silersen uygulama
      "grubun yok" ekranına döner; yeniden kurman gerekir.</div>`:''}

    <div class="field"><label class="fl">Onay için grubun adını yaz</label>
      <input id="gsOnay" placeholder="${esc(g.ad)}" autocapitalize="off"></div>

    <button class="btn-dn btn-full" id="gsBtn" style="margin-top:14px"
      onclick="grupSilOnayla('${id}')">Kalıcı Olarak Sil</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Vazgeç</button>`);
}

async function grupSilOnayla(id){
  const g=grup(id); if(!g) return;
  const yazilan=($('#gsOnay')?.value||'').trim().toLocaleLowerCase('tr-TR');
  if(yazilan!==String(g.ad).trim().toLocaleLowerCase('tr-TR'))
    return toast('Grubun adını tam yazman gerekiyor',true);

  const btn=$('#gsBtn'); btn.disabled=true; btn.innerHTML='<span class="yukleniyor"></span>';
  const {error}=await sb.from('masalar').delete().eq('id',id);
  if(error){ btn.disabled=false; btn.textContent='Kalıcı Olarak Sil'; return toast(hataMetni(error),true); }

  if(DB.aktifGrup===id){ DB.aktifGrup=null; localStorage.removeItem('kkd_aktif_masa'); SECILI_MAC=null; }
  await verileriGetir();
  DURUM=DB.gruplar.length?'hazir':'masayok';
  if(typeof kanalKur==='function') kanalKur();
  kapatModal(); render();
  toast(`${g.ad} grubu silindi.`,true);
}
