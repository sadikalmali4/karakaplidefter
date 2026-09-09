//== kartim
/* =========================================================
   KİŞİ KARTI — herkesin ana ekranındaki kendi kartı

   İstek (kullanıcı, 09.09.2026): "herkesin ilk ekranı kişi kartı olsa."
   Masa (ana) sekmesinin EN ÜSTÜNE gelir: avatar (dokun → fotoğrafını
   değiştir), lakap/seviye, sezon maç/galibiyet/oran, ve KENDİ net
   borcu/alacağı (kişi bazlı ½ modelden). Yeni sekme açılmadı.

   Fotoğraf değiştirme: mevcut oyuncuAc(DB.ben) akışı (foto seç → storage
   → oyuncular.update). RLS zaten "profil_id = auth.uid()" ile kişinin
   kendi satırını düzenlemesine izin veriyor; şema değişmedi.
   ========================================================= */

function kartimMacGal(id){
  let mac=0, gal=0;
  for(const c of grupCelseleri()){
    if(c.oyun==='batak'){
      const ti=c.takimlar.findIndex(t=>(t.oyuncular||[]).includes(id)); if(ti<0) continue;
      mac++; const kz=c.kazanan??batakMac(c).macKazanan; if(kz===ti) gal++;
    }else{
      const sr=yzMac(c).sira; if(!sr.length||!sr.some(x=>x.id===id)) continue;
      mac++; if(sr[0].id===id) gal++;
    }
  }
  return {mac,gal};
}
/* kişinin kendi net bahis bakiyeleri (½ modelinden) */
function kartimBorc(id){
  const t=(typeof borcTablosu==='function')?borcTablosu():{};
  const out=[];
  Object.entries(t).forEach(([k,v])=>{
    if(Math.abs(v)<1e-9) return;
    const i=k.indexOf('|'); if(k.slice(0,i)!==id) return;
    out.push({ne:k.slice(i+1), v});
  });
  return out.sort((a,b)=>a.v-b.v);
}

function kartimKart(){
  if(!DB.ben) return '';
  const id=DB.ben, mg=kartimMacGal(id), oran=mg.mac?Math.round(mg.gal/mg.mac*100):0;
  const lk=(typeof lakap==='function'?lakap(id):'')||'';
  const sv=(typeof seviye==='function'&&typeof toplamMac==='function')?(seviye(toplamMac(id)).ad||''):'';
  const bk=kartimBorc(id);
  return `<div class="card" style="border-color:var(--gold)">
    <div class="row" style="gap:12px;align-items:center">
      <div onclick="oyuncuAc('${id}')" style="cursor:pointer;position:relative;flex-shrink:0" title="fotoğrafını değiştir">
        ${avatar(id,56)}
        <div style="position:absolute;right:-3px;bottom:-3px;background:var(--panel);border:1px solid var(--line);
          border-radius:50%;width:22px;height:22px;line-height:20px;text-align:center;font-size:11px">📷</div>
      </div>
      <div class="grow" style="min-width:0">
        <div class="serif" style="font-size:18px" class="ell">${esc(ad(id))}</div>
        <div class="xs dim">${lk?esc(lk)+' · ':''}${esc(sv)}</div>
      </div>
    </div>
    <div class="row" style="gap:8px;margin-top:12px">
      <div class="grow center"><div class="serif" style="font-size:22px;line-height:1">${mg.mac}</div><div class="xs dim" style="margin-top:2px">maç</div></div>
      <div class="grow center"><div class="serif" style="font-size:22px;line-height:1">${mg.gal}</div><div class="xs dim" style="margin-top:2px">galibiyet</div></div>
      <div class="grow center"><div class="serif" style="font-size:22px;line-height:1;color:var(--gold)">%${oran}</div><div class="xs dim" style="margin-top:2px">oran</div></div>
    </div>
    ${bk.length?`<div class="row wrap" style="gap:6px;margin-top:12px">
      ${bk.map(r=>`<span class="pill ${r.v<0?'red':'green'}">${bahisIkon(r.ne)} ${esc(r.ne)} ${r.v<0?frak(r.v)+' borç':'+'+frak(r.v)+' alacak'}</span>`).join('')}
    </div>`:`<div class="xs dim center" style="margin-top:12px">Hesabın temiz — açık borcun yok.</div>`}
    <button class="btn-gh btn-full btn-sm" style="margin-top:11px" onclick="oyuncuAc('${id}')">📷 Fotoğrafı · adı · doğum günü düzenle</button>
  </div>`;
}
