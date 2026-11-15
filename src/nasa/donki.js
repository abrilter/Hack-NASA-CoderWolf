// Conexión con NASA DONKI. Dueño: Rol 4.
// Lee: la API DONKI de la NASA · Escribe: nada (devuelve la CME más rápida o null).
// TODO(Rol 4): poner la clave gratis de https://api.nasa.gov
const API_KEY = "DEMO_KEY";

// Devuelve la CME más rápida de los últimos `dias` días, o null si falla.
export async function cmeReciente(dias = 30) {
  const fin = new Date();
  const inicio = new Date(fin - dias * 864e5);
  const url = `https://api.nasa.gov/DONKI/CMEAnalysis?startDate=${dia(inicio)}&endDate=${dia(fin)}` +
              `&mostAccurateOnly=true&api_key=${API_KEY}`;
  try {
    const lista = await pedir(url);
    const conVelocidad = lista.filter(c => c.speed > 0);
    if (!conVelocidad.length) return null;
    const top = conVelocidad.reduce((a, b) => (b.speed > a.speed ? b : a));
    return {
      fecha: (top.time21_5 || "").slice(0, 10),
      velocidad_kms: top.speed,
      fuente: "NASA DONKI – CMEAnalysis",
      link: top.link || "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
      ejemplo: false
    };
  } catch (e) {
    console.warn("[DONKI] sin conexión, se usan datos guardados", e);
    return null;
  }
}

async function pedir(url) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), 8000);
  try {
    const r = await fetch(url, { signal: control.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  } finally { clearTimeout(t); }
}

const dia = d => d.toISOString().slice(0, 10);
