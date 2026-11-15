// ===========================================================================
// CONFIGURACIÓN COMÚN — reglas de la Guía de arranque. Dueño: Rol 1.
// ===========================================================================

// Resolución base pixel art (se agranda sin suavizar)
export const ANCHO = 320;
export const ALTO = 180;

// Cuántas veces se agranda la imagen por dentro del juego (pixeles más pequeños
// y texto nítido). Las escenas siguen usando coordenadas de 320x180.
export const ZOOM = 4;

// Colores provisionales. TODO(Rol 3): reemplazar por la paleta elegida en Lospec.
export const COLOR = {
  fondo: 0x0b1026,
  panel: 0x1d2650,
  borde: 0x4fd1ff,
  texto: "#eef1ff",
  titulo: "#ffd45c",
  tenue: "#a7b0d8",
  oxigeno: 0x4fd1ff,
  escudo: 0xb18cff,
  radiacion: 0xff8a5c,
  energia: 0xffcd75,
  suelo: 0x6b6f80
};

// ---------------------------------------------------------------------------
// Orden de la historia. Para agregar una misión: crear la escena, registrarla
// en main.js y ponerla aquí. Las escenas nuevas usan siguienteEscena(this.scene.key)
// en lugar de escribir el nombre de la siguiente escena a mano.
export const ORDEN = [
  "Intro", "Carta", "Equipo", "Aterrizaje", "CentroControl", "Final"
];
// Senal, Viaje, Ruta y Rescate siguen registradas en main.js (se pueden abrir
// con ?escena=...) pero por ahora no forman parte del recorrido.
export const siguienteEscena = clave => ORDEN[ORDEN.indexOf(clave) + 1] ?? "Final";

// Archivo de datos y textos propio de cada misión nueva: datos/misiones/<archivo>.json
// Ejemplo: { Crater: "crater" }. Se carga como "m_crater" y su bloque "prueba"
// se usa en el modo prueba.
export const MISIONES_JSON = {};

// ---------------------------------------------------------------------------
// MODO PRUEBA: index.html?escena=Ruta abre esa escena directo con este estado.
// Se puede cambiar desde la dirección, por ejemplo:
//   ?escena=Ruta&traje=blindado&nave=grande&mochila=oxigeno,linterna&oxigeno=80
//   &sinred=1  → no consulta DONKI (arranca al instante)
// Valores "normales" (Guía: nave pequeña, traje ligero, mochila con oxígeno y escudo)
export const ESTADO_PRUEBA = {
  nombreClave: "Cometa",
  traje: "ligero",
  nave: "pequena",
  mochila: ["oxigeno", "escudo"],
  oxigeno: 120,          // 100 + 20 del tanque (escenas después de Equipo; antes, 100)
  escudo: 40,
  radiacion: 0,
  energia: 60
};

// Lista de dibujos. Si el PNG existe en assets/, se usa; si no, se dibuja
// un cuadro de color del mismo tamaño para poder programar sin esperar al arte.
// TODO(Rol 3): crear cada PNG con este nombre y tamaño exactos.
export const ASSETS = [
  { clave: "astronauta",    archivo: "sprites/astronauta.png",    w: 32, h: 32, color: 0xffffff },
  { clave: "chispa",        archivo: "sprites/chispa.png",        w: 16, h: 16, color: 0xffd45c },
  { clave: "nave",          archivo: "sprites/nave.png",          w: 32, h: 32, color: 0xc0c8e8 },
  { clave: "obj_oxigeno",   archivo: "sprites/obj_oxigeno.png",   w: 16, h: 16, color: 0x4fd1ff },
  { clave: "obj_escudo",    archivo: "sprites/obj_escudo.png",    w: 16, h: 16, color: 0xb18cff },
  { clave: "obj_linterna",  archivo: "sprites/obj_linterna.png",  w: 16, h: 16, color: 0xfff27a },
  { clave: "obj_radio",     archivo: "sprites/obj_radio.png",     w: 16, h: 16, color: 0x5cffb0 },
  { clave: "obj_botiquin",  archivo: "sprites/obj_botiquin.png",  w: 16, h: 16, color: 0xff5c7a },
  { clave: "obj_comida",    archivo: "sprites/obj_comida.png",    w: 16, h: 16, color: 0xffa94d },
  { clave: "fondo_control", archivo: "fondos/fondo_control.png",  w: 320, h: 180, color: 0x151c3d },
  { clave: "fondo_luna",    archivo: "fondos/fondo_luna.png",     w: 320, h: 180, color: 0x2b2e3b }
];

// ---------------------------------------------------------------------------
// BALANCE: trajes, naves y mochila. Dueño del balance: Rol 4 (modelo).
// Verificado con pruebas/balance.html: si cambian un número, vuelvan a abrir
// esa página y revisen que ninguna opción gane en todo (ANALISIS.md, 2.3).

// Trajes (Misión 3). peso: kg del traje (solo la báscula y la velocidad al caminar)
export const TRAJES = [
  { id: "blindado", proteccion: 0.40, gastoO2: 2.2, peso: 35 },
  { id: "ligero",   proteccion: 0.05, gastoO2: 1.6, peso: 12 }
];
// Naves (Misión 3). horasViaje: horas de vuelo que faltan después de la alerta
// solar hasta aterrizar (la grande es lenta: la tormenta queda más cerca).
// agilidad y combustible: minijuego de Aterrizaje. w: ancho del dibujo.
export const NAVES = [
  { id: "grande",  agilidad: 0.8, combustible: 140, oxigenoExtra: 10, horasViaje: 12, w: 46 },
  { id: "pequena", agilidad: 1.3, combustible: 90,  oxigenoExtra: 0,  horasViaje: 2,  w: 32 }
];
export const O2_TANQUE = 20;          // si la mochila trae el tanque de oxígeno

// Objetos de la mochila (Centro de Control).
// La linterna pesa 2 kg: con 1 kg siempre cabía junto a oxígeno y escudo (era "gratis").
export const CAPACIDAD_MOCHILA = 10; // kg
export const OBJETOS = [
  { id: "oxigeno",  clave: "obj_oxigeno",  peso: 4 },
  { id: "escudo",   clave: "obj_escudo",   peso: 5 },
  { id: "linterna", clave: "obj_linterna", peso: 2 },
  { id: "radio",    clave: "obj_radio",    peso: 3 },
  { id: "botiquin", clave: "obj_botiquin", peso: 2 },
  { id: "comida",   clave: "obj_comida",   peso: 2 }
];
