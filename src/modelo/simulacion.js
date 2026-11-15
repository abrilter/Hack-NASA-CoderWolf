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
    // parte_escena: la parte del camino que se juega en otra escena (el cráter
    // helado). Esa parte la cobra la escena; aquí solo se cobra el resto del
    // oxígeno. La radiación usa el tiempo completo: las horas afuera son reales.
    const parteEscena = r.parte_escena || 0;
    return {
      id: r.id, nombre: r.nombre, km: r.km, hR, hT, expuesto, oscuro, parteEscena,
      efectos: {
        oxigeno: -Math.round((hR * gastoO2 + r.subida_m / 100) * (1 - parteEscena)),
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
// ---------------------------------------------------------------- tormenta
// Fuerza de la tormenta (puntos de radiación por hora sin protección): la dosis
// de juego, más fuerte si la nube (CME) de DONKI viene más rápida.
export function fuerzaTormenta(datos) {
  const T = datos.tormenta, v = datos.cme?.velocidad_kms || T.vel_referencia_kms;
  return datos.radiacion.dosis_juego_por_hora * Math.min(T.factor_max, Math.max(T.factor_min, v / T.vel_referencia_kms));
}

// ¿Sigue el rover? Lo deja la escena Rocas si el niño cruza a pie
// (estado.misiones.rocas.dejoRover). Si esa escena no se jugó, el rover sigue.
export const tieneRover = estado => estado.misiones?.rocas?.dejoRover !== true;

// Opciones de la escena Tormenta. Radiación = fuerza × horas × (1 − protección),
// donde la protección junta el refugio con el traje y el escudo.
export function opcionesTormenta(datos, estado) {
  const T = datos.tormenta, pP = proteccion(estado);
  const gasto = estado.traje?.gastoO2 || 2;
  // La Ruta ya cobró las horas que el niño pasó afuera bajo la tormenta: aquí
  // solo cuenta la parte de la tormenta que queda (para no cobrarla dos veces).
  const queda = parteRestanteTormenta(datos, estado);
  const f = fuerzaTormenta(datos) * queda;
  return Object.entries(T.opciones).map(([id, o]) => {
    const pTotal = 1 - (1 - o.proteccion) * (1 - pP);
    return {
      queda,
      id, disponible: id !== "rover" || tieneRover(estado),
      pRefugio: o.proteccion, pPersonal: pP, pTotal,
      horasPerdidas: o.horas_perdidas, tormentaPendiente: !!o.tormenta_pendiente,
      efectos: {
        oxigeno: -Math.round((o.desvio_h + o.espera_h) * gasto * o.o2_factor),
        // durante el desvío no hay refugio; durante la espera, sí
        radiacion: Math.round(f * (o.desvio_h * (1 - pP) + o.espera_h * (1 - pTotal)))
      }
    };
  });
}

// Qué parte de la tormenta falta por vivir después de la Ruta (1 = toda).
// Horas que la ruta pasó bajo la tormenta = horas de la ruta − horas hasta que llegó,
// entre 0 y la duración de la tormenta. Nunca baja de un mínimo (el pico llega igual).
export function parteRestanteTormenta(datos, estado) {
  const r = estado.misiones?.ruta;
  if (!r?.horas) return 1;
  const D = datos.modelo.duracion_tormenta_h;
  const expuesto = Math.min(D, Math.max(0, r.horas - horasTormentaAlAterrizar(datos, estado)));
  return Math.max(datos.tormenta.parte_minima, 1 - expuesto / D);
}

// ---------------------------------------------------------------- rescate
// Decisiones del Rescate: el aire de Itzel y el regreso. Dependen de lo que
// queda de oxígeno y de cómo terminó la tormenta (estado.misiones.tormenta).
export function opcionesRescate(datos, estado) {
  const R = datos.rescate_aire, f = fuerzaTormenta(datos), pP = proteccion(estado), g = estado.traje?.gastoO2 || 2;
  const tor = estado.misiones?.tormenta || { horasPerdidas: 0, tormentaPendiente: false };
  const resto = tor.tormentaPendiente ? 1 : R.tormenta_residual;      // si la tormenta sigue, afuera hay más radiación
  const rad = h => Math.round(f * h * (1 - pP) * resto);
  return {
    aire: {
      // compartir el tanque: baja una parte de TU oxígeno, más si Itzel esperó mucho
      manguera: { efectos: { oxigeno: -Math.max(R.manguera_min, Math.round(estado.oxigeno * R.manguera_fraccion) + tor.horasPerdidas * R.itzel_por_hora_espera), radiacion: 0 } },
      // dejarle tu reserva y volver por otra: menos oxígeno, pero horas afuera
      reserva: { efectos: { oxigeno: -Math.round(R.reserva_o2 + R.reserva_horas * g), radiacion: rad(R.reserva_horas) } }
    },
    regreso: {
      rover: { disponible: tieneRover(estado), efectos: { oxigeno: -R.rover_o2, radiacion: rad(R.rover_horas) } },
      caminar: { efectos: { oxigeno: -Math.round(R.caminar_horas * g * R.caminar_dos), radiacion: rad(R.caminar_horas) } }
    }
  };
}

// Cuánto oxígeno cuesta más o menos cruzar el cráter helado (para avisarlo en
// la Ruta). Usa los mismos números que la escena CraterHelado: tiempo de cruce
// según la linterna × (gasto del traje + calefacción), más un poco por limpiar.
export function estimarCruceCrater(datos, estado) {
  const J = datos.crater_helado?.juego;
  if (!J) return 0;
  const vel = estado.lleva("linterna") ? J.vel_linterna : J.vel_sin_linterna;
  const segundos = J.largo_px / vel;
  const porSegundo = (estado.traje?.gastoO2 ?? 1.6) * J.o2_por_segundo_traje + J.o2_calefaccion;
  return Math.round(segundos * porSegundo * 1.15);
}

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
