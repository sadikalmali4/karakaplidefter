# -*- coding: utf-8 -*-
"""BATAK'A CEZA / ÖDÜL — 101'deki yapının aynısı.

101'de her el, her oyuncu için üç alan var: sayı, ceza (+), ödül (−).
Batak takım oyunu olduğu için karşılığı: her el, her TAKIM için iki alan.

DİKKAT — İŞARET 101'İN TERSİ. 101'de az sayı iyidir: ceza EKLENİR,
ödül DÜŞER. Batak'ta 61'e ilk çıkan kazanır, yani çok sayı iyidir:
ceza DÜŞER (−), ödül EKLENİR (+). Aynı sözcükler, ters yön.

Veri: el.ek = [[A_ceza, A_odul], [B_ceza, B_odul]]
Puan tek yerden hesaplanıyor (batakElPuan), böylece kâğıt tabelası,
ihaleli giriş, parti toplamı, zabıt ve sicil aynı sayıyı görüyor.
"""

NL = chr(10)
DEGISIKLIKLER = []


def _e(eski, yeni, ad):
    DEGISIKLIKLER.append((eski, yeni, ad))


# ------------------------------------------------ 1) PUAN: ceza/ödül eklenir
_e("""function batakElPuan(el,a){
  /* HAM SATIR: tabelaya kâğıttaki gibi iki sayı doğrudan yazılmış.
     İhale/koz dökümü yoktur; ne yazıldıysa o geçerlidir (eksi dahil). */
  if(el && Array.isArray(el.ham)) return [Number(el.ham[0])||0, Number(el.ham[1])||0];
  const t=[0,0], alan=el.ihaleTakim, karsi=1-alan;""",
   """/* el.ek = [[A ceza, A ödül],[B ceza, B ödül]]
   BATAK'ta hedef 61'e ÇIKMAK: ceza puanı DÜŞÜRÜR, ödül ARTIRIR.
   (101'de tersi: orada az sayı iyi olduğu için ceza ekler, ödül düşer.)
   Hem kâğıt satırında hem ihaleli elde geçerli; tek yerden hesaplanıyor. */
function batakEkPuan(el,i){
  const e=el&&el.ek;
  if(!Array.isArray(e)||!Array.isArray(e[i])) return 0;
  return (Number(e[i][1])||0) - (Number(e[i][0])||0);
}
function batakElPuan(el,a){
  /* HAM SATIR: tabelaya kâğıttaki gibi iki sayı doğrudan yazılmış.
     İhale/koz dökümü yoktur; ne yazıldıysa o geçerlidir (eksi dahil). */
  if(el && Array.isArray(el.ham))
    return [ (Number(el.ham[0])||0) + batakEkPuan(el,0),
             (Number(el.ham[1])||0) + batakEkPuan(el,1) ];
  const t=[0,0], alan=el.ihaleTakim, karsi=1-alan;""",
   'batakElPuan: ek puan')

_e("""  else                                 t[karsi]=a.toplamEl-el.alinan;
  return t;
}""",
   """  else                                 t[karsi]=a.toplamEl-el.alinan;
  t[0]+=batakEkPuan(el,0); t[1]+=batakEkPuan(el,1);
  return t;
}""",
   'batakElPuan: ihaleli ele de ek')


# --------------------------------- 2) İHALELİ GİRİŞ FORMUNA ceza/ödül alanı
_e("""      <div class="xs dim" style="margin-top:6px">Karşı takım kalanı yazar (toplam ${a.toplamEl} el).</div></div>
    <button class="btn-p btn-full" style="margin-top:14px" onclick="batakElEkle()">Eli Yaz</button>""",
   """      <div class="xs dim" style="margin-top:6px">Karşı takım kalanı yazar (toplam ${a.toplamEl} el).</div></div>

    <details style="margin-top:10px"><summary>⚖️ Bu ele ceza / ödül ekle</summary><div>
      ${[0,1].map(i=>`<div class="row" style="gap:7px;align-items:center;margin-top:7px">
        <span class="pill ${i?'blue':'green'}" style="flex-shrink:0">${c.takimlar[i].ad}</span>
        <input type="number" inputmode="numeric" id="bCeza${i}" placeholder="ceza −" style="flex:1">
        <input type="number" inputmode="numeric" id="bOdul${i}" placeholder="ödül +" style="flex:1">
      </div>`).join('')}
      <div class="xs dim" style="margin-top:7px">Batak'ta 61'e çıkılır: <b>ceza puanı düşürür</b>,
        <b>ödül artırır</b>. Boş bırakılırsa yazılmaz.</div>
    </div></details>

    <button class="btn-p btn-full" style="margin-top:14px" onclick="batakElEkle()">Eli Yaz</button>""",
   'ihaleli el formuna ceza/ödül')

_e("""  const el={ihaleTakim:Number(document.querySelector('#bTakim .on').dataset.v),
            ihale:Number($('#bIhale').value),koz:$('#bKoz').value,alinan:Number(al.dataset.v)};
  parti.eller.push(el); kaydet(); render(); toast(batakElYorum(c,el),true);""",
   """  const el={ihaleTakim:Number(document.querySelector('#bTakim .on').dataset.v),
            ihale:Number($('#bIhale').value),koz:$('#bKoz').value,alinan:Number(al.dataset.v)};
  const say=n=>{const v=$(n)?.value; return (v===''||v==null)?0:(parseInt(v,10)||0);};
  const ek=[[say('#bCeza0'),say('#bOdul0')],[say('#bCeza1'),say('#bOdul1')]];
  if(ek.some(p=>p[0]||p[1])) el.ek=ek;
  parti.eller.push(el); kaydet(); render(); toast(batakElYorum(c,el),true);""",
   'batakElEkle: ceza/ödül oku')


def uygula(s):
    for eski, yeni, ad in DEGISIKLIKLER:
        if eski not in s:
            raise SystemExit('YAMA BATAK-EK BULUNAMADI: ' + ad)
        s = s.replace(eski, yeni, 1)
    return s
