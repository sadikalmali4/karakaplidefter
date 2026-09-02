/* =========================================================
   MASA YÖNERGESİ
   Kuralları AYARLARDAN üretir — yani kâğıttaki metin ile kodun
   hesabı asla ayrışamaz. Ayarı değiştirirsen yönerge de değişir.
   ========================================================= */
function yonergeUret(){
  const a=DB.ayar, g=aktifGrup()||{ad:'Masa',emoji:'🍀'};
  const L=[];
  const M=(no,bas)=>{L.push('');L.push(`MADDE ${no} — ${bas}`);};
  const f=t=>L.push(t);

  L.push(`${g.emoji||''} ${String(g.ad||'').toLocaleUpperCase('tr-TR')} MASA YÖNERGESİ`);
  L.push(`Yürürlük tarihi: ${trh(bugun())}`);
  L.push('');
  L.push('Bu yönerge, masada uygulanan usul ve esasları tespit eder.');
  L.push('Uygulamadaki hesap bu metne göre yapılır; ayar değişirse metin de değişir.');

  M(1,'KAPSAM VE TARAFLAR');
  f(`1.1- Yönerge, ${esc(g.ad)} masasında oynanan BATAK ve 101 oyunlarını kapsar.`);
  f(`1.2- Masada kayıtlı oyuncu sayısı ${(g.uyeler||[]).length}'dir. Kayıtlı olmayanın sicili tutulmaz.`);
  f('1.3- Tabelayı, maç açılışında belirlenen tabelacı tutar. Puanı yalnız o yazar; diğerleri canlı izler.');
  f('1.4- Kapanan maça tabelacı dahi dokunamaz. Düzeltme yetkisi masayı kurana aittir.');

  M(2,'BATAK — EŞLİ VE İHALELİ USUL');
  f(`2.1- Oyun eşli oynanır. Dört oyuncu, oturma sırasına göre iki takıma ayrılır.`);
  f(`2.2- Bir parti, taraflardan biri ${a.batak.hedef} puana ULAŞINCAYA KADAR sürer. El sayısı sınırı YOKTUR.`);
  f(`2.3- Bir elde toplam ${a.batak.toplamEl} el vardır. İhale en az ${a.batak.minIhale}, en çok ${a.batak.toplamEl} olabilir.`);
  f(`2.4- İhale TUTARSA ihaleyi alan taraf ${a.batak.tutunca==='ihale'?'ihale miktarı kadar':'ÇIKARDIĞI EL SAYISI kadar'} yazar.`);
  f(`2.5- İhale BATARSA ihaleyi alan taraf İHALE MİKTARI KADAR EKSİ yazar. Örnek: 7'ye girip 7 çıkaramayan taraf −7 yazar.`);
  f(`2.6- Karşı taraf, ${a.batak.batinca==='onuc'?`ihale battığında ${a.batak.toplamEl} yazar`
        :(a.batak.batinca==='ihale'?'ihale battığında ihale miktarı kadar yazar':'her hâlde çıkardığı el sayısını yazar')}.`);
  f(`2.7- ŞLEM: ihaleyi alan taraf ${a.batak.toplamEl} elin tamamını alırsa, karşı taraf ${
        a.batak.slem==='yok'?'sıfır yazar':'İHALE MİKTARI KADAR EKSİ yazar (batar)'}.`);
  f(`2.8- Maç ${a.batak.partiHedef} parti üzerinden oynanır. Parti skoru eşitlenip son partiye kalırsa o parti ÇIKIŞTIRMA adını alır.`);

  M(3,'101 — HERKES TEK, CEZA PUANLI USUL');
  f(`3.1- Bir parti ${a.yz.elSayisi} eldir. ${a.yz.elSayisi}. elin sonunda parti kapanır.`);
  f('3.2- Puan CEZA niteliğindedir: toplamı EN YÜKSEK olan kaybeder, en düşük olan kazanır.');
  f(`3.3- Eli bitiren oyuncu ${a.yz.bitiren} yazar.`);
  f('3.4- Eşli oynanıyorsa, bitirenin eşi sıfır yazar.');
  f(`3.5- Açamayan oyuncuya ${a.yz.acamayan} ceza puanı yazılır.`);
  f('3.6- Açmış olup bitiremeyen, elinde kalan taşların sayısı kadar yazar.');
  f(`3.7- Çifte gidip bitiremeyen, elinde kalan sayının ${a.yz.cifteCarpan} KATINI yazar.`);
  f(`3.8- SİLME (ödül): silme yapan oyuncunun hanesinden ${Math.abs(Number(a.yz.silme)||0)} puan DÜŞÜLÜR.`);
  f('3.9- EK CEZA: tabelacı, normal puanın dışında elle ek ceza yazabilir. Gerekçesi tabelacıya aittir.');
  f('3.10- Silme ve ek ceza her el, her oyuncu için ayrı ayrı tutulur; tabelada ayrı satırda gösterilir.');
  if(a.yz.okeyAktif) f(`3.11- Okeyle bitiren, bitirme puanının ${a.yz.okeyCarpan} katını yazar.`);
  f(`${a.yz.okeyAktif?'3.12':'3.11'}- Maç ${a.yz.partiHedef} parti üzerinden oynanır.`);

  M(4,'MÜEYYİDELER');
  f('4.1- Bir maçta sonuncu olan oyuncu MASANIN SPONSORU sıfatını kazanır.');
  if(a.yz.muey3) f(`4.2- 101 sıralamasında sondan ikinci olan: "${a.yz.muey3}".`);
  if(a.yz.muey4) f(`4.3- 101 sıralamasında sonuncu olan: "${a.yz.muey4}".`);
  f('4.4- Müeyyidenin infazı derhal yapılır; taksitlendirme talebi dinlenmez.');

  M(5,'UNVANLAR');
  f('5.1- Unvanlar her maç kapanışında kendiliğinden yeniden hesaplanır; el değiştirdiğinde akışa işlenir.');
  f('5.2- Batak\'ta ihale ve puan TAKIMA ait olduğundan, eşler başa başsa unvanı ORTAK taşır.');
  f('5.3- Farklı eşlerle oynanıp sayılar ayrıştıkça unvan tek kişiye döner.');
  f('5.4- Kıdem, oynanan maç sayısına göre kendiliğinden yükselir: '+SEVIYELER.map(s=>`${s.ad} (${s.n})`).join(' → ')+'.');

  M(6,'İDDİA DEFTERİ');
  f('6.1- Masada edilen laf, iddia defterine geçirilebilir. Geçirildikten sonra unutulmuş sayılmaz.');
  f('6.2- İddiaya vade konabilir. Vadesi geldiğinde uygulama hükmü sorar.');
  f('6.3- Bahis kaydedilir; borcun ifası taraflar arasındadır, masa icra makamı değildir.');

  M(7,'ZABIT VE SİCİL');
  f('7.1- Her maç kapanışında zabıt üretilir ve masa akışına işlenir.');
  f('7.2- Zabıt, itiraz kabul etmez. Tashih talebi masayı kurana yapılır.');
  f('7.3- Uygulamadan önce oynanmış maçlar da deftere geçirilebilir; sicil hepsini birlikte hesaplar.');
  f('7.4- Oyuncu kaydı silinmez, kaldırılır. Kaldırılan oyuncunun geçmiş maçlardaki adı durur.');

  M(8,'YÜRÜRLÜK');
  f('8.1- Kuralları yalnız masayı kuran değiştirebilir. Değişiklik, yapıldığı andan sonraki maçlara uygulanır.');
  f('8.2- Bu yönergede hüküm bulunmayan hâllerde masanın teamülü uygulanır.');
  f('8.3- Teamülün ne olduğu konusunda ihtilaf çıkarsa, en çok kaybedenin görüşü dikkate alınmaz.');
  L.push('');
  L.push('Okundu, anlaşıldı, imza altına alınmış sayılır.');
  return L.join('\n');
}

function yonergeAc(){
  const metin=yonergeUret();
  acModal(`
    <h2 class="serif" style="margin:0 0 4px">Masa Yönergesi</h2>
    <div class="xs dim" style="margin-bottom:12px">Ayarlardaki kurallardan üretildi — kâğıttaki metinle
      uygulamanın hesabı ayrışamaz. Kuralı değiştirirsen yönerge de değişir.</div>
    <div class="zabit" id="ynMetin" style="font-size:13px;line-height:1.65">${esc(metin)}</div>
    <button class="btn-g btn-full" style="margin-top:12px"
      onclick="kopyala(document.getElementById('ynMetin').textContent)">📋 Kopyala · WhatsApp'a Yapıştır</button>
    <button class="btn-gh btn-full btn-sm" style="margin-top:8px" onclick="kapatModal()">Kapat</button>`);
}
