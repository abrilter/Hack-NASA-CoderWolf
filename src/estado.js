// Estado compartido entre escenas. Dueño: Rol 1 (los números iniciales: Rol 4).
export const estado = {
  datos: null,        // datos/datos.json (+ DONKI en vivo si hay internet)
  textos: null,       // datos/textos.json
  donkiEnVivo: false,

  nombreClave: "",
  mochila: [],        // ids de OBJETOS
  traje: null,
  nave: null,
  mision2: null,      // registro de decisiones de la Misión 2 (mapa de consecuencias)

  oxigeno: 100,
  escudo: 40,
  radiacion: 0,
  bitacora: [],

  nuevaPartida() {
    Object.assign(this, {
      mochila: [], traje: null, nave: null, mision2: null,
      oxigeno: 100, escudo: 40, radiacion: 0, bitacora: []
    });
  },

  lleva(id) { return this.mochila.includes(id); }
};

export const LIMITE_RADIACION = 100;
