// Estado compartido entre escenas. Dueño: Rol 1 (los números iniciales: Rol 4).
// Contrato: las escenas no se llaman entre sí; solo leen y escriben aquí.
// Para cambiar un recurso usen estado.cambiar("oxigeno", -5): así todos
// respetan los mismos límites.

export const LIMITE_RADIACION = 100;

// Límites de cada recurso [mínimo, máximo]
export const LIMITES = {
  oxigeno:   [0, 150],
  escudo:    [0, 100],
  energia:   [0, 100],
  radiacion: [0, Infinity],
  hielo_kg:  [0, Infinity]
};

// Valores de una partida nueva (los usa nuevaPartida)
function partidaNueva() {
  return {
    mochila: [],        // ids de OBJETOS
    traje: null,
    nave: null,
    mision2: null,      // registro de decisiones de la Misión 2 (mapa de consecuencias)
    misiones: {},       // registro libre de cada misión nueva: estado.misiones.<id>

    oxigeno: 100,
    escudo: 40,
    radiacion: 0,
    energia: 60,        // batería (la usan las misiones nuevas)
    bitacora: [],

    // Misiones nuevas (ver ANALISIS.md, sección 3.3)
    hielo_kg: 0,
    chispaEncontrado: false,
    estacionDSN: null,
    mensajeEnviado: false,
    combustibleRestante: null,   // lo escribe Aterrizaje; lo lee Regreso
    carga: []
  };
}

export const estado = {
  datos: null,        // datos/datos.json (+ DONKI en vivo si hay internet)
  textos: null,       // datos/textos.json
  donkiEnVivo: false,
  modoPrueba: false,  // true si se abrió con index.html?escena=...

  nombreClave: "",
  insignia: null,     // { forma, color, simbolo } diseñada en el Final; se conserva entre partidas
  // Registro de la Misión 1c (Senal). No se borra en nuevaPartida porque
  // CentroControl lo lee justo después de empezar la partida.
  mision1: null,

  ...partidaNueva(),

  nuevaPartida() {
    Object.assign(this, partidaNueva());
  },

  lleva(id) { return this.mochila.includes(id); },

  // Suma (o resta) a un recurso respetando sus límites. Devuelve el valor nuevo.
  cambiar(recurso, delta) {
    const [min, max] = LIMITES[recurso] || [-Infinity, Infinity];
    this[recurso] = Math.max(min, Math.min(max, (this[recurso] || 0) + delta));
    return this[recurso];
  },

  // "oxigeno" o "radiacion" si la partida ya se perdió; null si sigue.
  causaDerrota() {
    if (this.oxigeno <= 0) return "oxigeno";
    if (this.radiacion >= LIMITE_RADIACION) return "radiacion";
    return null;
  }
};
