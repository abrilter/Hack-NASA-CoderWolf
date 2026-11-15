// Barra de pruebas para el equipo (los niños no la ven). Dueño: Rol 1.
// Aparece solo si la dirección lleva ?dev=1, o en modo prueba (?escena=...):
//   index.html?dev=1&sinred=1
// Botones: ◀ escena anterior · Saltar ▶ (siguen el orden de la historia, ORDEN
// en config.js) y una lista para ir directo a cualquier escena registrada.
// Al saltar, si faltan traje, nave o mochila se usan los valores de prueba, y si
// el oxígeno llegó a 0 se recarga, para poder seguir probando.
import { ORDEN, TRAJES, NAVES } from "./config.js";
import { estado } from "./estado.js";

const ESTILO = "font:12px monospace;cursor:pointer;background:#1d2650;color:#eef1ff;" +
  "border:1px solid #4fd1ff;border-radius:3px;padding:2px 6px";

export function barraDePruebas(juego) {
  const p = new URLSearchParams(location.search);
  if (!p.has("dev") && !p.has("escena")) return;

  const caja = document.createElement("div");
  caja.id = "barra-pruebas";
  caja.style.cssText = "position:fixed;top:6px;right:6px;z-index:10;display:flex;flex-wrap:wrap;" +
    "gap:4px;align-items:center;max-width:calc(100vw - 12px);font:12px monospace;color:#eef1ff;" +
    "background:rgba(11,16,38,.88);border:1px solid #4fd1ff;border-radius:4px;padding:4px 6px";

  const etiqueta = document.createElement("span");
  etiqueta.style.cssText = "min-width:13ch;color:#ffcd75";

  // los botones sueltan el foco al tocarlos: así Espacio/Enter siguen siendo del juego
  const boton = (txt, titulo, fn) => {
    const b = document.createElement("button");
    b.textContent = txt; b.title = titulo; b.style.cssText = ESTILO;
    b.onclick = () => { fn(); b.blur(); };
    return b;
  };

  const lista = document.createElement("select");
  lista.style.cssText = ESTILO;
  lista.title = "Ir directo a una escena";
  let todas = [];
  // la lista se arma cuando el juego ya registró sus escenas
  const llenarLista = () => {
    todas = Object.keys(juego.scene.keys).filter(k => k !== "Carga");
    const fuera = todas.filter(k => !ORDEN.includes(k));
    lista.replaceChildren();
    [...ORDEN.map((k, i) => [k, `${i + 1}. ${k}`]), ...fuera.map(k => [k, `· ${k} (fuera del recorrido)`])]
      .filter(([k]) => todas.includes(k))
      .forEach(([k, txt]) => { const o = document.createElement("option"); o.value = k; o.textContent = txt; lista.append(o); });
  };
  lista.onchange = () => { ir(lista.value); lista.blur(); };

  const actual = () => juego.scene.getScenes(true).map(s => s.scene.key).find(k => k !== "Carga");

  function ir(destino) {
    if (!juego.scene.keys[destino] || !estado.datos) return;
    completarEstado();
    // el cráter helado solo se juega si se eligió esa ruta: al saltar sin haber
    // elegido, se cuenta como cráter para poder verlo
    if (destino === "CraterHelado" && !estado.misiones.ruta) estado.misiones.ruta = { id: "crater" };
    juego.scene.getScenes(true).forEach(s => juego.scene.stop(s.scene.key));
    juego.scene.start(destino);
    console.info(`[pruebas] saltar a ${destino}`);
  }

  function mover(paso) {
    const i = ORDEN.indexOf(actual());
    const j = i < 0 ? (paso > 0 ? ORDEN.length - 1 : 0) : Math.max(0, Math.min(ORDEN.length - 1, i + paso));
    ir(ORDEN[j]);
  }

  caja.append(etiqueta, boton("◀", "Escena anterior", () => mover(-1)),
    boton("Saltar ▶", "Siguiente escena de la historia", () => mover(1)), lista);
  document.body.append(caja);

  // muestra en qué escena estás y el oxígeno
  setInterval(() => {
    if (!lista.options.length && Object.keys(juego.scene.keys).length > 1) llenarLista();
    const k = actual() || "—";
    etiqueta.textContent = `${k} · O2 ${Math.round(estado.oxigeno)}`;
    if (document.activeElement !== lista && todas.includes(k)) lista.value = k;
  }, 300);
}

// Lo mínimo para que cualquier escena abra aunque no se haya pasado por las anteriores
function completarEstado() {
  if (!estado.nombreClave) estado.nombreClave = "Cometa";
  if (!estado.traje) estado.traje = TRAJES.find(t => t.id === "ligero");
  if (!estado.nave) estado.nave = NAVES.find(n => n.id === "pequena");
  if (!estado.mochila?.length) estado.mochila = ["oxigeno", "escudo"];
  if (estado.oxigeno <= 0) estado.oxigeno = 100;
  if (estado.radiacion >= 100) estado.radiacion = 0;
}
