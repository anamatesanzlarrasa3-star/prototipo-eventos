/* Eventos Cerca - Prototipo (SPA simple con rutas hash) */
const $ = (sel) => document.querySelector(sel);

const SCREENS = {
  eventos: $("#screenEventos"),
  buscar: $("#screenBuscar"),
  detalle: $("#screenDetalle"),
  milista: $("#screenMiLista"),
  perfil: $("#screenPerfil"),
};

const tabs = Array.from(document.querySelectorAll(".tab"));
function setCurrentTab(route){
  tabs.forEach(t=>{
    const is = t.dataset.route === route;
    t.setAttribute("aria-current", is ? "page" : "false");
    if(!is) t.removeAttribute("aria-current");
  });
}

function showScreen(route){
  Object.values(SCREENS).forEach(s => s.hidden = true);
  (SCREENS[route] || SCREENS.eventos).hidden = false;
  setCurrentTab(route);
  // mover el foco al main para lectores de pantalla
  $("#main").focus();
}

function route(){
  const hash = location.hash || "#/eventos";
  const [, r, id] = hash.split("/");
  if(r === "detalle" && id){
    openDetail(id);
    showScreen("detalle");
    return;
  }
  showScreen(r || "eventos");
}

window.addEventListener("hashchange", route);


/* Chips de filtros rapidos (Hoy / Semana / Gratis / Cerca) */
const chips = Array.from(document.querySelectorAll("[data-quick]"));
function syncChips(){
  chips.forEach(btn=>{
    const k = btn.getAttribute("data-quick");
    let pressed = false;
    if(k === "hoy") pressed = state.when === "hoy";
    if(k === "semana") pressed = state.when === "semana";
    if(k === "gratis") pressed = !!state.freeOnly;
    if(k === "cerca") pressed = !!state.nearOnly;
    btn.classList.toggle("chip--active", pressed);
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  });
}
chips.forEach(btn=>{
  btn.setAttribute("aria-pressed","false");
  btn.addEventListener("click", ()=>{
    const k = btn.getAttribute("data-quick");
    if(k === "hoy"){
      state.when = (state.when === "hoy") ? "cualquiera" : "hoy";
    } else if(k === "semana"){
      state.when = (state.when === "semana") ? "cualquiera" : "semana";
    } else if(k === "gratis"){
      state.freeOnly = !state.freeOnly;
    } else if(k === "cerca"){
      state.nearOnly = !state.nearOnly;
    }
    // reflejar en formulario de Buscar
    $("#fWhen").value = state.when;
    renderEvents();
    syncChips();
    announce("Filtros rapidos actualizados.");
  });
});
/* Datos demo */
const EVENTS = [
  { id:"e1", title:"Concierto: Mar de Fuego", category:"musica", when:"semana", dateLabel:"Vie 19:30", price:"12€", place:"Sala Prisma", distance:"1,2 km",
    desc:"Banda de rock alternativo con invitados. Apertura de puertas 18:45.",
    a11y:"Acceso sin escalones · Bucle magnético (platea) · Baños accesibles" },
  { id:"e2", title:"Teatro: La Casa Abierta", category:"teatro", when:"semana", dateLabel:"Sáb 20:00", price:"18€", place:"Teatro Central", distance:"2,4 km",
    desc:"Drama contemporáneo en 2 actos. Duración 105 min.",
    a11y:"Zona PMR · Subtítulos en sesión seleccionada" },
  { id:"e3", title:"Exposición: Luz y Materia", category:"exposicion", when:"mes", dateLabel:"Dom 11:00", price:"Gratis", place:"Museo Norte", distance:"3,1 km",
    desc:"Instalaciones inmersivas de arte y ciencia. Último acceso 18:00.",
    a11y:"Ascensor · Folleto en lectura fácil" },
  { id:"e4", title:"Cine fórum: Europa 90", category:"cine", when:"hoy", dateLabel:"Hoy 21:15", price:"7€", place:"Cines Verdi", distance:"0,8 km",
    desc:"Proyección + coloquio con invitado. Idioma original subtitulado.",
    a11y:"Subtítulos · Bucle magnético en sala 2" },
];

/* Estado (filtros) */
const state = {
  q: "",
  category: "todas",
  when: "cualquiera",
  city: "",
  radius: 5,
  freeOnly: false,
  nearOnly: false
};

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem("ec_filters") || "null");
    if(saved && typeof saved === "object") Object.assign(state, saved);
  }catch(_){}
}
function saveState(){ localStorage.setItem("ec_filters", JSON.stringify(state)); }

/* Mi lista */
function getMyList(){
  try{ return JSON.parse(localStorage.getItem("ec_mylist") || "[]"); }catch(_){ return []; }
}
function setMyList(list){ localStorage.setItem("ec_mylist", JSON.stringify(list)); renderMyList(); }
function addToMyList(id){
  const list = getMyList();
  if(!list.includes(id)) list.push(id);
  setMyList(list);
}
function removeFromMyList(id){
  const list = getMyList().filter(x => x!==id);
  setMyList(list);
}

function matchEvent(ev){
  const q = state.q.trim().toLowerCase();
  if(q){
    const hay = (ev.title + " " + ev.place).toLowerCase();
    if(!hay.includes(q)) return false;
  }
  if(state.category !== "todas" && ev.category !== state.category) return false;
  if(state.when !== "cualquiera"){
    if(state.when === "hoy" && ev.when !== "hoy") return false;
    if(state.when === "semana" && !(ev.when === "hoy" || ev.when === "semana")) return false;
    if(state.when === "mes" && !(ev.when === "hoy" || ev.when === "semana" || ev.when === "mes")) return false;
  }
  if(state.freeOnly && ev.price !== "Gratis") return false;
  if(state.nearOnly){
    const num = parseFloat(String(ev.distance).replace(",", "."));
    if(!isNaN(num) && num > 2.0) return false;
  }
  // ciudad y radio: se simula (prototipo)
  return true;
}

function renderEvents(){
  const list = $("#eventsList");
  list.innerHTML = "";
  const filtered = EVENTS.filter(matchEvent);
  $("#resultsCount").textContent = `${filtered.length} resultados`;

  for(const ev of filtered){
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <div class="thumb" aria-hidden="true">IMG</div>
      <div>
        <h2>${escapeHtml(ev.title)}</h2>
        <p class="muted">${escapeHtml(ev.dateLabel)} · ${escapeHtml(ev.price)} · <span class="badge">${labelCategory(ev.category)}</span></p>
        <p>${escapeHtml(ev.place)} · ${escapeHtml(ev.distance)}</p>
        <div class="row" style="margin-top:8px">
          <a class="btn" href="#/detalle/${encodeURIComponent(ev.id)}">Ver detalle</a>
          <button class="btn btn--secondary" type="button" data-add="${ev.id}">Añadir</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  }

  syncChips();

  list.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const id = e.currentTarget.getAttribute("data-add");
      addToMyList(id);
      announce("Añadido a Mi lista.");
    });
  });
}

function labelCategory(cat){
  return ({musica:"Música", teatro:"Teatro", exposicion:"Exposición", cine:"Cine"})[cat] || "Evento";
}

/* Detalle */
let currentId = null;
function openDetail(id){
  currentId = id;
  const ev = EVENTS.find(e => e.id === id);
  if(!ev) return;

  $("#dTitle").textContent = ev.title;
  $("#dMeta").textContent = `${ev.dateLabel} · ${ev.price} · ${labelCategory(ev.category)}`;
  $("#dPlace").textContent = `${ev.place} · ${ev.distance}`;
  $("#dDesc").textContent = ev.desc;
  $("#dA11y").textContent = ev.a11y;
}

$("#btnAdd").addEventListener("click", ()=>{
  if(currentId){ addToMyList(currentId); announce("Añadido a Mi lista."); }
});
$("#btnReserve").addEventListener("click", ()=>{
  // reserva simulada
  announce("Reserva simulada: en una app real se abriría el flujo de compra.");
  alert("Reserva simulada. (Prototipo)");
});

/* Filtros */
loadState();
$("#q").value = state.q;
$("#fCategory").value = state.category;
$("#fWhen").value = state.when;
$("#fCity").value = state.city;
$("#fRadius").value = state.radius;

$("#q").addEventListener("input", (e)=>{
  state.q = e.target.value;
  saveState();
  renderEvents();
});

$("#btnGoSearch").addEventListener("click", ()=> location.hash = "#/buscar");
$("#btnPreview").addEventListener("click", ()=> location.hash = "#/eventos");

$("#btnClear").addEventListener("click", ()=>{
  state.q = "";
  state.category = "todas";
  state.when = "cualquiera";
  state.city = "";
  state.radius = 5;
  saveState();
  $("#q").value = "";
  $("#fCategory").value = state.category;
  $("#fWhen").value = state.when;
  $("#fCity").value = state.city;
  $("#fRadius").value = state.radius;
  renderEvents();
  announce("Filtros borrados.");
});

$("#filtersForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  state.category = $("#fCategory").value;
  state.when = $("#fWhen").value;
  state.city = $("#fCity").value.trim();
  state.radius = Number($("#fRadius").value || 5);
  saveState();
  renderEvents();
  location.hash = "#/eventos";
  announce("Filtros aplicados.");
});

/* Mi lista */
function renderMyList(){
  const ul = $("#myList");
  ul.innerHTML = "";
  const ids = getMyList();
  if(ids.length === 0){
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `<div><strong>No hay eventos guardados.</strong><div class="muted">Añade desde el listado o el detalle.</div></div>`;
    ul.appendChild(li);
    return;
  }

  for(const id of ids){
    const ev = EVENTS.find(e => e.id === id);
    if(!ev) continue;
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `
      <div>
        <div style="font-weight:900">${escapeHtml(ev.title)}</div>
        <div class="muted">${escapeHtml(ev.dateLabel)} · ${escapeHtml(ev.place)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end">
        <a class="btn btn--secondary" href="#/detalle/${encodeURIComponent(ev.id)}">Ver</a>
        <button class="danger" type="button" data-remove="${ev.id}">Quitar</button>
      </div>
    `;
    ul.appendChild(li);
  }

  ul.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      removeFromMyList(e.currentTarget.getAttribute("data-remove"));
      announce("Eliminado de Mi lista.");
    });
  });
}
renderMyList();

$("#btnExport").addEventListener("click", ()=>{
  const ids = getMyList();
  const payload = ids.map(id => EVENTS.find(e => e.id === id)).filter(Boolean);
  $("#exportOut").hidden = false;
  $("#exportOut").textContent = JSON.stringify(payload, null, 2);
  announce("Lista exportada.");
});

/* Preferencias (alto contraste / reducir motion) */
const highContrast = $("#pHighContrast");
const reduceMotion = $("#pReduceMotion");

function applyPrefs(){
  document.documentElement.classList.toggle("high-contrast", highContrast.checked);
  document.documentElement.classList.toggle("reduce-motion", reduceMotion.checked);
  if(reduceMotion.checked){
    document.documentElement.style.scrollBehavior = "auto";
  } else {
    document.documentElement.style.scrollBehavior = "";
  }
  localStorage.setItem("ec_prefs", JSON.stringify({hc:highContrast.checked, rm:reduceMotion.checked}));
}

try{
  const prefs = JSON.parse(localStorage.getItem("ec_prefs") || "null");
  if(prefs){
    highContrast.checked = !!prefs.hc;
    reduceMotion.checked = !!prefs.rm;
  }
}catch(_){}
applyPrefs();
highContrast.addEventListener("change", applyPrefs);
reduceMotion.addEventListener("change", applyPrefs);

/* Dialogo opcional */
const dlg = $("#searchDialog");
$("#btnOpenSearch").addEventListener("click", ()=>{
  if(typeof dlg.showModal === "function") dlg.showModal();
  else location.hash = "#/buscar";
});

/* Util */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function announce(msg){
  // aria-live sencillo usando el contador de resultados como región viva
  const el = $("#resultsCount");
  const prev = el.textContent;
  el.textContent = msg;
  setTimeout(()=>{ el.textContent = prev; }, 900);
}

/* init */
renderEvents();
route();