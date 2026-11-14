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
  suelo: 0x6b6f80
};

// Lista de dibujos. Si el PNG existe en assets/, se usa; si no, se dibuja
// un cuadro de color del mismo tamaño para poder programar sin esperar al arte.
// TODO(Rol 3): crear cada PNG con este nombre y tamaño exactos.
export const ASSETS = [
  { clave: "astronauta",    archivo: "sprites/astronauta.png",    w: 32, h: 32, color: 0xffffff },
  { clave: "itzel",         archivo: "sprites/itzel.png",         w: 32, h: 32, color: 0xffb6c1 },
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

// Objetos de la mochila (Centro de Control). Dueño del balance: Rol 4.
export const CAPACIDAD_MOCHILA = 10; // kg
export const OBJETOS = [
  { id: "oxigeno",  clave: "obj_oxigeno",  peso: 4 },
  { id: "escudo",   clave: "obj_escudo",   peso: 5 },
  { id: "linterna", clave: "obj_linterna", peso: 1 },
  { id: "radio",    clave: "obj_radio",    peso: 3 },
  { id: "botiquin", clave: "obj_botiquin", peso: 2 },
  { id: "comida",   clave: "obj_comida",   peso: 2 }
];
