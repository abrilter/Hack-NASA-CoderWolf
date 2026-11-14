// ===========================================================================
// MODELO DE SIMULACIÓN. Dueño: Rol 4.
// Calcula opciones y consecuencias con los datos reales + elecciones previas.
// Regla: ninguna opción gratis; los números NASA vienen de datos.json/DONKI.
// ===========================================================================
const KM_SOL_TIERRA = 149_600_000;

export function horasDeLlegada(velocidadKms) {
  return KM_SOL_TIERRA / velocidadKms / 3600;
}

function proteccion(estado) {
  const traje = estado.traje?.proteccion || 0;
  const extra = estado.lleva("escudo") ? 0.2 : 0;           // objeto de la mochila
  return Math.min(0.9, (estado.escudo / 100) * 0.5 + traje + extra);
}

// Opciones de la escena Ruta
export function opcionesDeRuta(datos, estado) {
  const hTormenta = horasDeLlegada(datos.cme.velocidad_kms);
  const agilidad = estado.nave?.agilidad || 1;
  const gastoO2 = estado.traje?.gastoO2 || 2;                // % por hora
  const dosisHora = datos.radiacion.dosis_juego_por_hora * (1 - proteccion(estado));

  const rutas = datos.rutas.map(r => {
    // TODO(Rol 4): sin linterna, los cráteres oscuros son más lentos
    const lento = r.oscura && !estado.lleva("linterna") ? 1.5 : 1;
    const hRescate = (r.km / (datos.rover.kmh * agilidad) + r.subida_m / 500) * lento;
    const expuesto = Math.max(0, hRescate - hTormenta);
    return {
      texto: `${r.nombre} (${r.km} km, ${Math.round(hRescate)} h)`,
      hRescate, hTormenta,
      efectos: {
        oxigeno: -Math.round(hRescate * gastoO2 + r.subida_m / 100),
        radiacion: Math.round(expuesto * dosisHora)
      }
    };
  });

  const hEspera = hTormenta + 12;
  rutas.push({
    texto: `Refugiarse y esperar (${Math.round(hEspera)} h)`,
    espera: true, hTormenta,
    efectos: { oxigeno: -Math.round(hEspera * gastoO2 * 0.8), radiacion: 0 }
  });
  return rutas;
}

export function aplicar(estado, efectos) {
  if (efectos.oxigeno) estado.oxigeno = Math.max(0, Math.min(120, estado.oxigeno + efectos.oxigeno));
  if (efectos.radiacion) estado.radiacion = Math.max(0, estado.radiacion + efectos.radiacion);
  if (efectos.escudo) estado.escudo = Math.max(0, Math.min(100, estado.escudo + efectos.escudo));
}

// Frase de Chispa explicando el resultado
export function explicar(op) {
  const hT = Math.round(op.hTormenta);
  if (op.espera) return `Esperamos ${hT} h a que pasara la tormenta. Nadie recibió radiación, pero gastamos mucho oxígeno.`;
  const hR = Math.round(op.hRescate);
  return hR <= hT
    ? `La tormenta tardó ${hT} h y el rescate ${hR} h. Llegamos ${hT - hR} h antes!`
    : `La tormenta llegó en ${hT} h y el rescate tardó ${hR} h. Estuvimos ${hR - hT} h expuestos.`;
}
