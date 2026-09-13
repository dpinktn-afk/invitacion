const WEDDING_DATE = new Date("2027-01-09T17:00:00-06:00");

const $ = (s) => document.querySelector(s);

function tick(){
  const now = new Date(), diff = Math.max(0, WEDDING_DATE-now);
  const d=Math.floor(diff/86400000), h=Math.floor(diff/3600000)%24, m=Math.floor(diff/60000)%60, s=Math.floor(diff/1000)%60;
  $("#days").textContent=d; $("#hours").textContent=h; $("#minutes").textContent=m; $("#seconds").textContent=s;
}
setInterval(tick,1000); tick();

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.details === 'string' ? data.details : data.details?.message || data.details?.error || data.details?.hint || '';
    const status = data.supabaseStatus ? ` (Supabase ${data.supabaseStatus})` : '';
    throw new Error((data.error || 'No se pudo completar la operación.') + (detail ? `\n${detail}` : '') + status);
  }
  return data;
}

async function getGuests(pin) {
  const data = await apiRequest('/api/rsvp', { headers: { 'x-admin-pin': pin } });
  return data.guests || [];
}

async function submitGuest(data) {
  return apiRequest('/api/rsvp', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function renderGuests(pin) {
  const list = await getGuests(pin);
  const c = list.filter(x => x.asistencia === 'confirmed').length;
  const p = list.filter(x => x.asistencia === 'pending').length;
  const d = list.filter(x => x.asistencia === 'declined').length;
  const people = list.filter(x => x.asistencia === 'confirmed').reduce((sum, x) => sum + Number(x.personas || 0), 0);
  $("#confirmedCount").textContent = c;
  $("#pendingCount").textContent = p;
  $("#declinedCount").textContent = d;
  $("#guestList").innerHTML = list.length
    ? list.map(x => `<div class="guest ${escapeHtml(x.asistencia)}"><span><b>${escapeHtml(x.nombre)}</b><br>${escapeHtml(x.contacto)} · ${Number(x.personas || 1)} invitado(s)</span><span>${x.asistencia === "confirmed" ? "CONFIRMADO" : x.asistencia === "pending" ? "PENDIENTE" : "NO ASISTE"}</span></div>`).join("")
    : "<p>No hay registros todavía.</p>";
  const totalPeople = document.querySelector('#totalPeople');
  if(totalPeople) totalPeople.textContent = people;
  return list;
}

let adminPin = '';

const rsvpModal = $("#rsvpModal");
const openRsvp = () => {
  rsvpModal.classList.remove("hidden");
  rsvpModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  rsvpModal.querySelector("input")?.focus();
};
const closeRsvp = () => {
  rsvpModal.classList.add("hidden");
  rsvpModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};
document.querySelectorAll("[data-open-rsvp]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    openRsvp();
  });
});
$("#rsvpClose").addEventListener("click", closeRsvp);
rsvpModal.addEventListener("click", e => { if(e.target === rsvpModal) closeRsvp(); });
document.addEventListener("keydown", e => { if(e.key === "Escape" && !rsvpModal.classList.contains("hidden")) closeRsvp(); });

$("#rsvpForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  const data = Object.fromEntries(new FormData(form).entries());
  data.guests = Number(data.guests || 1);

  button.disabled = true;
  button.textContent = 'Guardando…';
  try {
    await submitGuest(data);
    form.classList.add("hidden");
    const label = {
      confirmed: "¡Qué alegría! Tu asistencia quedó registrada.",
      pending: "Gracias. Guardamos tu respuesta como pendiente.",
      declined: "Gracias por avisarnos. Te vamos a extrañar."
    }[data.status];
    $("#rsvpSuccess").innerHTML = `<strong>${label}</strong><br><span>Gracias, ${escapeHtml(data.name)}. Tu respuesta quedó guardada correctamente.</span>`;
    $("#rsvpSuccess").classList.remove("hidden");
  } catch (error) {
    alert(error.message || 'No pudimos guardar tu confirmación. Intenta nuevamente.');
    button.disabled = false;
    button.textContent = originalText;
  }
});

$("#adminOpen").onclick=()=>{
  $("#adminModal").classList.remove("hidden");
  $("#dashboard").classList.add("hidden");
  $("#loginBox").classList.remove("hidden");
  $("#pin").value = '';
};
$("#adminClose").onclick=()=>$("#adminModal").classList.add("hidden");
$("#adminModal").addEventListener("click",e=>{if(e.target.id==="adminModal")$("#adminModal").classList.add("hidden")});
$("#loginBtn").onclick=async()=>{
  const pin = $("#pin").value.trim();
  if(!pin){alert("Escribe el PIN.");return}
  const button = $("#loginBtn");
  button.disabled = true;
  try {
    await renderGuests(pin);
    adminPin = pin;
    $("#loginBox").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
  } catch (error) {
    alert(error.message === 'No autorizado.' ? 'PIN incorrecto' : error.message);
  } finally {
    button.disabled = false;
  }
};

$("#clearData").onclick=async()=>{
  if(!adminPin) return;
  if(confirm("¿Borrar todos los registros? Esta acción no se puede deshacer.")){
    try {
      await apiRequest('/api/rsvp', { method:'DELETE', headers:{ 'x-admin-pin': adminPin } });
      await renderGuests(adminPin);
    } catch(error) {
      alert(error.message || 'No se pudieron borrar los registros.');
    }
  }
};

function escapeHtml(s){return String(s ?? '').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

const DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/1hJ7FSytunVJSdfxARi-APj75VwqlHfYe?usp=sharing";
$("#driveButton").href=DRIVE_FOLDER_URL;

const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{ if(entry.isIntersecting){entry.target.classList.add("visible"); revealObserver.unobserve(entry.target)} });
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));
window.addEventListener("scroll",()=>document.querySelector(".nav")?.classList.toggle("scrolled",window.scrollY>20),{passive:true});


const copyGiftData = document.querySelector("#copyGiftData");
if(copyGiftData){
  copyGiftData.addEventListener("click", async ()=>{
    const text = "Banco: Santander\nTitular: Janette Vianey de la Cruz Meléndez\nCuenta CLABE: 014910140247000485\nTarjeta: 5579083046924409";
    try{
      await navigator.clipboard.writeText(text);
      const original = copyGiftData.textContent;
      copyGiftData.textContent = "¡Datos copiados! ✓";
      setTimeout(()=>copyGiftData.textContent=original,1800);
    }catch{
      alert(text);
    }
  });
}

// Microinteracciones elegantes
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!prefersReduced){
  window.addEventListener('mousemove',(e)=>{
    const art=document.querySelector('.hero-art');
    if(!art || window.innerWidth<801) return;
    const x=(e.clientX/window.innerWidth-.5)*5, y=(e.clientY/window.innerHeight-.5)*5;
    art.style.transform=`translate(${x}px,${y}px)`;
  },{passive:true});
  document.querySelectorAll('.gift-details div').forEach((el,i)=>{
    el.style.transition=`transform .5s cubic-bezier(.2,.75,.2,1) ${i*45}ms, background .3s ease`;
    el.addEventListener('mouseenter',()=>el.style.transform='translateX(5px)');
    el.addEventListener('mouseleave',()=>el.style.transform='');
  });
}
