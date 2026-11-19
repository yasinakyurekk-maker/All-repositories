// Bizden Yayıncılık B2B — deneme sipariş ve takvim uygulaması (Supabase)
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
const S={sekme:"takvim",takvim:[],tsinif:"",tgor:null,tay:null,secim:{},tEdit:null,urunler:[],siparisler:[],sepet:{},uEdit:null,gorunum:"liste",ay:null,rol:null,email:"",kurumId:null,kurumlar:[],denemeler:[],secili:"",yil:egitimYili(todayStr()),editId:null,editKurum:null,confirm:null,kanal:null};
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
async function cikis(){S.rol=null;S.tgor=null;S.sgor=null;S.sfDolu=null;S.email="";if(S.kanal)sb.removeChannel(S.kanal);S.kanal=null;await sb.auth.signOut();goster("v-login");setMod("giris")}
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
  $("yukle-hint").textContent=admin?"Sütunlar: Kurum, Tarih, Deneme, Sınıf, Öğrenci, Not. Kurum adı sistemdeki adla aynı olmalı. Yüklenen denemeler onaylı olarak eklenir."
    :"Sütunlar: Tarih, Deneme, Sınıf, Öğrenci, Not. Yüklenen denemeler sipariş olarak onaya gider.";
  $("who").textContent=(admin?"Yönetici · ":"")+S.email;
  $("p-siparis").hidden=!admin;$("p-kurumlar").hidden=!admin;$("ksec-wrap").hidden=!admin;$("fk-wrap").hidden=!admin;
  $("fkurum").required=admin;
  $("nav-urun").hidden=true;$("sk-wrap").hidden=!admin;$("sf-kurum-wrap").hidden=!admin;
  $("form-h").textContent=admin?"Deneme ekle":"Deneme siparişi ver";
  $("kaydet").textContent=admin?"Kaydet":"Siparişi gönder";
  $("altbaslik").textContent=admin?"Kurumların deneme siparişleri. Denemeye 1 hafta kala uyarı çıkar.":"Deneme siparişlerinizi buradan verin ve takip edin.";
  const p=parts(todayStr());$("today").textContent=p.d+" "+AYTAM[p.m-1]+" "+p.y+", "+p.gun;
}
async function yukle(){
  const [k,d,u,sp]=await Promise.all([sb.from("kurumlar").select("*").order("ad"),sb.from("denemeler").select("*").order("tarih"),
    sb.from("urunler").select("*").order("ad"),sb.from("siparisler").select("*").order("created_at",{ascending:false})]);
  const tk=await sb.from("takvim").select("*").order("tarih");S.takvim=tk.error?[]:tk.data;S.takvimHata=!!tk.error;
  if(k.error||d.error){flash($("msg"),hataMetni(k.error||d.error),true);return}
  S.kurumlar=k.data;S.denemeler=d.data;
  S.urunler=u.error?[]:u.data;S.siparisler=sp.error?[]:sp.data;S.urunHata=!!(u.error||sp.error);
  if(S.rol==="kurum")S.secili=S.kurumId;
  render();
}
function canli(){
  if(S.kanal)return;
  S.kanal=sb.channel("degisiklik").on("postgres_changes",{event:"*",schema:"public",table:"denemeler"},()=>yukle())
    .on("postgres_changes",{event:"*",schema:"public",table:"siparisler"},p=>{if(p&&p.eventType==="INSERT"&&S.rol==="admin"&&p.new&&p.new.kurum_id)bildir("Yeni ürün siparişi geldi: "+kAd(p.new.kurum_id));yukle()}).subscribe();
  setInterval(()=>{if(!document.hidden)yukle()},5*60*1000);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.rol)yukle()});

// ---------- çizim ----------
const kAd=id=>(S.kurumlar.find(k=>k.id===id)||{}).ad||"—";
function render(){renderDeneme();renderSiparis();renderYayin();renderSekme()}
function renderDeneme(){
  const admin=S.rol==="admin";const t=parts(todayStr());
  const all=[...S.denemeler].sort((a,b)=>a.tarih.localeCompare(b.tarih));
  const aktif=all.filter(x=>x.durum!=="iptal");
  const hafta=aktif.filter(x=>{const n=daysUntil(x.tarih);return n>=0&&n<=UYARI_GUN});
  const bekleyen=all.filter(x=>x.durum==="bekliyor"&&daysUntil(x.tarih)>=0);
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
  const ara=$("ara").value.trim().toLocaleLowerCase("tr"),dsec=$("dsec").value,zsec=$("zsec").value;
  const tumKurum=yearAll.filter(x=>!S.secili||x.kurum_id===S.secili);
  const rows=tumKurum.filter(x=>(!dsec||x.durum===dsec)
    &&(!zsec||(zsec==="gelecek"?daysUntil(x.tarih)>=0:daysUntil(x.tarih)<0))
    &&(!ara||[x.ad,x.sinif,x.notlar,kAd(x.kurum_id)].join(" ").toLocaleLowerCase("tr").includes(ara)));
  S.gorunen=rows;
  const filtreli=rows.length!==tumKurum.length;
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
  if(!rows.length){$("list").innerHTML=`<div class="empty">${filtreli?"Aramanıza uyan deneme yok.":yilAd(S.yil)+" eğitim yılında deneme yok."+(admin?"":" Sağdaki formdan ilk siparişinizi verebilirsiniz.")}</div>`}
  else{let last=null;$("list").innerHTML=(filtreli?`<div class="sonuc">${tumKurum.length} denemeden ${rows.length} tanesi gösteriliyor.</div>`:"")+rows.map(x=>{const n=daysUntil(x.tarih);const p=parts(x.tarih);
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
  // aylık takvim görünümü
  $("g-liste").setAttribute("aria-selected",S.gorunum==="liste");$("g-takvim").setAttribute("aria-selected",S.gorunum==="takvim");
  $("list").hidden=S.gorunum!=="liste";$("cal").hidden=S.gorunum!=="takvim";
  if(S.gorunum==="takvim")renderTakvim(rows,admin);
  $("store").textContent=admin?"Kurumların verdiği siparişler buraya anında düşer.":"Siparişiniz yönetici onaylayana kadar düzenlenebilir.";
}
function ayIcinde(y){const t=parts(todayStr());const i=t.y*12+t.m-1;return (i>=y*12+8&&i<=y*12+19)?i:y*12+8}
function calGrid(ay,lo,hi,rows,chip,nav,legend,ekle){
  const y=Math.floor(ay/12),m=ay%12+1;const off=(new Date(y,m-1,1).getDay()+6)%7;const gunSay=new Date(y,m,0).getDate();const tod=todayStr();
  let h=`<div class="cal-head"><button type="button" data-${nav}="-1" ${ay<=lo?"disabled":""} aria-label="Önceki ay">‹</button><h4>${AYTAM[m-1]} ${y}</h4><button type="button" data-${nav}="1" ${ay>=hi?"disabled":""} aria-label="Sonraki ay">›</button></div><div class="cal-grid">`;
  h+=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map(d=>`<div class="cal-dow">${d}</div>`).join("");
  const toplam=Math.ceil((off+gunSay)/7)*7;
  for(let i=0;i<toplam;i++){const dt=new Date(y,m-1,i-off+1);const ds=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
    const ic=dt.getMonth()===m-1;
    h+=`<div class="cal-day ${ic?"":"out"} ${ds===tod?"today":""} ${ic&&(dt.getDay()===0||dt.getDay()===6)?"wk":""} ${ekle&&ic?"ekle":""}" ${ekle&&ic?`data-gun="${ds}"`:""}><span class="dtop"><span class="dn">${dt.getDate()}</span>${ekle&&ic?`<button type="button" class="cal-add" data-tgun="${ds}" title="Bu güne deneme ekle" aria-label="${dt.getDate()} ${AYTAM[m-1]} tarihine deneme ekle">+</button>`:""}</span>`+rows.filter(x=>x.tarih===ds).map(chip).join("")+`</div>`}
  return h+`</div><div class="cal-legend">${legend}</div>`}
function renderTakvim(rows,admin){
  if(S.ay===null||S.ay<S.yil*12+8||S.ay>S.yil*12+19)S.ay=ayIcinde(S.yil);
  $("cal").innerHTML=calGrid(S.ay,S.yil*12+8,S.yil*12+19,rows,
    x=>`<button type="button" class="chipd ${x.durum} ${daysUntil(x.tarih)<0?"past":""}" ${(admin||x.durum==="bekliyor")?`data-edit="${x.id}"`:""} title="${esc((admin?kAd(x.kurum_id)+" · ":"")+(x.ad||"Deneme")+" · "+DURUM[x.durum])}"><b>${esc(admin?kAd(x.kurum_id):(x.ad||"Deneme"))}</b>${admin&&x.ad?`<span class="ad">${esc(x.ad)}</span>`:""}</button>`,
    "ay",`<span><i style="background:var(--accent-soft)"></i>Onaylandı</span><span><i style="background:var(--warn-soft)"></i>Onay bekliyor</span><span><i style="background:var(--crit-soft)"></i>İptal</span><span>Bir denemeye tıklayınca düzenlenir.</span>`);
}
function renderKurumlar(){
  $("ktable").innerHTML=S.kurumlar.length?S.kurumlar.map(k=>{const ds=S.denemeler.filter(x=>x.kurum_id===k.id&&egitimYili(x.tarih)===S.yil&&x.durum!=="iptal");
    const bek=ds.filter(x=>x.durum==="bekliyor").length,kal=ds.filter(x=>daysUntil(x.tarih)>=0).length;
    return `<div class="krow"><div><strong>${esc(k.ad)}</strong><span>${[k.yetkili,k.email,k.telefon].filter(Boolean).map(esc).join(" · ")}</span>
    <div class="kst"><span>${ds.length} deneme (${yilAd(S.yil)})</span><span>${kal} yaklaşan</span>${bek?`<span class="w">${bek} onay bekliyor</span>`:""}</div></div>
    <div class="row" style="gap:0"><button class="ghost" data-kac="${k.id}">Takvimi</button><button class="ghost" data-kedit="${k.id}">Düzenle</button><button class="ghost danger" data-kdel="${k.id}">Sil</button></div>
    ${S.confirm==="k"+k.id?`<div class="confirm">${esc(k.ad)} ve tüm denemeleri silinsin mi? <button class="danger" data-kdelok="${k.id}">Evet, sil</button><button data-delno="1">Vazgeç</button></div>`:""}</div>`}).join("")
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
$("g-liste").onclick=()=>{S.gorunum="liste";render()};
$("g-takvim").onclick=()=>{S.gorunum="takvim";render()};
for(const id of ["ara","dsec","zsec"])$(id).addEventListener(id==="ara"?"input":"change",()=>render());
// Excel (CSV) — Türkçe Excel için ; ayırıcı ve UTF-8 BOM
$("excel").onclick=()=>{
  const r=S.gorunen||[];if(!r.length){flash($("msg"),"Aktarılacak deneme yok.",true);return}
  const q=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=[["Kurum","Tarih","Gün","Deneme","Sınıf","Öğrenci","Not","Durum"]].concat(r.map(x=>{const p=parts(x.tarih);
    return [kAd(x.kurum_id),String(p.d).padStart(2,"0")+"."+String(p.m).padStart(2,"0")+"."+p.y,p.gun,x.ad||"",x.sinif||"",x.ogrenci??"",x.notlar||"",DURUM[x.durum]]}));
  const blob=new Blob(["\ufeff"+rows.map(a=>a.map(q).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  dosyaKaydet("deneme-takvimi-"+(S.secili?kAd(S.secili).replace(/ı/g,"i").replace(/İ/g,"I").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-"):"tum-kurumlar")+"-"+S.yil+"-"+(S.yil+1)+".csv",blob,$("msg"))};
$("ksec").onchange=e=>{S.secili=e.target.value;S.confirm=null;render()};
$("yil").onchange=e=>{S.yil=Number(e.target.value);S.ay=null;render()};

// ---------- kurum formu ----------
let kEdit=null;
function kSifirla(){$("f-kurum").reset();kEdit=null;$("k-btn").textContent="Kurum ekle";$("k-iptal").hidden=true}
$("k-iptal").onclick=kSifirla;
$("f-kurum").addEventListener("submit",async e=>{
  e.preventDefault();
  const body={ad:$("k-ad").value.trim(),email:$("k-email").value.trim().toLowerCase(),telefon:$("k-tel").value.trim()||null,yetkili:$("k-yetkili").value.trim()||null};
  const {error}=kEdit?await sb.from("kurumlar").update(body).eq("id",kEdit):await sb.from("kurumlar").insert(body);
  if(error){flash($("k-msg"),hataMetni(error),true);return}
  flash($("k-msg"),(kEdit?"Güncellendi: ":"Eklendi: ")+body.ad+". Kurum "+body.email+" ile \"İlk kez giriş\" yapabilir.");kSifirla();yukle();
});

// ---------- dosya indirme (Claude önizlemesinde izinli indirme, sitede normal indirme) ----------
async function dosyaKaydet(ad,blob,msgEl){
  try{const dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null;
    if(dl){await dl.save({filename:ad,data:blob});return}}
  catch(e){if(e&&e.code==="declined")return;if(msgEl)flash(msgEl,"Dosya indirilemedi ("+(e&&e.code||"hata")+").",true);return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=ad;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

// ---------- Excel'den toplu yükleme ----------
let yuklenecek=[];
const norm=v=>String(v??"").trim().toLocaleLowerCase("tr").replace(/[ıi̇]/g,"i").replace(/\s+/g," ");
const BASLIK={kurum:["kurum","kurum adı","okul","okul adı"],tarih:["tarih","deneme tarihi"],ad:["deneme","deneme adı","yayın","deneme adı / yayın","ad"],sinif:["sınıf","sinif","seviye"],ogrenci:["öğrenci","öğrenci sayısı","ogrenci","adet","kişi"],notlar:["not","notlar","açıklama"]};
function tarihCoz(v){
  if(v instanceof Date&&!isNaN(v))return v.getFullYear()+"-"+String(v.getMonth()+1).padStart(2,"0")+"-"+String(v.getDate()).padStart(2,"0");
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}
  const s=String(v??"").trim();let m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if(m){let y=Number(m[3]);if(y<100)y+=2000;const mo=Number(m[2]),d=Number(m[1]);if(mo>=1&&mo<=12&&d>=1&&d<=31)return y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
  return null}
function excelOku(file){
  if(!window.XLSX){flash($("yukle-msg"),"Excel okuyucu yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.",true);return}
  const r=new FileReader();
  r.onload=()=>{try{
    const wb=XLSX.read(r.result,{type:"array",cellDates:true});const sh=wb.Sheets[wb.SheetNames[0]];
    const satir=XLSX.utils.sheet_to_json(sh,{header:1,defval:"",raw:true}).filter(a=>a.some(c=>String(c).trim()!==""));
    if(satir.length<2){flash($("yukle-msg"),"Dosyada başlık satırından sonra veri bulunamadı.",true);return}
    const bas=satir[0].map(norm);const col={};
    for(const [k,adlar] of Object.entries(BASLIK)){const i=bas.findIndex(b=>adlar.map(norm).includes(b));if(i>=0)col[k]=i}
    if(col.tarih===undefined){flash($("yukle-msg"),"\"Tarih\" sütunu bulunamadı. Örnek şablondaki başlıkları kullanın.",true);return}
    const admin=S.rol==="admin";if(admin&&col.kurum===undefined){flash($("yukle-msg"),"\"Kurum\" sütunu bulunamadı.",true);return}
    const kmap=new Map(S.kurumlar.map(k=>[norm(k.ad),k.id]));
    yuklenecek=satir.slice(1).map((a,i)=>{const g=k=>col[k]===undefined?"":a[col[k]];const hatalar=[];
      const tarih=tarihCoz(g("tarih"));if(!tarih)hatalar.push("Tarih okunamadı");
      let kurum_id=S.kurumId,kurumAd=admin?String(g("kurum")).trim():kAd(S.kurumId);
      if(admin){kurum_id=kmap.get(norm(kurumAd))||null;if(!kurum_id)hatalar.push(kurumAd?"Kurum sistemde yok":"Kurum boş")}
      const og=String(g("ogrenci")).replace(/\D/g,"");
      return {satir:i+2,kurumAd,hatalar,veri:{kurum_id,tarih,ad:String(g("ad")).trim()||null,sinif:String(g("sinif")).trim()||null,ogrenci:og?Number(og):null,notlar:String(g("notlar")).trim()||null,...(admin?{durum:"onaylandi"}:{})}}});
    onizleGoster();
  }catch(err){flash($("yukle-msg"),"Dosya okunamadı: "+err.message,true)}};
  r.readAsArrayBuffer(file)}
function onizleGoster(){
  const iyi=yuklenecek.filter(x=>!x.hatalar.length),kotu=yuklenecek.length-iyi.length;const admin=S.rol==="admin";
  $("onizle").hidden=false;
  $("onizle-ozet").textContent=`${yuklenecek.length} satır okundu: ${iyi.length} deneme eklenmeye hazır`+(kotu?`, ${kotu} satırda hata var (bunlar eklenmeyecek).`:".");
  $("onizle-tablo").innerHTML=`<tr><th>Satır</th>${admin?"<th>Kurum</th>":""}<th>Tarih</th><th>Deneme</th><th>Sınıf</th><th>Öğrenci</th><th>Durum</th></tr>`+
    yuklenecek.map(x=>`<tr class="${x.hatalar.length?"hata":""}"><td>${x.satir}</td>${admin?`<td>${esc(x.kurumAd)}</td>`:""}<td>${x.veri.tarih?tarihYaz(x.veri.tarih).replace(/ \S+$/,""):"—"}</td><td>${esc(x.veri.ad||"")}</td><td>${esc(x.veri.sinif||"")}</td><td>${x.veri.ogrenci??""}</td>
      ${x.hatalar.length?`<td class="e">${x.hatalar.join(", ")}</td>`:"<td>Hazır</td>"}</tr>`).join("");
  $("yukle-btn").textContent=`${iyi.length} denemeyi ekle`;$("yukle-btn").disabled=!iyi.length}
$("xlsdosya").onchange=e=>{const f=e.target.files[0];if(f)excelOku(f);e.target.value=""};
$("yukle-iptal").onclick=()=>{yuklenecek=[];$("onizle").hidden=true};
$("yukle-btn").onclick=async()=>{
  const iyi=yuklenecek.filter(x=>!x.hatalar.length).map(x=>x.veri);if(!iyi.length)return;
  $("yukle-btn").disabled=true;
  const {error}=await sb.from("denemeler").insert(iyi);
  if(error){flash($("yukle-msg"),hataMetni(error),true);$("yukle-btn").disabled=false;return}
  flash($("yukle-msg"),iyi.length+" deneme eklendi"+(S.rol==="admin"?".":" ve onaya gönderildi."));
  yuklenecek=[];$("onizle").hidden=true;S.yil=egitimYili(iyi[0].tarih);yukle()};
$("sablon").onclick=()=>{
  const admin=S.rol==="admin";const k=(S.kurumlar[0]||{}).ad||"Atatürk Ortaokulu";
  const rows=admin?[["Kurum","Tarih","Deneme","Sınıf","Öğrenci","Not"],[k,"15.12.2026","LGS Deneme 4","8. sınıf",35,"Sabah 09:30"]]
    :[["Tarih","Deneme","Sınıf","Öğrenci","Not"],["15.12.2026","LGS Deneme 4","8. sınıf",35,"Sabah 09:30"]];
  if(window.XLSX){const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=rows[0].map(()=>({wch:18}));XLSX.utils.book_append_sheet(wb,ws,"Denemeler");
    const buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});
    dosyaKaydet("deneme-yukleme-sablonu.xlsx",new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),$("yukle-msg"));return}
  dosyaKaydet("deneme-yukleme-sablonu.csv",new Blob(["\ufeff"+rows.map(a=>a.join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),$("yukle-msg"))};

// ---------- sekmeler ----------
function renderSekme(){
  for(const id of ["takvim","deneme","siparis","urun"])$("v-"+id).hidden=S.sekme!==id;
  document.querySelectorAll(".nav [data-sekme]").forEach(b=>b.setAttribute("aria-current",b.dataset.sekme===S.sekme?"page":"false"));
  const bek=S.siparisler.filter(x=>x.durum==="bekliyor").length;$("nav-sip").textContent=bek||"";
  const admin=S.rol==="admin";
  if(S.sekme==="takvim"){$("baslik").textContent="Deneme Takvimi "+yilAd(S.yil);
    $("altbaslik").textContent=admin?"Yayınladığınız denemeleri buraya yazın. Kurumlar bu listeden tik atarak seçer.":"Yayın takviminden istediğiniz denemeleri işaretleyip tek seferde sipariş verin.";
    const ys=S.takvim.filter(t=>egitimYili(t.tarih)===S.yil&&t.aktif);const sec=admin?new Set(S.denemeler.filter(d=>d.takvim_id).map(d=>d.kurum_id)).size:S.denemeler.filter(d=>d.takvim_id&&d.durum!=="iptal"&&egitimYili(d.tarih)===S.yil).length;
    $("sum").innerHTML=`<div><b>${ys.length}</b><span>takvimdeki deneme</span></div><div><b>${new Set(ys.map(t=>t.sinif)).size}</b><span>sınıf seviyesi</span></div><div><b>${ys.filter(t=>daysUntil(t.tarih)>=0).length}</b><span>yaklaşan</span></div><div><b>${sec}</b><span>${admin?"kurum seçim yaptı":"seçtiğiniz deneme"}</span></div>`;return}
  $("baslik").textContent=S.sekme==="deneme"?(admin?"Deneme Sipariş Paneli":(S.kurumlar.find(k=>k.id===S.kurumId)||{}).ad||"Kurum")
    :S.sekme==="siparis"?(admin?"Ürün Siparişleri":"Ürün Siparişlerim"):"Ürün Kataloğu";
  if(S.sekme==="deneme")return;
  $("altbaslik").textContent=S.sekme==="urun"?"Kurumların sipariş verebileceği ürünleri buradan yönetin."
    :admin?"Kurumların ürün siparişleri. Durumu değiştirdiğinizde kurum hemen görür.":"Ürün siparişlerinizi buradan verin ve durumunu takip edin.";
  const t=parts(todayStr());const buAy=S.siparisler.filter(x=>{const d=new Date(x.created_at);return d.getFullYear()===t.y&&d.getMonth()+1===t.m&&x.durum!=="iptal"});
  const tut=buAy.every(x=>toplam(x.kalemler)!=null)?buAy.reduce((a,x)=>a+toplam(x.kalemler),0):null;
  const say=d=>S.siparisler.filter(x=>x.durum===d).length;
  $("sum").innerHTML=`<div><b>${bek}</b><span>onay bekliyor</span></div><div><b>${say("onaylandi")+say("hazirlaniyor")}</b><span>hazırlanacak</span></div>
    <div><b>${buAy.length}</b><span>${AYTAM[t.m-1]} siparişi</span></div>`+(tut!=null&&buAy.length?`<div><b class="tut">${TL(tut)}</b><span>${AYTAM[t.m-1]} tutarı</span></div>`:"");
}

// ---------- ürün siparişleri ----------
const SDURUM={bekliyor:"Onay bekliyor",onaylandi:"Onaylandı",hazirlaniyor:"Hazırlanıyor",teslim:"Teslim edildi",iptal:"İptal"};
const TL=v=>v==null?"":new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(v);
const sipNo=x=>"#"+x.id.replace(/-/g,"").slice(0,6).toUpperCase();
function toplam(kalemler){if(kalemler.some(k=>k.fiyat==null))return null;return kalemler.reduce((a,k)=>a+k.fiyat*k.adet,0)}
function tarihSaat(iso){const d=new Date(iso);return d.getDate()+" "+AY[d.getMonth()]+" "+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function sipGorunum(g){S.sgor=g;renderSiparis();window.scrollTo({top:0})}
function sipDoldur(){ // kurumun kayıtlı bilgilerini forma koy (boş alanlara)
  const admin=S.rol==="admin";const kid=admin?$("sf-kurum").value:S.kurumId;if(S.sfDolu===kid)return;S.sfDolu=kid;
  const k=S.kurumlar.find(x=>x.id===kid)||{};
  $("sf-yetkili").value=k.yetkili||"";$("sf-tel").value=k.telefon||"";
  const son=S.siparisler.find(x=>x.kurum_id===kid&&x.adres);$("sf-adres").value=son?son.adres:"";
  if(son&&son.odeme&&!$("sf-odeme").value)$("sf-odeme").value=son.odeme}
function renderSiparis(){
  const admin=S.rol==="admin";
  if(!S.sgor)S.sgor=admin?"liste":"form";
  const bekN=S.siparisler.filter(x=>x.durum==="bekliyor").length;
  $("sg-liste-ad").textContent=admin?"Gelen siparişler":"Siparişlerim";$("sg-n").textContent=admin?(bekN||""):(S.siparisler.filter(x=>x.durum!=="teslim"&&x.durum!=="iptal").length||"");
  $("sg-form").setAttribute("aria-selected",S.sgor==="form");$("sg-liste").setAttribute("aria-selected",S.sgor==="liste");
  $("sp-form").hidden=S.sgor!=="form";$("sp-ok").hidden=S.sgor!=="ok";$("sp-liste").hidden=S.sgor!=="liste";
  if(admin){const cur=$("s-kurum").value;$("s-kurum").innerHTML=`<option value="">Tüm kurumlar</option>`+S.kurumlar.map(k=>`<option value="${k.id}">${esc(k.ad)}</option>`).join("");$("s-kurum").value=cur;
    const c2=$("sf-kurum").value;$("sf-kurum").innerHTML=`<option value="">Kurum seçin…</option>`+S.kurumlar.map(k=>`<option value="${k.id}">${esc(k.ad)}</option>`).join("");$("sf-kurum").value=c2}
  $("sf-kurumad-wrap").hidden=admin;$("sf-kurumad").textContent=admin?"":kAd(S.kurumId);
  $("sf-bugun").textContent=tarihYaz(todayStr());
  if(S.sgor==="form")sipDoldur();
  const fk=$("s-kurum").value,fd=$("s-durum").value;
  const list=S.siparisler.filter(x=>(!fk||x.kurum_id===fk)&&(!fd||x.durum===fd));
  $("s-list").innerHTML=S.urunHata?'<div class="empty">Ürün tabloları veritabanında henüz yok. README\'deki SQL\'i yeniden çalıştırın.</div>'
   :!list.length?`<div class="empty">${S.siparisler.length?"Bu seçimde sipariş yok.":admin?"Henüz ürün siparişi yok. Kurumların doldurduğu sipariş formları buraya düşer.":"Henüz siparişiniz yok. Sipariş formu sekmesinden sipariş verebilirsiniz."}</div>`
   :list.map(x=>{const t=toplam(x.kalemler);const adet=x.kalemler.reduce((a,k)=>a+k.adet,0);
    const bilgi=[x.yetkili,x.telefon,x.odeme].filter(Boolean).map(esc).join(" · ");
    return `<div class="scard ${x.durum}">
      <div class="shead"><div><strong>${admin?esc(kAd(x.kurum_id))+" · ":""}Sipariş ${sipNo(x)}</strong>
        <div class="meta">${tarihSaat(x.created_at)}${x.teslim_tarihi?" · İstenen teslim: "+tarihYaz(x.teslim_tarihi):""}</div>
        ${bilgi?`<div class="meta">${bilgi}</div>`:""}${x.adres?`<div class="meta">Adres: ${esc(x.adres)}</div>`:""}</div>
        <span class="pill ${x.durum==="bekliyor"?"bekliyor":x.durum==="iptal"?"iptal":x.durum==="teslim"?"teslim":x.durum==="hazirlaniyor"?"hazirlaniyor":"onaylandi"}">${SDURUM[x.durum]}</span></div>
      <div class="skal">${x.kalemler.map(k=>`<div><span>${esc(k.ad)}</span><span>${k.adet} ${esc(k.birim||"adet")}</span></div>`).join("")}</div>
      ${x.notlar?`<div class="meta" style="font-size:13px;color:var(--muted)">Not: ${esc(x.notlar)}</div>`:""}
      <div class="sfoot"><span style="font-size:13.5px"><b>${x.kalemler.length}</b> kalem · <b>${adet}</b> adet</span>
        <div class="row" style="gap:6px"><button type="button" class="ghost" data-sform="${x.id}">Formu aç</button>${admin?`<select data-sdurum="${x.id}" aria-label="Sipariş durumu">${Object.entries(SDURUM).map(([k,v])=>`<option value="${k}" ${k===x.durum?"selected":""}>${v}</option>`).join("")}</select>`:""}
        ${admin||x.durum==="bekliyor"?`<button class="ghost danger" data-ssil="${x.id}">${admin?"Sil":"Siparişi geri çek"}</button>`:""}</div></div>
      ${S.confirm==="s"+x.id?`<div class="confirm">Sipariş ${sipNo(x)} silinsin mi? <button class="danger" data-ssilok="${x.id}">Evet</button><button data-delno="1">Vazgeç</button></div>`:""}
    </div>`}).join("");
  // ürün satırları (kurum kendisi yazar)
  if(!S.satirlar||!S.satirlar.length)S.satirlar=[yeniSatir(),yeniSatir(),yeniSatir()];
  $("skalem").innerHTML=S.satirlar.map((x,i)=>`<div class="srow">
    <span class="sno">${i+1}</span>
    <input data-si="${i}" data-sf="ad" value="${esc(x.ad)}" placeholder="Ürün adını yazın" aria-label="${i+1}. satır ürün adı">
    <select data-si="${i}" data-sf="birim" aria-label="${i+1}. satır birim">${BIRIMLER.map(b=>`<option ${b===x.birim?"selected":""}>${b}</option>`).join("")}</select>
    <input data-si="${i}" data-sf="adet" type="number" min="1" inputmode="numeric" value="${x.adet}" placeholder="0" aria-label="${i+1}. satır adet">
    <button type="button" class="ghost danger ssatsil" data-satsil="${i}" aria-label="${i+1}. satırı sil" ${S.satirlar.length<2?"disabled":""}>×</button></div>`).join("");
  renderSepet();
}
const BIRIMLER=["adet","paket","set","koli","kitap"];
function yeniSatir(){return{ad:"",birim:"adet",adet:""}}
function doluSatirlar(){return(S.satirlar||[]).filter(x=>x.ad.trim()&&Number(x.adet)>0)}
function renderSepet(){
  const kal=doluSatirlar();
  if(!kal.length){$("sf-toplam").innerHTML='<span class="hint">Ürün adını ve adedini yazın.</span>';$("sf-gonder").disabled=true;$("sf-gonder").textContent="Ürün yazın";return}
  $("sf-toplam").innerHTML=`<span><b>${kal.length}</b> kalem · <b>${kal.reduce((a,x)=>a+Number(x.adet),0)}</b> adet</span>`;
  $("sf-gonder").disabled=false;$("sf-gonder").textContent="Siparişi gönder";
}
$("skalem").addEventListener("input",e=>{const i=e.target.dataset.si;if(i===undefined)return;S.satirlar[i][e.target.dataset.sf]=e.target.value;renderSepet()});
$("skalem").addEventListener("change",e=>{const i=e.target.dataset.si;if(i===undefined)return;S.satirlar[i][e.target.dataset.sf]=e.target.value;renderSepet()});
$("skalem").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.dataset.si!==undefined){e.preventDefault();const i=Number(e.target.dataset.si);if(i===S.satirlar.length-1)satirEkle();else{const n=document.querySelector(`#skalem [data-si="${i+1}"][data-sf="ad"]`);if(n)n.focus()}}});
function satirEkle(){S.satirlar.push(yeniSatir());renderSiparis();const n=document.querySelector(`#skalem [data-si="${S.satirlar.length-1}"][data-sf="ad"]`);if(n)n.focus()}
$("sf-satir").onclick=satirEkle;
$("s-kurum").onchange=$("s-durum").onchange=()=>renderSiparis();
$("sf-kurum").addEventListener("change",()=>sipDoldur());
$("sg-form").onclick=()=>sipGorunum("form");$("sg-liste").onclick=()=>sipGorunum("liste");
$("v-siparis").addEventListener("change",async e=>{const id=e.target.dataset.sdurum;if(!id)return;
  const {error}=await sb.from("siparisler").update({durum:e.target.value}).eq("id",id);if(error)flash($("sf-msg"),hataMetni(error),true);yukle()});
$("sf-gonder").onclick=async()=>{
  const admin=S.rol==="admin";const kurum_id=admin?$("sf-kurum").value:S.kurumId;
  if(!kurum_id){flash($("sf-msg"),"Kurum seçin.",true);$("sf-kurum").focus();return}
  const yarim=(S.satirlar||[]).find(x=>x.ad.trim()&&!(Number(x.adet)>0));if(yarim){flash($("sf-msg"),`"${yarim.ad.trim()}" için adet yazın.`,true);return}
  const kalemler=doluSatirlar().map(x=>({ad:x.ad.trim(),birim:x.birim,adet:Number(x.adet)}));
  if(!kalemler.length){flash($("sf-msg"),"En az bir ürün adı ve adedi yazın.",true);return}
  const yetkili=$("sf-yetkili").value.trim(),telefon=$("sf-tel").value.trim(),adres=$("sf-adres").value.trim();
  if(!yetkili||!telefon||!adres){flash($("sf-msg"),"Yetkili kişi, telefon ve teslim adresini doldurun.",true);(!yetkili?$("sf-yetkili"):!telefon?$("sf-tel"):$("sf-adres")).focus();return}
  $("sf-gonder").disabled=true;
  const body={kurum_id,kalemler,yetkili,telefon,adres,odeme:$("sf-odeme").value||null,teslim_tarihi:$("sf-tarih").value||null,notlar:$("sf-not").value.trim()||null};if(admin)body.durum="onaylandi";
  const {data,error}=await sb.from("siparisler").insert(body).select();
  if(error){flash($("sf-msg"),hataMetni(error),true);$("sf-gonder").disabled=false;return}
  const yeni=data&&data[0]||{...body,id:"",created_at:new Date().toISOString(),durum:body.durum||"bekliyor"};
  S.satirlar=null;S.sfDolu=null;for(const id of ["sf-tarih","sf-not","sf-odeme"])$(id).value="";
  S.sonSiparis=yeni;S.sgor="ok";
  $("sp-ok").innerHTML=`<div class="okicon" aria-hidden="true">✓</div><h2>${admin?"Sipariş kaydedildi":"Siparişiniz bize ulaştı"}</h2>
    <p class="hint">${yeni.id?"Sipariş numarası <b>"+sipNo(yeni)+"</b>. ":""}${admin?"":"Onaylandığında durumunu Siparişlerim sekmesinde göreceksiniz."}</p>
    <div class="row" style="justify-content:center;gap:8px"><button type="button" class="primary" data-sformyeni="1">Sipariş formunu görüntüle</button><button type="button" data-sgor="form">Yeni sipariş</button><button type="button" data-sgor="liste">${admin?"Gelen siparişler":"Siparişlerim"}</button></div>`;
  await yukle();window.scrollTo({top:0})};
// yazdırılabilir sipariş formu
function sipFormu(x){
  const k=S.kurumlar.find(y=>y.id===x.kurum_id)||{};const t=toplam(x.kalemler);
  return `<div class="bform">
  <div class="bhead"><div><div class="bmarka">Bizden Yayıncılık</div><h2>Ürün Sipariş Formu</h2></div>
    <div class="bno"><div>Sipariş no <b>${x.id?sipNo(x):"—"}</b></div><div>Tarih <b>${tarihSaat(x.created_at)}</b></div><div>Durum <b>${SDURUM[x.durum]||""}</b></div></div></div>
  <table class="btab bbilgi"><tr><th>Kurum</th><td>${esc(k.ad||kAd(x.kurum_id))}</td><th>E-posta</th><td>${esc(k.email||"")}</td></tr>
    <tr><th>Yetkili</th><td>${esc(x.yetkili||"")}</td><th>Telefon</th><td>${esc(x.telefon||"")}</td></tr>
    <tr><th>Teslim adresi</th><td colspan="3">${esc(x.adres||"")}</td></tr>
    <tr><th>İstenen teslim</th><td>${x.teslim_tarihi?tarihYaz(x.teslim_tarihi):"—"}</td><th>Ödeme</th><td>${esc(x.odeme||"—")}</td></tr></table>
  <table class="btab bkal"><thead><tr><th>#</th><th>Ürün</th><th>Birim</th><th class="r">Adet</th></tr></thead><tbody>
    ${x.kalemler.map((k,i)=>`<tr><td>${i+1}</td><td>${esc(k.ad)}</td><td>${esc(k.birim||"adet")}</td><td class="r">${k.adet}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="3">Toplam</td><td class="r">${x.kalemler.reduce((a,k)=>a+k.adet,0)}</td></tr></tfoot></table>
  ${x.notlar?`<p class="bnot"><b>Not:</b> ${esc(x.notlar)}</p>`:""}
  <div class="bimza"><div>Sipariş veren<br><span>${esc(x.yetkili||"")}</span></div><div>Teslim alan</div></div></div>`}
function formAc(x){$("sbaski-ic").innerHTML=sipFormu(x);$("sbaski").hidden=false;document.body.classList.add("baski-acik");$("sb-kapat").focus()}
function formKapat(){$("sbaski").hidden=true;document.body.classList.remove("baski-acik")}
$("sb-kapat").onclick=formKapat;$("sb-yazdir").onclick=()=>{try{window.print()}catch(e){}};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("sbaski").hidden)formKapat()});
$("sbaski").addEventListener("click",e=>{if(e.target===$("sbaski"))formKapat()});
function bildir(text){const el=$("toast");el.textContent=text;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true},7000)}


// ---------- ürün kataloğu (yönetici) ----------
function renderUrunler(){
  $("u-katlist").innerHTML=[...new Set(S.urunler.map(u=>u.kategori).filter(Boolean))].map(k=>`<option value="${esc(k)}">`).join("");
  $("u-list").innerHTML=S.urunHata?'<div class="empty">Ürün tabloları veritabanında henüz yok. README\'deki SQL\'i yeniden çalıştırın.</div>'
   :!S.urunler.length?'<div class="empty">Henüz ürün yok. Sağdaki formdan ilk ürünü ekleyin.</div>'
   :S.urunler.map(u=>{const sat=S.siparisler.filter(x=>x.durum!=="iptal").reduce((a,x)=>a+x.kalemler.filter(k=>k.urun_id===u.id).reduce((b,k)=>b+k.adet,0),0);
    return `<div class="krow ${u.aktif?"":"pasif"}"><div><strong>${esc(u.ad)}</strong><span>${[u.kategori,u.birim,u.fiyat!=null?TL(u.fiyat):"",u.aciklama].filter(Boolean).map(esc).join(" · ")}</span>
      <div class="kst"><span>${u.aktif?"Satışta":"Satışta değil"}</span><span>${sat} ${esc(u.birim)} sipariş edildi</span></div></div>
      <div class="row" style="gap:0"><button class="ghost" data-uedit="${u.id}">Düzenle</button><button class="ghost danger" data-usil="${u.id}">Sil</button></div>
      ${S.confirm==="u"+u.id?`<div class="confirm">${esc(u.ad)} silinsin mi? Eski siparişlerde adı görünmeye devam eder. <button class="danger" data-usilok="${u.id}">Evet, sil</button><button data-delno="1">Vazgeç</button></div>`:""}</div>`}).join("");
}
function uSifirla(){$("f-urun").reset();$("u-aktif").checked=true;S.uEdit=null;$("u-btn").textContent="Ürün ekle";$("uf-h").textContent="Ürün ekle";$("u-iptal").hidden=true}
$("u-iptal").onclick=uSifirla;
$("f-urun").addEventListener("submit",async e=>{e.preventDefault();
  const f=$("u-fiyat").value;
  const body={ad:$("u-ad").value.trim(),kategori:$("u-kat").value.trim()||null,birim:$("u-birim").value,fiyat:f===""?null:Number(f),aciklama:$("u-acik").value.trim()||null,aktif:$("u-aktif").checked};
  if(!body.ad)return;
  const {error}=S.uEdit?await sb.from("urunler").update(body).eq("id",S.uEdit):await sb.from("urunler").insert(body);
  if(error){flash($("u-msg"),hataMetni(error),true);return}
  flash($("u-msg"),(S.uEdit?"Güncellendi: ":"Eklendi: ")+body.ad);uSifirla();yukle()});

// ---------- YAYIN TAKVİMİ (sınıf sınıf) ----------
const SINIFLAR=["4. sınıf","5. sınıf","6. sınıf","7. sınıf","8. sınıf","9. sınıf","10. sınıf","11. sınıf","12. sınıf","Mezun"];
const sinifSira=s=>{const i=SINIFLAR.indexOf(s);return i<0?99:i};
function benimSecim(tid){return S.denemeler.find(d=>d.takvim_id===tid&&d.kurum_id===S.kurumId)}
function renderYayin(){
  const admin=S.rol==="admin";
  // yıl seçici
  const ys=new Set([buYil,...S.takvim.map(t=>egitimYili(t.tarih))]);
  $("tyil").innerHTML=[...ys].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===S.yil?"selected":""}>${yilAd(y)}</option>`).join("");
  const yil=S.takvim.filter(t=>egitimYili(t.tarih)===S.yil&&(admin||t.aktif));
  const siniflar=[...new Set(yil.map(t=>t.sinif))].sort((a,b)=>sinifSira(a)-sinifSira(b));
  if(S.tsinif&&!siniflar.includes(S.tsinif))S.tsinif="";
  $("tsinif").innerHTML=`<button type="button" class="chip" data-ts="" aria-pressed="${!S.tsinif}">Tüm sınıflar<span class="n">${yil.length}</span></button>`+
    siniflar.map(c=>`<button type="button" class="chip" data-ts="${esc(c)}" aria-pressed="${S.tsinif===c}">${esc(c)}<span class="n">${yil.filter(t=>t.sinif===c).length}</span></button>`).join("");
  const rows=yil.filter(t=>!S.tsinif||t.sinif===S.tsinif);
  $("tsinif-h").textContent=S.tsinif?S.tsinif+" takvimi":"Tüm sınıfların takvimi";
  if(S.tgor===null)S.tgor="tablo";
  $("tg-tablo").setAttribute("aria-selected",S.tgor==="tablo");$("tg-liste").setAttribute("aria-selected",S.tgor==="liste");$("tg-takvim").setAttribute("aria-selected",S.tgor==="takvim");
  $("ttablo").hidden=S.tgor!=="tablo";document.querySelector("#v-takvim .cols").classList.toggle("genis",S.tgor==="tablo");$("tlist").hidden=S.tgor!=="liste";$("tcal").hidden=S.tgor!=="takvim";
  const durumu=t=>{if(admin)return "";const d=benimSecim(t.id);return d?(d.durum==="iptal"?"iptal":"alindi"):S.secim[t.id]?"secili":""};
  const secenler=t=>S.denemeler.filter(d=>d.takvim_id===t.id&&d.durum!=="iptal");
  if(S.takvimHata){$("tlist").innerHTML='<div class="empty">Takvim tablosu veritabanında henüz yok. README\'deki SQL\'i yeniden çalıştırın.</div>'}
  else if(!rows.length){$("tlist").innerHTML=`<div class="empty">${admin?yilAd(S.yil)+" için takvime henüz deneme yazılmadı. Sağdaki formdan ekleyin.":"Bu yıl için yayın takvimi henüz hazır değil."}</div>`}
  else{let last=null;$("tlist").innerHTML=rows.map(t=>{const p=parts(t.tarih);const key=p.y+"-"+p.m;const head=key!==last?`<div class="month">${AYTAM[p.m-1]} ${p.y}</div>`:"";last=key;
    const n=daysUntil(t.tarih);const dr=durumu(t);const d=admin?null:benimSecim(t.id);const kurs=admin?secenler(t):[];
    const sol=admin?"":`<label class="tik ${dr}">${d?`<span class="tikok" aria-hidden="true">✓</span>`:`<input type="checkbox" data-tik="${t.id}" ${S.secim[t.id]?"checked":""} ${n<0?"disabled":""} aria-label="${esc(t.ad)} seç">`}</label>`;
    return head+`<div class="item titem ${admin?"":"kur"} ${dr} ${n<0?"past":""} ${t.aktif?"":"pasif"}">${sol}
      <div class="tile"><i>${p.ay.toLocaleUpperCase("tr")}</i><b>${p.d}</b><span>${p.gk}</span></div>
      <div class="info"><div class="kname">${esc(t.sinif)}${t.tur?" · "+esc(t.tur):""}</div><strong>${esc(t.ad)}</strong>
        <div class="meta">${admin?(kurs.length?`${kurs.length} kurum seçti: ${kurs.slice(0,3).map(k=>esc(kAd(k.kurum_id))).join(", ")}${kurs.length>3?" ve "+(kurs.length-3)+" kurum daha":""}`:"Henüz seçen kurum yok")+(t.aktif?"":" · Yayında değil"):
          d?`Sipariş verildi · ${DURUM[d.durum]}${d.ogrenci?" · "+d.ogrenci+" öğrenci":""}`:esc(t.aciklama||"")||"&nbsp;"}</div></div>
      <div class="right"><span class="pill ${n<0?"past":n<=UYARI_GUN?"soon":""}">${kalan(n)}</span>
        ${admin?`<div class="row" style="gap:0"><button class="ghost" data-tedit="${t.id}">Düzenle</button><button class="ghost danger" data-tsil="${t.id}">Sil</button></div>`:""}</div>
      ${S.confirm==="t"+t.id?`<div class="confirm">${esc(t.ad)} takvimden silinsin mi? Kurumların verdiği siparişler silinmez. <button class="danger" data-tsilok="${t.id}">Evet, sil</button><button data-delno="1">Vazgeç</button></div>`:""}
    </div>`}).join("")}
  if(S.tgor==="tablo")$("ttablo").innerHTML=S.takvimHata?'<div class="empty">Takvim tablosu veritabanında henüz yok. README\'deki SQL\'i yeniden çalıştırın.</div>'
    :(!rows.length&&!admin)?'<div class="empty">Bu yıl için yayın takvimi henüz hazır değil.</div>':ayTablo(rows,admin,durumu,secenler);
  if(S.tgor==="takvim"){if(S.tay===null||S.tay<S.yil*12+8||S.tay>S.yil*12+19)S.tay=ayIcinde(S.yil);
    $("tcal").innerHTML=calGrid(S.tay,S.yil*12+8,S.yil*12+19,rows,t=>{const dr=durumu(t);const k=admin?secenler(t).length:0;
      return `<button type="button" class="chipd ${dr==="alindi"?"onaylandi":dr==="secili"?"bekliyor":admin?"onaylandi":"bos"}" ${admin?`data-tedit="${t.id}"`:(!benimSecim(t.id)&&daysUntil(t.tarih)>=0?`data-tikb="${t.id}"`:"")} title="${esc(t.sinif+" · "+t.ad)}"><b>${esc(S.tsinif?t.ad:t.sinif)}</b><span class="ad">${esc([S.tsinif?t.tur:t.ad,admin?k+" kurum":""].filter(Boolean).join(" · "))}</span></button>`},
      "tay",admin?`<span><b>Deneme eklemek için bir güne tıklayın</b>, tarih forma yazılır. Var olan denemeye tıklayınca düzenlenir; altında kaç kurumun seçtiği yazar.</span>`:`<span><i style="background:var(--accent-soft)"></i>Sipariş verildi</span><span><i style="background:var(--warn-soft)"></i>Seçildi (henüz gönderilmedi)</span><span><i style="background:var(--field);border:1px solid var(--line)"></i>Seçilmedi</span><span>Tıklayarak seçebilirsiniz.</span>`,admin)}
  // sağ panel
  $("tp-admin").hidden=!admin;$("tp-kurum").hidden=admin;
  if(!admin)renderSecim();
}
// ay ay tablo: satırlar aylar, sütunlar sınıflar
function ayTablo(rows,admin,durumu,secenler){
  const tod=parts(todayStr());const buAy=tod.y*12+tod.m-1;
  const kol=S.tsinif?[S.tsinif]:(()=>{const v=[...new Set(rows.map(t=>t.sinif))];if(admin&&!v.length)return SINIFLAR.slice(1,9);return v.sort((a,b)=>sinifSira(a)-sinifSira(b))})();
  let lo=S.yil*12+8,hi=S.yil*12+17;for(const t of rows){const p=parts(t.tarih);const k=p.y*12+p.m-1;if(k<lo)lo=k;if(k>hi)hi=k}
  let h=`<table class="ttablo" style="min-width:${84+kol.length*124}px"><thead><tr><th scope="col" class="tay">Ay</th>${kol.map(c=>`<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>`;
  for(let a=lo;a<=hi;a++){const y=Math.floor(a/12),m=a%12+1;const ayRows=rows.filter(t=>{const p=parts(t.tarih);return p.y===y&&p.m===m});
    h+=`<tr class="${a===buAy?"buay":a<buAy?"gecti":""}"><th scope="row" class="tay"><b>${AYTAM[m-1]}</b><span>${y}</span></th>`;
    for(const c of kol){const hs=ayRows.filter(t=>t.sinif===c);
      h+=`<td>${hs.map(t=>{const p=parts(t.tarih);const n=daysUntil(t.tarih);const dr=durumu(t);const k=admin?secenler(t).length:0;
        const tik=!admin&&!benimSecim(t.id)&&n>=0;
        return `<button type="button" class="tcell ${dr} ${n<0?"past":""} ${t.aktif?"":"pasif"}" ${admin?`data-tedit="${t.id}"`:tik?`data-tikb="${t.id}"`:""} title="${esc(t.ad+" · "+tarihYaz(t.tarih))}">
          <span class="tgun">${p.d} ${p.ay}${!admin?(dr==="alindi"?' <i class="t-ok">✓ alındı</i>':dr==="secili"?' <i class="t-sec">seçildi</i>':""):""}</span><b>${esc(t.ad)}</b>${t.tur||admin?`<span class="tsub">${esc([t.tur,admin?k+" kurum":"",t.aktif?"":"yayında değil"].filter(Boolean).join(" · "))}</span>`:""}</button>`}).join("")}${admin?`<button type="button" class="tbos" data-tekle="${y}-${String(m).padStart(2,"0")}|${esc(c)}" aria-label="${AYTAM[m-1]} ${esc(c)} için deneme ekle">+</button>`:""}</td>`}
    h+=`</tr>`}
  return h+`</tbody></table><div class="cal-legend">${admin?"<span>Bir denemeye tıklayınca düzenlenir. Boş hücredeki <b>+</b> ile o ay ve sınıfa deneme eklersiniz.</span>":'<span><i style="background:var(--accent-soft)"></i>Sipariş verildi</span><span><i style="background:var(--warn-soft)"></i>Seçildi (henüz gönderilmedi)</span><span>Denemeye tıklayarak seçebilirsiniz.</span>'}</div>`}
function renderSecim(){
  const ids=Object.keys(S.secim).filter(id=>S.secim[id]);const ts=ids.map(id=>S.takvim.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>a.tarih.localeCompare(b.tarih));
  $("secim").innerHTML=ts.length?ts.map(t=>{const p=parts(t.tarih);return `<div class="secrow"><div><strong>${esc(t.ad)}</strong><span>${esc(t.sinif)} · ${p.d} ${p.ay} ${p.y}</span></div>
    <input type="number" min="0" inputmode="numeric" placeholder="Öğrenci" value="${S.secim[t.id]===true?"":S.secim[t.id]}" data-sogr="${t.id}" aria-label="${esc(t.ad)} öğrenci sayısı"><button type="button" class="ghost danger" data-scik="${t.id}" aria-label="Çıkar">✕</button></div>`}).join("")
    :'<div class="empty">Takvimden denemeleri işaretleyin. Seçtikleriniz burada toplanır.</div>';
  $("tsiparis").disabled=!ts.length;$("tsiparis").textContent=ts.length?`${ts.length} denemeyi sipariş et`:"Deneme seçin";
}
$("tlist").addEventListener("change",e=>{const id=e.target.dataset.tik;if(!id)return;if(e.target.checked)S.secim[id]=S.secim[id]||true;else delete S.secim[id];renderYayin()});
$("secim").addEventListener("input",e=>{const id=e.target.dataset.sogr;if(!id)return;const v=parseInt(e.target.value);S.secim[id]=v>0?v:true});
$("tum-ogr").addEventListener("change",e=>{const v=parseInt(e.target.value);if(!(v>0))return;for(const id of Object.keys(S.secim))S.secim[id]=v;renderSecim()});
$("tsiparis").onclick=async()=>{
  const rows=Object.keys(S.secim).map(id=>{const t=S.takvim.find(x=>x.id===id);return t&&{kurum_id:S.kurumId,takvim_id:t.id,tarih:t.tarih,ad:t.ad,sinif:t.sinif,ogrenci:S.secim[id]===true?null:S.secim[id],notlar:$("tnot").value.trim()||null}}).filter(Boolean);
  if(!rows.length)return;$("tsiparis").disabled=true;
  const {error}=await sb.from("denemeler").insert(rows);
  if(error){flash($("tmsg"),hataMetni(error),true);$("tsiparis").disabled=false;return}
  S.secim={};$("tnot").value="";$("tum-ogr").value="";flash($("tmsg"),rows.length+" deneme siparişi gönderildi. Durumunu Denemeler sekmesinden takip edebilirsiniz.");yukle()};
$("tg-liste").onclick=()=>{S.tgor="liste";renderYayin()};
$("tg-takvim").onclick=()=>{S.tgor="takvim";renderYayin()};
$("tg-tablo").onclick=()=>{S.tgor="tablo";renderYayin()};
$("tyil").onchange=e=>{S.yil=Number(e.target.value);S.tay=null;S.ay=null;render()};
// yönetici: takvime deneme yazma
$("tsiniflar").innerHTML=SINIFLAR.map((c,i)=>`<label class="sbox"><input type="checkbox" value="${c}" id="ts-${i}"> ${c.replace(" sınıf","")}</label>`).join("");
function tSifirla(){$("f-takvim").reset();S.tEdit=null;$("t-aktif").checked=true;$("tf-h").textContent="Takvime deneme yaz";$("t-btn").textContent="Takvime ekle";$("t-iptal").hidden=true;
  document.querySelectorAll("#tsiniflar input").forEach(c=>{c.checked=false;c.disabled=false})}
$("t-iptal").onclick=tSifirla;
$("f-takvim").addEventListener("submit",async e=>{e.preventDefault();
  const sec=[...document.querySelectorAll("#tsiniflar input:checked")].map(c=>c.value);
  if(!sec.length){flash($("t-msg"),"En az bir sınıf seçin.",true);return}
  const base={ad:$("t-ad").value.trim(),tarih:$("t-tarih").value,tur:$("t-tur").value||null,aciklama:$("t-acik").value.trim()||null,aktif:$("t-aktif").checked};
  if(!base.ad||!base.tarih)return;
  const {error}=S.tEdit?await sb.from("takvim").update({...base,sinif:sec[0]}).eq("id",S.tEdit):await sb.from("takvim").insert(sec.map(c=>({...base,sinif:c})));
  if(error){flash($("t-msg"),hataMetni(error),true);return}
  flash($("t-msg"),S.tEdit?"Güncellendi.":sec.length>1?`${sec.length} sınıf için takvime eklendi.`:"Takvime eklendi.");S.yil=egitimYili(base.tarih);tSifirla();yukle()});

// yönetici: aylık takvimde güne tıklayınca o tarihe deneme ekleme
function gunSec(ds){tSifirla();$("t-tarih").value=ds;
  if(S.tsinif)document.querySelectorAll("#tsiniflar input").forEach(c=>{c.checked=c.value===S.tsinif});
  document.querySelectorAll("#tcal .cal-day.sec").forEach(x=>x.classList.remove("sec"));const g=document.querySelector(`#tcal [data-gun="${ds}"]`);if(g)g.classList.add("sec");
  flash($("t-msg"),tarihYaz(ds)+" seçildi. Deneme adını yazıp sınıfları işaretleyin.");
  $("tp-admin").scrollIntoView({block:"start",behavior:"smooth"});$("t-ad").focus({preventScroll:true})}
document.addEventListener("click",e=>{if(e.target.closest("button"))return;const g=e.target.closest("#tcal .cal-day[data-gun]");if(g)gunSec(g.dataset.gun)});
// ---------- tıklamalar ----------
document.addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.ts!==undefined){S.tsinif=d.ts;renderYayin()}
  else if(d.tay){S.tay+=Number(d.tay);renderYayin()}
  else if(d.tikb){if(S.secim[d.tikb])delete S.secim[d.tikb];else S.secim[d.tikb]=true;renderYayin()}
  else if(d.scik){delete S.secim[d.scik];renderYayin()}
  else if(d.tedit){const t=S.takvim.find(x=>x.id===d.tedit);if(!t)return;S.tEdit=t.id;$("t-ad").value=t.ad;$("t-tarih").value=t.tarih;$("t-tur").value=t.tur||"";$("t-acik").value=t.aciklama||"";$("t-aktif").checked=t.aktif;
    document.querySelectorAll("#tsiniflar input").forEach(c=>{c.checked=c.value===t.sinif;c.disabled=c.value!==t.sinif&&false});
    $("tf-h").textContent="Takvimdeki denemeyi düzenle";$("t-btn").textContent="Güncelle";$("t-iptal").hidden=false;$("f-takvim").scrollIntoView({block:"center"});$("t-ad").focus()}
  else if(d.tgun)gunSec(d.tgun);
  else if(d.tekle){const [ay,sn]=d.tekle.split("|");tSifirla();const tod=todayStr();$("t-tarih").value=tod.slice(0,7)===ay?tod:ay+"-01";
    document.querySelectorAll("#tsiniflar input").forEach(c=>{c.checked=c.value===sn});
    flash($("t-msg"),AYTAM[Number(ay.slice(5))-1]+" · "+sn+" seçildi. Günü düzeltip deneme adını yazın.");$("tp-admin").scrollIntoView({block:"start",behavior:"smooth"});$("t-ad").focus({preventScroll:true})}
  else if(d.tsil){S.confirm="t"+d.tsil;renderYayin()}
  else if(d.tsilok){S.confirm=null;const {error}=await sb.from("takvim").delete().eq("id",d.tsilok);if(error)flash($("t-msg"),hataMetni(error),true);yukle()}
  else if(d.sekme){S.sekme=d.sekme;S.confirm=null;render();window.scrollTo({top:0})}
  else if(d.satsil!==undefined){S.satirlar.splice(Number(d.satsil),1);renderSiparis()}
  else if(d.sform){const x=S.siparisler.find(y=>y.id===d.sform);if(x)formAc(x)}
  else if(d.sformyeni){if(S.sonSiparis)formAc(S.siparisler.find(y=>y.id===S.sonSiparis.id)||S.sonSiparis)}
  else if(d.sgor)sipGorunum(d.sgor);
  else if(d.ssil){S.confirm="s"+d.ssil;renderSiparis()}
  else if(d.ssilok){S.confirm=null;const {error}=await sb.from("siparisler").delete().eq("id",d.ssilok);if(error)flash($("sf-msg"),hataMetni(error),true);yukle()}
  else if(d.uedit){const u=S.urunler.find(x=>x.id===d.uedit);if(!u)return;S.uEdit=u.id;$("u-ad").value=u.ad;$("u-kat").value=u.kategori||"";$("u-birim").value=u.birim;
    $("u-fiyat").value=u.fiyat??"";$("u-acik").value=u.aciklama||"";$("u-aktif").checked=u.aktif;$("u-btn").textContent="Güncelle";$("uf-h").textContent="Ürünü düzenle";$("u-iptal").hidden=false;$("u-ad").focus()}
  else if(d.usil){S.confirm="u"+d.usil;renderUrunler()}
  else if(d.usilok){S.confirm=null;const {error}=await sb.from("urunler").delete().eq("id",d.usilok);if(error)flash($("u-msg"),hataMetni(error),true);yukle()}
  else if(d.m){const [yy,mm]=d.m.split("-").map(Number);if(S.gorunum==="takvim"){S.ay=yy*12+mm-1;render()}else{const el=document.getElementById("m-"+d.m);if(el)el.scrollIntoView({block:"start"})}}
  else if(d.ay){S.ay+=Number(d.ay);render()}
  else if(d.onay||d.iptal){const {error}=await sb.from("denemeler").update({durum:d.onay?"onaylandi":"iptal"}).eq("id",d.onay||d.iptal);if(error)flash($("msg"),hataMetni(error),true);yukle()}
  else if(d.edit){const x=S.denemeler.find(y=>y.id===d.edit);if(!x)return;S.editId=x.id;S.editKurum=x.kurum_id;
    $("tarih").value=x.tarih;$("ad").value=x.ad||"";$("sinif").value=x.sinif||"";$("ogrenci").value=x.ogrenci??"";$("notlar").value=x.notlar||"";
    if(S.rol==="admin")$("fkurum").value=x.kurum_id;
    $("form-h").textContent="Denemeyi düzenle";$("kaydet").textContent="Güncelle";$("iptal").hidden=false;$("f").scrollIntoView({block:"center"});$("tarih").focus()}
  else if(d.del){S.confirm=d.del;render()}
  else if(d.delno){S.confirm=null;render()}
  else if(d.delok){S.confirm=null;const {error}=await sb.from("denemeler").delete().eq("id",d.delok);if(error)flash($("msg"),hataMetni(error),true);yukle()}
  else if(d.kac){S.secili=d.kac;S.confirm=null;render();$("takvim-h").scrollIntoView({block:"start"})}
  else if(d.kedit){const k=S.kurumlar.find(y=>y.id===d.kedit);if(!k)return;kEdit=k.id;$("k-ad").value=k.ad;$("k-email").value=k.email;$("k-tel").value=k.telefon||"";$("k-yetkili").value=k.yetkili||"";
    $("k-btn").textContent="Güncelle";$("k-iptal").hidden=false;$("p-kurumlar").open=true;$("k-ad").focus()}
  else if(d.kdel){S.confirm="k"+d.kdel;renderKurumlar()}
  else if(d.kdelok){S.confirm=null;const {error}=await sb.from("kurumlar").delete().eq("id",d.kdelok);if(error)flash($("k-msg"),hataMetni(error),true);yukle()}
});
setInterval(()=>{if(S.rol)render()},60*60*1000);

basla();

// Bazı görüntüleyiciler (uygulama içi önizleme, sandbox) form gönderimini engeller.
// Düğme ve Enter tuşunu doğrudan bizim işleyicimize bağla.
function formuGonder(form){if(!form.checkValidity()){form.reportValidity();return}
  form.dispatchEvent(new Event("submit",{cancelable:true}))}
document.addEventListener("click",e=>{const b=e.target.closest('button[type="submit"]');if(!b||!b.form)return;e.preventDefault();formuGonder(b.form)},true);
document.addEventListener("keydown",e=>{if(e.key!=="Enter"||e.isComposing)return;const el=e.target;if(!el.form||el.tagName!=="INPUT")return;e.preventDefault();formuGonder(el.form)},true);
