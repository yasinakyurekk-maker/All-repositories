// Kurum Deneme Takvimi — tek sayfalık uygulama (Supabase)
const AY=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const AYTAM=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUN=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const GUNK=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const DURUM={bekliyor:"Onay bekliyor",onaylandi:"Onaylandı",iptal:"İptal"};
const UYARI_GUN=7;
const $=id=>document.getElementById(id);

// ---------- yardımcılar ----------
function todayStr(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function daysUntil(s){const [y,m,d]=s.split("-").map(Number);const [ty,tm,td]=todayStr().split("-").map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(ty,tm-1,td))/864e5)}
function parts(s){const [y,m,d]=s.split("-").map(Number);const dt=new Date(y,m-1,d);return {d,m,y,ay:AY[m-1],gun:GUN[dt.getDay()],gk:GUNK[dt.getDay()]}}
function kalan(n){if(n===0)return "Bugün";if(n===1)return "Yarın";if(n<0)return "Yapıldı";return n+" gün kaldı"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function egitimYili(s){const p=parts(s);return p.m>=9?p.y:p.y-1}   // 1 Eylül – 31 Ağustos
function yilAd(y){return y+"–"+(y+1)}
function tarihYaz(s){const p=parts(s);return p.d+" "+AYTAM[p.m-1]+" "+p.y+" "+p.gun}
function flash(el,text,err){el.className="msg"+(err?" err":"");el.textContent=text;clearTimeout(el._t);el._t=setTimeout(()=>{el.textContent=""},6000)}
function hataMetni(e){
  const m=(e&&e.message)||"";
  if(/Invalid login/i.test(m))return "E-posta ya da şifre hatalı.";
  if(/already registered/i.test(m))return "Bu e-posta zaten kayıtlı. \"Giriş yap\" sekmesini kullanın.";
  if(/Email not confirmed/i.test(m))return "E-postanıza gelen onay bağlantısına tıklayın, sonra giriş yapın.";
  if(/duplicate key.*email/i.test(m))return "Bu e-posta başka bir kuruma tanımlı.";
  if(/row-level security|permission/i.test(m))return "Bu işlem için yetkiniz yok (onaylanmış siparişi yalnızca yönetici değiştirebilir).";
  return "Bir sorun oldu: "+m;
}

// ---------- durum ----------
const S={rol:null,email:"",kurumId:null,kurumlar:[],denemeler:[],secili:"",yil:egitimYili(todayStr()),editId:null,editKurum:null,confirm:null,kanal:null};
const buYil=egitimYili(todayStr());

// ---------- Supabase ----------
const A=window.AYAR||{};
if(!A.SUPABASE_URL||/PROJE-KODUNUZ/.test(A.SUPABASE_URL)){ $("v-ayar").hidden=false; throw new Error("config.js eksik"); }
const sb=supabase.createClient(A.SUPABASE_URL,A.SUPABASE_ANON_KEY);

function goster(v){for(const id of ["v-login","v-app","v-yok","v-ayar"])$(id).hidden=(id!==v)}

// ---------- giriş ----------
let loginMod="giris"; // giris | kayit | yeni
function setMod(m){loginMod=m;
  $("t-giris").setAttribute("aria-selected",m==="giris");$("t-kayit").setAttribute("aria-selected",m==="kayit");
  $("kayit-hint").hidden=m!=="kayit";$("l-email").closest(".field").hidden=m==="yeni";$("l-email").required=m!=="yeni";
  $("l-unuttum").hidden=m!=="giris";
  $("l-btn").textContent=m==="giris"?"Giriş yap":m==="kayit"?"Şifremi oluştur":"Yeni şifreyi kaydet";
  $("l-sifre").autocomplete=m==="giris"?"current-password":"new-password";$("l-msg").textContent="";}
$("t-giris").onclick=()=>setMod("giris");
$("t-kayit").onclick=()=>setMod("kayit");
$("f-login").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("l-email").value.trim().toLowerCase(),password=$("l-sifre").value;const msg=$("l-msg");
  $("l-btn").disabled=true;
  try{
    if(loginMod==="giris"){const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}
    else if(loginMod==="kayit"){const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
      if(!data.session)flash(msg,"E-postanıza bir onay bağlantısı gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.")}
    else{const {error}=await sb.auth.updateUser({password});if(error)throw error;flash(msg,"Şifreniz değişti.");setMod("giris");await basla()}
  }catch(err){flash(msg,hataMetni(err),true)}
  $("l-btn").disabled=false;
});
$("l-unuttum").onclick=async()=>{const email=$("l-email").value.trim().toLowerCase();const msg=$("l-msg");
  if(!email){flash(msg,"Önce e-postanızı yazın.",true);return}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  flash(msg,error?hataMetni(error):"Şifre yenileme bağlantısı e-postanıza gönderildi.",!!error)};
async function cikis(){if(S.kanal)sb.removeChannel(S.kanal);S.kanal=null;await sb.auth.signOut();goster("v-login");setMod("giris")}
$("cikis").onclick=cikis;$("cikis2").onclick=cikis;

sb.auth.onAuthStateChange((ev,session)=>{
  if(ev==="PASSWORD_RECOVERY"){goster("v-login");setMod("yeni");return}
  if(ev==="SIGNED_IN"&&loginMod!=="yeni")basla();
});

// ---------- açılış ----------
async function basla(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){goster("v-login");return}
  if(S.rol&&S.email===session.user.email)return;
  S.email=(session.user.email||"").toLowerCase();
  const [{data:adm},{data:kid}]=await Promise.all([sb.rpc("is_admin"),sb.rpc("benim_kurum")]);
  if(adm){S.rol="admin"}else if(kid){S.rol="kurum";S.kurumId=kid}
  else{S.rol=null;goster("v-yok");$("yok-msg").textContent=S.email+" adresi henüz bir kuruma tanımlanmamış. Yöneticinize bu e-postayı iletin.";return}
  goster("v-app");kur();await yukle();canli();
}
function kur(){
  const admin=S.rol==="admin";
  $("who").textContent=(admin?"Yönetici · ":"")+S.email;
  $("p-siparis").hidden=!admin;$("p-kurumlar").hidden=!admin;$("ksec-wrap").hidden=!admin;$("fk-wrap").hidden=!admin;
  $("fkurum").required=admin;
  $("form-h").textContent=admin?"Deneme ekle":"Deneme siparişi ver";
  $("kaydet").textContent=admin?"Kaydet":"Siparişi gönder";
  $("altbaslik").textContent=admin?"Kurumların deneme siparişleri. Denemeye 1 hafta kala uyarı çıkar.":"Deneme siparişlerinizi buradan verin ve takip edin.";
  const p=parts(todayStr());$("today").textContent=p.d+" "+AYTAM[p.m-1]+" "+p.y+", "+p.gun;
}
async function yukle(){
  const [k,d]=await Promise.all([sb.from("kurumlar").select("*").order("ad"),sb.from("denemeler").select("*").order("tarih")]);
  if(k.error||d.error){flash($("msg"),hataMetni(k.error||d.error),true);return}
  S.kurumlar=k.data;S.denemeler=d.data;
  if(S.rol==="kurum")S.secili=S.kurumId;
  render();
}
function canli(){
  if(S.kanal)return;
  S.kanal=sb.channel("denemeler").on("postgres_changes",{event:"*",schema:"public",table:"denemeler"},()=>yukle()).subscribe();
  setInterval(()=>{if(!document.hidden)yukle()},5*60*1000);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.rol)yukle()});

// ---------- çizim ----------
const kAd=id=>(S.kurumlar.find(k=>k.id===id)||{}).ad||"—";
function render(){
  const admin=S.rol==="admin";const t=parts(todayStr());
  const all=[...S.denemeler].sort((a,b)=>a.tarih.localeCompare(b.tarih));
  const aktif=all.filter(x=>x.durum!=="iptal");
  const hafta=aktif.filter(x=>{const n=daysUntil(x.tarih);return n>=0&&n<=UYARI_GUN});
  const bekleyen=all.filter(x=>x.durum==="bekliyor"&&daysUntil(x.tarih)>=0);
  if(!admin){const k=S.kurumlar.find(k=>k.id===S.kurumId);$("baslik").textContent=k?k.ad:"Kurum"}
  // özet
  const buAy=aktif.filter(x=>{const p=parts(x.tarih);return p.y===t.y&&p.m===t.m}).length;
  const kalanYil=aktif.filter(x=>egitimYili(x.tarih)===buYil&&daysUntil(x.tarih)>=0).length;
  $("sum").innerHTML=`<div><b>${hafta.length}</b><span>bu hafta</span></div><div><b>${buAy}</b><span>${AYTAM[t.m-1]} ayında</span></div><div><b>${kalanYil}</b><span>bu yıl kalan</span></div>`+
    (admin?`<div><b>${bekleyen.length}</b><span>onay bekliyor</span></div>`:`<div><b>${bekleyen.length}</b><span>onay bekliyor</span></div>`);
  // onay bekleyenler (yönetici)
  if(admin){$("siparis-n").textContent=bekleyen.length||"";$("p-siparis").hidden=!bekleyen.length;
    $("orders").innerHTML=bekleyen.map(x=>`<div class="order"><div><strong>${esc(kAd(x.kurum_id))} · ${esc(x.ad||"Deneme")}</strong>
      <span>${tarihYaz(x.tarih)} · ${kalan(daysUntil(x.tarih))}${x.sinif?" · "+esc(x.sinif):""}${x.ogrenci?" · "+x.ogrenci+" öğrenci":""}${x.notlar?" · "+esc(x.notlar):""}</span></div>
      <div class="row" style="gap:6px"><button class="ok" data-onay="${x.id}">Onayla</button><button class="danger" data-iptal="${x.id}">İptal</button></div></div>`).join("")}
  // uyarılar
  $("alerts").innerHTML=!hafta.length?'<div class="quiet">Önümüzdeki 1 hafta içinde deneme yok.</div>':hafta.map(x=>{const n=daysUntil(x.tarih);const p=parts(x.tarih);
    return `<div class="alert ${n<=1?"crit":""}"><div class="days"><div><b>${n}</b><small>${n===0?"BUGÜN":"GÜN"}</small></div></div>
    <div class="txt"><strong>${admin?esc(kAd(x.kurum_id)):esc(x.ad||"Deneme")}</strong><span>${admin&&x.ad?esc(x.ad)+" · ":""}${p.d} ${p.ay} ${p.gun} · ${kalan(n)}${x.sinif?" · "+esc(x.sinif):""}${x.ogrenci?" · "+x.ogrenci+" öğrenci":""}</span></div></div>`}).join("");
  // seçiciler
  const ys=new Set([buYil,...all.map(x=>egitimYili(x.tarih))]);
  $("yil").innerHTML=[...ys].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===S.yil?"selected":""}>${yilAd(y)}</option>`).join("");
  const yearAll=all.filter(x=>egitimYili(x.tarih)===S.yil);
  if(admin){
    if(S.secili&&!S.kurumlar.some(k=>k.id===S.secili))S.secili="";
    $("ksec").innerHTML=`<option value="">Tüm kurumlar (${yearAll.length})</option>`+S.kurumlar.map(k=>`<option value="${k.id}" ${k.id===S.secili?"selected":""}>${esc(k.ad)} (${yearAll.filter(x=>x.kurum_id===k.id).length})</option>`).join("");
    const cur=$("fkurum").value;
    $("fkurum").innerHTML=`<option value="">Kurum seçin…</option>`+S.kurumlar.map(k=>`<option value="${k.id}">${esc(k.ad)}</option>`).join("");
    $("fkurum").value=S.editKurum||cur||S.secili||"";
    renderKurumlar();
  }
  // takvim
  const rows=yearAll.filter(x=>!S.secili||x.kurum_id===S.secili);
  const sayilan=rows.filter(x=>x.durum!=="iptal");
  const yapildi=sayilan.filter(x=>daysUntil(x.tarih)<0).length;
  const next=sayilan.find(x=>daysUntil(x.tarih)>=0);
  $("kurum-yil").textContent=yilAd(S.yil)+" eğitim yılı";
  $("kurum-h").textContent=admin?(S.secili?kAd(S.secili):"Tüm kurumlar"):"Denemeleriniz";
  $("stats").innerHTML=`<div class="stat"><b>${sayilan.length}</b><span>toplam</span></div><div class="stat"><b>${yapildi}</b><span>yapıldı</span></div>
    <div class="stat"><b>${sayilan.length-yapildi}</b><span>kaldı</span></div>${next?`<div class="stat"><b>${daysUntil(next.tarih)}</b><span>gün sonra</span></div>`:""}`;
  const ms=[9,10,11,12,1,2,3,4,5,6,7,8];
  $("strip").innerHTML=ms.map(m=>{const y=m>=9?S.yil:S.yil+1;const c=sayilan.filter(x=>{const p=parts(x.tarih);return p.m===m&&p.y===y}).length;
    const now=t.m===m&&t.y===y;const gone=(y*12+m)<(t.y*12+t.m);
    return `<button class="mcell ${c?"has":""} ${now?"now":""} ${gone?"gone":""}" data-m="${y}-${m}" ${c?"":"disabled"} title="${AYTAM[m-1]} ${y}: ${c} deneme"><span>${AY[m-1]}</span><b>${c||"·"}</b></button>`}).join("");
  if(!rows.length){$("list").innerHTML=`<div class="empty">${yilAd(S.yil)} eğitim yılında deneme yok.${admin?"":" Sağdaki formdan ilk siparişinizi verebilirsiniz."}</div>`}
  else{let last=null;$("list").innerHTML=rows.map(x=>{const n=daysUntil(x.tarih);const p=parts(x.tarih);
    const cls=x.durum==="iptal"?"iptal":n<0?"past":n===0?"today":n<=UYARI_GUN?"soon":"";
    const key=p.y+"-"+p.m;const head=key!==last?`<div class="month" id="m-${key}">${AYTAM[p.m-1]} ${p.y}</div>`:"";last=key;
    const degisir=admin||x.durum==="bekliyor";
    return head+`<div class="item ${cls}">
      <div class="tile"><i>${p.ay.toLocaleUpperCase("tr")}</i><b>${p.d}</b><span>${p.gk}</span></div>
      <div class="info">${admin&&!S.secili?`<div class="kname">${esc(kAd(x.kurum_id))}</div>`:""}<strong>${esc(x.ad||"Deneme")}</strong>
        <div class="meta">${[x.sinif,x.ogrenci?x.ogrenci+" öğrenci":"",x.notlar].filter(Boolean).map(esc).join(" · ")||"&nbsp;"}</div></div>
      <div class="right"><div class="row" style="gap:4px;justify-content:flex-end"><span class="pill ${x.durum}">${DURUM[x.durum]}</span>${x.durum!=="iptal"?`<span class="pill ${cls}">${kalan(n)}</span>`:""}</div>
        ${degisir?`<div class="row" style="gap:0"><button class="ghost" data-edit="${x.id}">Düzenle</button><button class="ghost danger" data-del="${x.id}">Sil</button></div>`:""}</div>
      ${S.confirm===x.id?`<div class="confirm">Bu deneme silinsin mi? <button class="danger" data-delok="${x.id}">Evet, sil</button><button data-delno="1">Vazgeç</button></div>`:""}
    </div>`}).join("")}
  $("store").textContent=admin?"Kurumların verdiği siparişler buraya anında düşer.":"Siparişiniz yönetici onaylayana kadar düzenlenebilir.";
}
function renderKurumlar(){
  $("ktable").innerHTML=S.kurumlar.length?S.kurumlar.map(k=>`<div class="krow"><div><strong>${esc(k.ad)}</strong><span>${esc(k.email)}${k.telefon?" · "+esc(k.telefon):""}</span></div>
    <div class="row" style="gap:0"><button class="ghost" data-kedit="${k.id}">Düzenle</button><button class="ghost danger" data-kdel="${k.id}">Sil</button></div>
    ${S.confirm==="k"+k.id?`<div class="confirm">${esc(k.ad)} ve tüm denemeleri silinsin mi? <button class="danger" data-kdelok="${k.id}">Evet, sil</button><button data-delno="1">Vazgeç</button></div>`:""}</div>`).join("")
    :'<div class="empty">Henüz kurum yok. Yukarıdan ilk kurumu ekleyin.</div>';
}

// ---------- deneme formu ----------
function formSifirla(){$("f").reset();S.editId=null;S.editKurum=null;$("iptal").hidden=true;
  $("form-h").textContent=S.rol==="admin"?"Deneme ekle":"Deneme siparişi ver";$("kaydet").textContent=S.rol==="admin"?"Kaydet":"Siparişi gönder";
  if(S.rol==="admin")$("fkurum").value=S.secili||""}
$("f").addEventListener("submit",async e=>{
  e.preventDefault();const admin=S.rol==="admin";
  const body={tarih:$("tarih").value,ad:$("ad").value.trim()||null,sinif:$("sinif").value.trim()||null,
    ogrenci:$("ogrenci").value?Number($("ogrenci").value):null,notlar:$("notlar").value.trim()||null,
    kurum_id:admin?$("fkurum").value:S.kurumId};
  if(!body.tarih||!body.kurum_id)return;
  if(!S.editId&&admin)body.durum="onaylandi"; // yöneticinin girdiği deneme doğrudan onaylı
  $("kaydet").disabled=true;
  const q=S.editId?sb.from("denemeler").update(body).eq("id",S.editId):sb.from("denemeler").insert(body);
  const {error}=await q;$("kaydet").disabled=false;
  if(error){flash($("msg"),hataMetni(error),true);return}
  flash($("msg"),(S.editId?"Güncellendi: ":admin?"Kaydedildi: ":"Sipariş gönderildi: ")+tarihYaz(body.tarih)+" ("+yilAd(egitimYili(body.tarih))+" eğitim yılı)");
  S.yil=egitimYili(body.tarih);if(admin)S.secili=body.kurum_id;formSifirla();yukle();
});
$("iptal").onclick=formSifirla;
$("ksec").onchange=e=>{S.secili=e.target.value;S.confirm=null;render()};
$("yil").onchange=e=>{S.yil=Number(e.target.value);render()};

// ---------- kurum formu ----------
let kEdit=null;
function kSifirla(){$("f-kurum").reset();kEdit=null;$("k-btn").textContent="Kurum ekle";$("k-iptal").hidden=true}
$("k-iptal").onclick=kSifirla;
$("f-kurum").addEventListener("submit",async e=>{
  e.preventDefault();
  const body={ad:$("k-ad").value.trim(),email:$("k-email").value.trim().toLowerCase(),telefon:$("k-tel").value.trim()||null};
  const {error}=kEdit?await sb.from("kurumlar").update(body).eq("id",kEdit):await sb.from("kurumlar").insert(body);
  if(error){flash($("k-msg"),hataMetni(error),true);return}
  flash($("k-msg"),(kEdit?"Güncellendi: ":"Eklendi: ")+body.ad+". Kurum "+body.email+" ile \"İlk kez giriş\" yapabilir.");kSifirla();yukle();
});

// ---------- tıklamalar ----------
document.addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.m){const el=document.getElementById("m-"+d.m);if(el)el.scrollIntoView({block:"start"})}
  else if(d.onay||d.iptal){const {error}=await sb.from("denemeler").update({durum:d.onay?"onaylandi":"iptal"}).eq("id",d.onay||d.iptal);if(error)flash($("msg"),hataMetni(error),true);yukle()}
  else if(d.edit){const x=S.denemeler.find(y=>y.id===d.edit);if(!x)return;S.editId=x.id;S.editKurum=x.kurum_id;
    $("tarih").value=x.tarih;$("ad").value=x.ad||"";$("sinif").value=x.sinif||"";$("ogrenci").value=x.ogrenci??"";$("notlar").value=x.notlar||"";
    if(S.rol==="admin")$("fkurum").value=x.kurum_id;
    $("form-h").textContent="Denemeyi düzenle";$("kaydet").textContent="Güncelle";$("iptal").hidden=false;$("f").scrollIntoView({block:"center"});$("tarih").focus()}
  else if(d.del){S.confirm=d.del;render()}
  else if(d.delno){S.confirm=null;render()}
  else if(d.delok){S.confirm=null;const {error}=await sb.from("denemeler").delete().eq("id",d.delok);if(error)flash($("msg"),hataMetni(error),true);yukle()}
  else if(d.kedit){const k=S.kurumlar.find(y=>y.id===d.kedit);if(!k)return;kEdit=k.id;$("k-ad").value=k.ad;$("k-email").value=k.email;$("k-tel").value=k.telefon||"";
    $("k-btn").textContent="Güncelle";$("k-iptal").hidden=false;$("p-kurumlar").open=true;$("k-ad").focus()}
  else if(d.kdel){S.confirm="k"+d.kdel;renderKurumlar()}
  else if(d.kdelok){S.confirm=null;const {error}=await sb.from("kurumlar").delete().eq("id",d.kdelok);if(error)flash($("k-msg"),hataMetni(error),true);yukle()}
});
setInterval(()=>{if(S.rol)render()},60*60*1000);

basla();
