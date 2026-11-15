// Carga dibujos, datos y textos. Dueño: Rol 1.
// Lee: datos.json, textos.json, DONKI y la dirección (?escena=) · Escribe: datos, textos, datos.cme.en_vivo, donkiEnVivo.
// También tiene el MODO PRUEBA: index.html?escena=NombreEscena abre esa escena
// directo con un estado de prueba (ver ESTADO_PRUEBA en config.js).
import { ASSETS, ANCHO, ALTO, MISIONES_JSON, ESTADO_PRUEBA, TRAJES, NAVES, OBJETOS, ORDEN } from "../config.js";
import { estado } from "../estado.js";
import { cmeReciente } from "../nasa/donki.js";
import { texto } from "../ui.js";

const RECURSOS = ["oxigeno", "escudo", "radiacion", "energia", "hielo_kg", "combustibleRestante"];

export class Carga extends Phaser.Scene {
  constructor() { super("Carga"); }

  preload() {
    texto(this, ANCHO / 2, ALTO / 2, "Contactando a la NASA...");
    // Si un PNG no existe todavía, no pasa nada: se crea un cuadro de color.
    this.load.on("loaderror", archivo => console.info("[assets] falta", archivo.src, "→ se usa cuadro provisional"));
    ASSETS.forEach(a => this.load.image(a.clave, "assets/" + a.archivo));
    this.load.json("datos", "datos/datos.json");
    this.load.json("textos", "datos/textos.json");
    // Datos y textos propios de cada misión nueva
    Object.values(MISIONES_JSON).forEach(id => this.load.json("m_" + id, `datos/misiones/${id}.json`));
  }

  async create() {
    this.crearProvisionales();
    estado.datos = this.cache.json.get("datos");
    estado.textos = this.cache.json.get("textos");

    const params = new URLSearchParams(location.search);
    const prueba = params.get("escena");

    estado.datos.cme.en_vivo = false;        // la guardada: se ve "no en vivo"
    if (!params.has("sinred")) {
      const cme = await cmeReciente(30);
      // Una CME lenta llegaría en días y la tormenta dejaría de importar:
      // en ese caso se usa la CME real guardada en datos.json.
      const minima = estado.datos.modelo?.cme_min_kms ?? 0;
      if (cme && cme.velocidad_kms >= minima) { estado.datos.cme = { ...cme, en_vivo: true }; estado.donkiEnVivo = true; }
      else if (cme) console.info(`[DONKI] la CME más rápida del mes va a ${cme.velocidad_kms} km/s (< ${minima}): se usa la guardada`);
    }

    if (prueba) return this.modoPrueba(prueba, params);
    this.scene.start(ORDEN[0]);
  }

  // ---------------------------------------------------------------- modo prueba
  modoPrueba(escena, params) {
    if (!this.scene.manager.keys[escena] || escena === "Carga") {
      const lista = Object.keys(this.scene.manager.keys).filter(k => k !== "Carga").join(", ");
      console.warn(`[prueba] no existe la escena "${escena}". Escenas: ${lista}`);
      texto(this, ANCHO / 2, ALTO / 2 + 14, `No existe la escena "${escena}"`, { tam: 7, color: "#ff8a5c" });
      this.time.delayedCall(2500, () => this.scene.start(ORDEN[0]));
      return;
    }

    estado.nuevaPartida();
    const base = structuredClone(ESTADO_PRUEBA);
    // El tanque (+20) se suma al salir del Centro de Control: antes de esa
    // escena (y en ella) se empieza con el oxígeno de una partida nueva.
    if (ORDEN.indexOf(escena) <= ORDEN.indexOf("CentroControl")) base.oxigeno = estado.oxigeno;

    // Bloque "prueba" del JSON de la misión (si tiene)
    const archivo = MISIONES_JSON[escena];
    const propio = archivo && this.cache.json.get("m_" + archivo)?.prueba;
    Object.assign(base, propio || {});

    // Cambios desde la dirección: &traje=blindado&nave=grande&mochila=oxigeno,linterna&oxigeno=80
    if (params.has("traje")) base.traje = params.get("traje");
    if (params.has("nave")) base.nave = params.get("nave");
    if (params.has("mochila")) base.mochila = params.get("mochila").split(",").filter(Boolean);
    RECURSOS.forEach(r => { if (params.has(r)) base[r] = Number(params.get(r)); });

    // traje y nave se guardan como objetos completos, igual que en Equipo
    if (typeof base.traje === "string") base.traje = TRAJES.find(t => t.id === base.traje) || TRAJES.find(t => t.id === "ligero");
    if (typeof base.nave === "string") base.nave = NAVES.find(n => n.id === base.nave) || NAVES.find(n => n.id === "pequena");
    const validos = OBJETOS.map(o => o.id);
    base.mochila = (base.mochila || []).filter(id => validos.includes(id));

    Object.assign(estado, base, { modoPrueba: true });
    estado.bitacora.push(`(Modo prueba: empezaste en ${escena}.)`);
    console.info(`[prueba] escena ${escena} con estado:`, {
      traje: estado.traje.id, nave: estado.nave.id, mochila: estado.mochila,
      oxigeno: estado.oxigeno, escudo: estado.escudo, radiacion: estado.radiacion, energia: estado.energia,
      cme: `${estado.datos.cme.velocidad_kms} km/s (${estado.donkiEnVivo ? "DONKI en vivo" : "guardada"})`
    });
    this.scene.start(escena);
  }

  // Cuadro de color del tamaño correcto para cada dibujo que falte
  crearProvisionales() {
    ASSETS.forEach(a => {
      if (this.textures.exists(a.clave)) return;
      const g = this.add.graphics();
      g.fillStyle(a.color).fillRect(0, 0, a.w, a.h);
      g.lineStyle(1, 0x000000, 0.4).strokeRect(0, 0, a.w, a.h);
      g.generateTexture(a.clave, a.w, a.h);
      g.destroy();
    });
  }
}
