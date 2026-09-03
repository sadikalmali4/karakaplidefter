function viewAyar(){
  const a=DB.ayar, k=kurucuMu(), g=aktifGrup()||{};
  const kilit=k?'':'disabled';
  const masaOyn=DB.oyuncular.filter(o=>o.masaId===DB.aktifGrup);
  const aktifOyn=masaOyn.filter(o=>o.aktif), pasifOyn=masaOyn.filter(o=>!o.aktif);
  const hesapAdi=pid=>MASA_UYELERI.find(u=>u.profil_id===pid)?.profiller?.ad||'bir hesap';
  const bagsizHesaplar=MASA_UYELERI.filter(u=>!masaOyn.some(o=>o.profilId===u.profil_id));

  return `
  <div class="card">
    <div class="row">
      <div style="font-size:26px">${g.emoji||'🍀'}</div>
      <div class="grow"><div class="serif" style="font-size:18px">${esc(g.ad||'')}</div>
        <div class="xs dim">${aktifOyn.length} oyuncu · ${MASA_UYELERI.length} hesap · kod <b style="color:var(--gold)">${esc(g.kod||'')}</b></div></div>
      <button class="btn-xs btn-gh" onclick="grupAc('${DB.aktifGrup}')">Düzenle</button>
    </div>
    <div class="two" style="margin-top:10px">
      <button class="btn-b btn-sm" onclick="davetHepsi()">✉️ Davet Linkleri</button>
      <button class="btn-sm btn-gh" onclick="kodPaylas(grup('${DB.aktifGrup}'))">📋 Grup Kodu</button>
    </div>
    <div class="xs dim" style="margin-top:8px">
      <b>Davet linki</b> kişiye özel ve tek kullanımlık: açan kişi sadece şifresini belirler,
      onay beklemeden kendi oyuncu kaydına bağlanır.<br>
      <b>Grup kodu</b> ise açık davet — kodu girenin isteği ${k?'sana':'grubu kurana'} düşer, onaydan geçer.</div>
  </div>

  ${BEKLEYENLER.length?`<div class="card" style="border-color:var(--gold)">
    <h3 style="color:var(--gold)">Onay Bekleyenler (${BEKLEYENLER.length})</h3>
    <div class="stack">${BEKLEYENLER.map(b=>`
      <div class="row" style="gap:9px">
        <div class="avatar" style="background:${esc(b.profiller?.renk||'#5a524c')};width:30px;height:30px;font-size:13px">${esc(bas(b.profiller?.ad))}</div>
        <div class="grow" style="font-weight:600;font-size:13.5px">${esc(b.profiller?.ad||'?')}</div>
        <button class="btn-xs" style="border-color:#2E5A3A;color:#8CC79B" onclick="uyeKarar('${b.profil_id}','onayli')">Al</button>
        <button class="btn-xs btn-dn" onclick="uyeKarar('${b.profil_id}','reddedildi')">Alma</button>
      </div>`).join('')}</div>
    <div class="xs dim" style="margin-top:9px">Onaylamadığın kişi grubun hiçbir verisini göremez.</div>
  </div>`:''}

  <div class="card">
    <h3>Oyuncular</h3>
    <div class="xs dim" style="margin-bottom:10px">Oyuncu olmak için hesap şart değil — masaya oturan herkesi ekle.
      Sicili, fotoğrafı, unvanı hesapsız da tutulur.</div>
    ${aktifOyn.length?aktifOyn.map(o=>{const sv=seviye(toplamMac(o.id));
      const benimMi=o.profilId===OTURUM.id;
      const duzenleyebilir=k||benimMi;
      return `<div class="row" style="padding:7px 0;gap:10px">${avatar(o.id,34)}
        <div class="grow" style="min-width:0">
          <div style="font-weight:600" class="ell">${esc(o.ad)}${benimMi?' <span class="pill gold">sen</span>':''}</div>
          <div class="xs dim">${sv.k} ${sv.ad} · ${toplamMac(o.id)} maç${o.profilId?` · 🔗 ${esc(hesapAdi(o.profilId))}`:' · hesapsız'}</div></div>
        ${!o.profilId?`<button class="btn-xs btn-b" onclick="davetPaylas('${o.id}')">Davet</button>`:''}
        ${duzenleyebilir?`<button class="btn-xs btn-gh" onclick="oyuncuAc('${o.id}')">Düzenle</button>`:''}
        ${k?`<button class="btn-xs btn-dn" onclick="oyuncuPasif('${o.id}')">Kaldır</button>`:''}
      </div>`;}).join('')
      :'<div class="sm dim">Henüz oyuncu yok.</div>'}
    ${k?`<button class="btn-p btn-full" style="margin-top:12px" onclick="oyuncuAc(null)">+ Yeni Oyuncu</button>`
      :`<div class="xs dim" style="margin-top:10px">Kadroya oyuncu eklemek grubu kurana aittir.</div>`}
    ${k?`<button class="btn-b btn-full btn-sm" style="margin-top:8px" onclick="kadroSor()">⚡ Hazır Kadroyu Kur</button>
      <div class="xs dim" style="margin-top:6px">Parkverde kadrosunu fotoğraflarıyla birlikte tek dokunuşla ekler; var olanlara dokunmaz.</div>`:''}
    ${pasifOyn.length?`<details style="margin-top:12px"><summary>Kaldırılanlar (${pasifOyn.length})</summary><div>
      ${pasifOyn.map(o=>`<div class="row" style="padding:6px 0;gap:9px">${avatar(o.id,26)}
        <div class="grow sm dim ell">${esc(o.ad)}</div>
        ${k?`<button class="btn-xs btn-gh" onclick="oyuncuPasif('${o.id}',true)">Geri al</button>`:''}</div>`).join('')}
      <div class="xs dim" style="margin-top:7px">Eski maçlarda adları durur; sicil bozulmaz.</div>
    </div></details>`:''}
  </div>

  ${k&&(bagsizHesaplar.length||masaOyn.some(o=>o.profilId))?`<div class="card">
    <h3>Hesap ↔ Oyuncu Eşleşmesi</h3>
    <div class="xs dim" style="margin-bottom:10px">Kim hangi oyuncu? Yanlış eşleşmeyi buradan düzeltirsin.</div>
    ${MASA_UYELERI.map(u=>{
      const bagli=masaOyn.find(o=>o.profilId===u.profil_id);
      const bos=aktifOyn.filter(o=>!o.profilId);
      return `<div class="row" style="padding:7px 0;gap:9px">
        <div class="avatar" style="background:${esc(u.profiller?.renk||'#5a524c')};width:28px;height:28px;font-size:12px">${esc(bas(u.profiller?.ad))}</div>
        <div class="grow" style="min-width:0"><div class="sm ell" style="font-weight:600">${esc(u.profiller?.ad||'?')}${u.rol==='kurucu'?' <span class="xs dim">kurucu</span>':''}</div>
          <div class="xs dim">${bagli?'→ '+esc(bagli.ad):'oyuncuya bağlı değil'}</div></div>
        ${bagli?`<button class="btn-xs btn-gh" onclick="oyuncuCoz('${bagli.id}')">Çöz</button>`
               :(bos.length?`<select style="width:auto;padding:6px 8px;font-size:12px"
                  onchange="if(this.value)hesabaBagla(this.value,'${u.profil_id}')">
                  <option value="">bağla…</option>
                  ${bos.map(o=>`<option value="${o.id}">${esc(o.ad)}</option>`).join('')}</select>`:'')}
        ${u.profil_id!==OTURUM.id?`<button class="btn-xs btn-dn" onclick="uyeCikar('${u.profil_id}')">Çıkar</button>`:''}
      </div>`;}).join('')}
  </div>`:''}

  <div class="card">
    <h3>Batak Kuralları</h3>
    ${k?'':'<div class="uyari" style="margin-bottom:12px">Kuralları yalnız grubu kuran değiştirebilir. Sen görüyorsun, değiştiremiyorsun.</div>'}
    <div class="two">
      <div><label class="fl">Parti hedef puanı</label><input type="number" value="${a.batak.hedef}" ${kilit} onchange="ayarSet('batak','hedef',this.value,1)"></div>
      <div><label class="fl">En düşük ihale</label><input type="number" value="${a.batak.minIhale}" ${kilit} onchange="ayarSet('batak','minIhale',this.value,1)"></div>
    </div>
    <div class="field"><label class="fl">Varsayılan parti sayısı</label>
      <div class="seg">${[1,2,3].map(n=>`<button class="${a.batak.partiHedef===n?'on':''}" ${kilit} onclick="ayarSet('batak','partiHedef',${n},1).then(render)">${n===1?'Tek':n+' parti'}</button>`).join('')}</div></div>
    <div class="field"><label class="fl">İhale tutunca yazılan</label>
      <select ${kilit} onchange="ayarSet('batak','tutunca',this.value)">
        <option value="alinan" ${a.batak.tutunca==='alinan'?'selected':''}>Aldığı el sayısı</option>
        <option value="ihale" ${a.batak.tutunca==='ihale'?'selected':''}>Sadece ihale miktarı</option></select></div>
    <div class="field"><label class="fl">Şlem olunca (13'ün tamamı) karşı takım</label>
      <select ${kilit} onchange="ayarSet('batak','slem',this.value)">
        <option value="ihale" ${a.batak.slem!=='yok'?'selected':''}>İhale kadar batar (−ihale)</option>
        <option value="yok" ${a.batak.slem==='yok'?'selected':''}>Sıfır yazar</option></select></div>
    <div class="field"><label class="fl">İhale batınca karşı takım</label>
      <select ${kilit} onchange="ayarSet('batak','batinca',this.value)">
        <option value="alinan" ${a.batak.batinca==='alinan'?'selected':''}>Aldığı elleri yazar</option>
        <option value="onuc" ${a.batak.batinca==='onuc'?'selected':''}>${a.batak.toplamEl} yazar</option>
        <option value="ihale" ${a.batak.batinca==='ihale'?'selected':''}>İhale miktarı kadar yazar</option></select></div>
  </div>

  <div class="card">
    <h3>101 · Ceza ve Ödül</h3>
    <div class="uyari" style="margin-bottom:10px">101'de puanı <b>elle</b> yazıyorsun:
      her el için <b>Sayı</b>, varsa <b>+ Ceza</b> ve <b>− Ödül</b>.
      Uygulama kural yorumlamıyor — ev kuralınız değişirse burada bir şey değiştirmen gerekmez.
      <b>Ceza eklenir, ödül düşer.</b></div>
    <div class="two">
      <div><label class="fl">Partide el sayısı</label><input type="number" value="${a.yz.elSayisi}" ${kilit} onchange="ayarSet('yz','elSayisi',this.value,1)"></div>
      <div><label class="fl">Varsayılan parti sayısı</label>
        <div class="seg">${[1,2,3].map(n=>`<button class="${a.yz.partiHedef===n?'on':''}" ${kilit} onclick="ayarSet('yz','partiHedef',${n},1).then(render)">${n===1?'Tek':n}</button>`).join('')}</div></div>
    </div>
    <div class="xs dim" style="margin-top:10px">Aşağıdakiler yalnız <b>hızlı tabelada</b> ipucu olarak
      gösterilir ve eski kayıtların puanını hesaplarken kullanılır. Yeni ellerde puanı sen yazdığın için
      hiçbirine dokunmak zorunda değilsin.</div>
    <details style="margin-top:8px"><summary>Eski kayıtların hesabı (dokunmasan da olur)</summary><div>
      <div class="two">
        <div><label class="fl">El bitiren (ödül)</label><input type="number" value="${a.yz.bitiren}" ${kilit} onchange="ayarSet('yz','bitiren',this.value)"></div>
        <div><label class="fl">Açamayan (ceza)</label><input type="number" value="${a.yz.acamayan}" ${kilit} onchange="ayarSet('yz','acamayan',this.value)"></div>
      </div>
      <div class="two" style="margin-top:10px">
        <div><label class="fl">Çifte çarpanı</label><input type="number" value="${a.yz.cifteCarpan}" ${kilit} onchange="ayarSet('yz','cifteCarpan',this.value,1)"></div>
        <div><label class="fl">Silme (ödül)</label><input type="number" value="${a.yz.silme}" ${kilit} onchange="ayarSet('yz','silme',this.value)"></div>
      </div>
      <label style="display:flex;align-items:center;gap:9px;margin-top:12px;font-size:13.5px;cursor:pointer">
        <input type="checkbox" style="width:18px;height:18px" ${a.yz.okeyAktif?'checked':''} ${kilit}
          onchange="ayarSet('yz','okeyAktif',this.checked).then(render)">
        Okeyle bitirme çarpanı (×${a.yz.okeyCarpan})</label>
    </div></details>
    <div class="sep"></div>
    <h3>Son İki Sıranın Müeyyidesi</h3>
    <div class="field"><label class="fl">3. sıra</label><input value="${esc(a.yz.muey3)}" ${kilit} onchange="ayarSet('yz','muey3',this.value)" placeholder="Çay ısmarlar"></div>
    <div class="field"><label class="fl">4. sıra</label><input value="${esc(a.yz.muey4)}" ${kilit} onchange="ayarSet('yz','muey4',this.value)" placeholder="Hesabı öder"></div>
  </div>

  <div class="card">
    <h3>Masa Yönergesi</h3>
    <div class="xs dim" style="margin-bottom:10px">Yukarıdaki kurallardan üretilen resmî metin.
      Gruba bir kez yapıştır, bir daha "kural neydi" tartışması olmaz.</div>
    <button class="btn-g btn-full" onclick="yonergeAc()">📜 Yönergeyi Göster / Kopyala</button>
  </div>

  <div class="card">
    <h3>Gruplarım</h3>
    ${DB.gruplar.map(x=>`<div class="row" style="padding:7px 0;gap:10px">
      <div style="font-size:20px;width:26px;text-align:center">${x.emoji}</div>
      <div class="grow"><div style="font-weight:600">${esc(x.ad)}${x.id===DB.aktifGrup?' <span class="pill gold">aktif</span>':''}</div>
        <div class="xs dim">${x.uyeler.length} oyuncu · ${DB.celseler.filter(c=>c.grupId===x.id).length} maç${x.rol==='kurucu'?' · kurucu':''}</div></div>
      ${x.id===DB.aktifGrup?'':`<button class="btn-xs btn-gh" onclick="grupGec('${x.id}')">Geç</button>`}
    </div>`).join('')}
    <button class="btn-b btn-full" style="margin-top:12px" onclick="grupSecici()">Grup Değiştir / Katıl / Kur</button>
  </div>

  <div class="card">
    <h3>Defter</h3>
    <div class="sm muted" style="margin-bottom:10px">Bu grupta ${DB.celseler.filter(c=>c.grupId===DB.aktifGrup).length} kapanmış maç var.
      Kayıtlar bulutta; cihazını kaybetsen, uygulamayı silsen de durur.</div>
    <div class="uyari" style="margin-bottom:10px">Veritabanının otomatik geri dönüşü <b>yok</b>.
      Biri bir kaydı yanlışlıkla silerse tek dayanak indirdiğin yedek dosyası olur.
      Ayda bir "Yedek Al" demen yeterli — maçlar, iddialar, akış, borçlar ve tahminler dosyaya girer.</div>
    <div class="two">
      <button onclick="yedekAl()">⬇ Yedek Al</button>
      <button ${kilit} onclick="document.getElementById('yedekDosya').click()">⬆ Eski Defteri Aktar</button>
    </div>
    <input type="file" id="yedekDosya" accept="application/json" style="display:none" onchange="yedekYukle(this)">
    <div class="xs dim" style="margin-top:8px">Aktarma, tek dosya prototipin yedeğini bu masaya EKLER; mevcut kayıtları silmez.</div>
    <div class="sep"></div>
    <div class="row">
      <div class="grow"><div class="sm" style="font-weight:600">${esc(PROFIL?.ad||'')}</div>
        <div class="xs dim">@${esc(postaToKad(OTURUM.email))}</div></div>
      <button class="btn-xs btn-gh" onclick="hesapAc()">Hesabım</button>
      <button class="btn-xs btn-dn" onclick="cikisYap()">Çıkış</button>
    </div>
  </div>
  <div class="card tight center xs dim">Kara Kaplı Defter · sürüm 7.9 · bulut</div>`;
}
