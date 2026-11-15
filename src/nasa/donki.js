// Conexión con NASA DONKI. Dueño: Rol 4.
// Lee: la API DONKI de la NASA · Escribe: nada (devuelve qué encontró).
// Clave gratis del equipo (https://api.nasa.gov): 1000 consultas por hora.
// DEMO_KEY se agota enseguida si muchos juegan desde la misma red.
const API_KEY = "6qLgJzdjLqRfwfhC9KBFLC9Dhtkw8Wjq8PN7mFtq";
const ESPERA_MAX = 8000;   // ms: si la NASA no contesta, se usa el respaldo

// Busca la nube (CME) más rápida de los últimos `dias` días.
// Devuelve uno de estos:
//   { estado: "ok", cme }        → hay una nube de al menos `minima` km/s
//   { estado: "tranquilo", mas } → la NASA contestó, pero no hubo nubes rápidas (mas = la más rápida, si hubo)
//   { estado: "error" }          → sin conexión, la NASA tardó demasiado o no dejó consultar
export async function cmeReciente(dias = 30, minima = 0) {
  const fin = new Date();
  const inicio = new Date(fin - dias * 864e5);
  const url = `https://api.nasa.gov/DONKI/CMEAnalysis?startDate=${dia(inicio)}&endDate=${dia(fin)}` +
              `&mostAccurateOnly=true&api_key=${API_KEY}`;
  try {
    const lista = (await pedir(url)).filter(c => c.speed > 0);
    if (!lista.length) return { estado: "tranquilo", mas: null };
    const top = lista.reduce((a, b) => (b.speed > a.speed ? b : a));
    const cme = {
      fecha: (top.time21_5 || "").slice(0, 10),
      velocidad_kms: Math.round(top.speed),
      fuente: "NASA DONKI – CMEAnalysis",
      link: top.link || "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
      ejemplo: false
    };
    return top.speed >= minima ? { estado: "ok", cme } : { estado: "tranquilo", mas: cme };
  } catch (e) {
    console.warn("[DONKI] sin respuesta, se usa el respaldo", e?.message || e);
    return { estado: "error" };
  }
}

async function pedir(url) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), ESPERA_MAX);
  try {
    const r = await fetch(url, { signal: control.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = await r.json();
    if (!Array.isArray(json)) throw new Error("respuesta inesperada");
    return json;
  } finally { clearTimeout(t); }
}

const dia = d => d.toISOString().slice(0, 10);
