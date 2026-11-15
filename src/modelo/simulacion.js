// ===========================================================================
// MODELO DE SIMULACIÓN. Dueño: Rol 4.
// Calcula opciones y consecuencias con los datos reales + elecciones previas.
// Regla: ninguna opción gratis; los números NASA vienen de datos.json/DONKI.
// Los números de balance están en config.js (trajes, naves, mochila) y en
// datos.json → "modelo". Se verifican con pruebas/balance.html.
// ===========================================================================
const KM_SOL_TIERRA = 149_600_000;

// Horas que tarda la nube (CME) en llegar desde el Sol: distancia ÷ velocidad
export function horasDeLlegada(velocidadKms) {
  return KM_SOL_TIERRA / velocidadKms / 3600;
}

// Horas que faltan para la tormenta cuando ya aterrizaste: a la llegada de la
// CME se le restan las horas de vuelo de la nave (la grande es más lenta).
export function horasTormentaAlAterrizar(datos, estado) {
  return horasDeLlegada(datos.cme.velocidad_kms) - (estado.nave?.horasViaje ?? 0);
}

// Qué parte de la radiación se bloquea (0 = nada, 0.9 = casi todo)
export function proteccion(estado) {
  const traje = estado.traje?.proteccion || 0;
  const extra = estado.lleva("escudo") ? 0.2 : 0;           // objeto de la mochila
  return Math.min(0.9, (estado.escudo / 100) * 0.5 + traje + extra);
}

// Horas que tarda el rover en recorrer una ruta (más lento en lo oscuro sin linterna)
function tramo(ruta, datos, estado) {
  const oscuro = ruta.oscura && !estado.lleva("linterna");
  const horas = (ruta.km / datos.rover.kmh + ruta.subida_m / 500) * (oscuro ? datos.modelo.factor_oscuro : 1);
  return { horas, oscuro };
}

// Opciones de la escena Ruta: cada ruta de datos.json y refugiarse.
// Devuelve números (horas, efectos); los textos los arma la escena.
export function opcionesDeRuta(datos, estado) {
  const M = datos.modelo;
  const hT = horasTormentaAlAterrizar(datos, estado);
  const D = M.duracion_tormenta_h;
  const gastoO2 = estado.traje?.gastoO2 || 2;                // O2 por hora
  const dosisHora = datos.radiacion.dosis_juego_por_hora * (1 - proteccion(estado));

  const rutas = datos.rutas.map(r => {
    const { horas: hR, oscuro } = tramo(r, datos, estado);
    // solo cuenta el tiempo bajo la tormenta, y la tormenta dura D horas
    const expuesto = Math.min(D, Math.max(0, hR - hT));
    return {
      id: r.id, nombre: r.nombre, km: r.km, hR, hT, expuesto, oscuro,
      efectos: {
        oxigeno: -Math.round(hR * gastoO2 + r.subida_m / 100),
        radiacion: Math.round(expuesto * dosisHora)
      }
    };
  });

  // Refugiarse: esperar a que llegue y pase la tormenta (en reposo se respira
  // menos) y después ir por la ruta segura. Sin comida, la espera cansa más.
  const segura = datos.rutas.find(r => r.id === M.ruta_tras_refugio) || datos.rutas[datos.rutas.length - 1];
  const espera = Math.max(0, hT) + D;
  const { horas: hCamino } = tramo(segura, datos, estado);
  const sinComida = !estado.lleva("comida");
  rutas.push({
    id: "refugio", espera, rutaDespues: segura.nombre, hR: espera + hCamino, hT, expuesto: 0, sinComida,
    efectos: {
      oxigeno: -Math.round(espera * gastoO2 * M.reposo + hCamino * gastoO2 + segura.subida_m / 100
                           + (sinComida ? M.sin_comida_o2 : 0)),
      radiacion: 0
    }
  });
  return rutas;
}

// Costos del Rescate: reparar la radio (más caro sin el kit) y, sin botiquín,
// Itzel está herida y el regreso es más lento.
export function costosRescate(datos, estado, repararRadio) {
  const M = datos.modelo;
  let oxigeno = 0;
  if (repararRadio) oxigeno -= estado.lleva("radio") ? M.radio_con_kit_o2 : M.radio_sin_kit_o2;
  if (!estado.lleva("botiquin")) oxigeno -= M.sin_botiquin_o2;
  return { oxigeno };
}

// Aplica los efectos de una decisión con los mismos límites para todos
// (estado.cambiar en estado.js). Ej.: aplicar(estado, { oxigeno: -10, escudo: 30 })
export function aplicar(estado, efectos) {
  for (const [recurso, delta] of Object.entries(efectos)) if (delta) estado.cambiar(recurso, delta);
}

// Frase de Chispa explicando el resultado (plantillas en textos.json → ruta)
export function explicar(op, t) {
  const n = x => Math.max(0, Math.round(x));
  const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  let frase;
  if (op.id === "refugio") {
    frase = llenar(t.refugio, { espera: n(op.espera), ruta: op.rutaDespues.toLowerCase() });
    if (op.sinComida) frase += t.sin_comida;
  } else if (op.expuesto <= 0) {
    frase = llenar(t.antes, { hT: n(op.hT), hR: n(op.hR), dif: n(op.hT - op.hR) });
  } else {
    frase = llenar(t.expuestos, { hT: n(op.hT), hR: n(op.hR), exp: n(op.expuesto) });
  }
  if (op.oscuro) frase += t.sin_linterna;
  return frase;
}
