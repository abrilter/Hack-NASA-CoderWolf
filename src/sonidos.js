// Sonidos del juego hechos con Web Audio (sin archivos). Dueño: Rol 3.
// Lo usan CentroControl y Exterior: sonar(escena, "bien").
// No lee ni escribe el estado.

// Un tono corto: frecuencia f (Hz), empieza en ini s, dura dur s
export function tono(escena, f, ini, dur, forma = "square", vol = 0.04) {
  const ctx = escena.sound.context;
  if (!ctx) return null;
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime + ini, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = forma;
  o.frequency.setValueAtTime(f, t0);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  return { o, t0 };
}

// Efectos con nombre
export function sonar(escena, tipo) {
  const ctx = escena.sound.context;
  if (!ctx) return;
  const t = (...a) => tono(escena, ...a);
  if (tipo === "alerta") [0, 0.18, 0.36].forEach(i => t(1200, i, 0.12));
  if (tipo === "bien") [660, 880, 1100].forEach((f, i) => t(f, i * 0.1, 0.15));
  if (tipo === "mal") [300, 200].forEach((f, i) => t(f, i * 0.15, 0.15));
  if (tipo === "choque") [180, 120].forEach((f, i) => t(f, i * 0.08, 0.12, "sawtooth", 0.05));
  if (tipo === "arranque") [110, 165, 220].forEach((f, i) => t(f, i * 0.12, 0.18, "sawtooth", 0.03));
  if (tipo === "puerta") { const s = t(220, 0, 0.5, "triangle", 0.04); s?.o.frequency.exponentialRampToValueAtTime(440, s.t0 + 0.5); }
  if (tipo === "ladrido") [0, 0.28].forEach(i => {
    const s = t(520, i, 0.16, "sawtooth", 0.025);
    s?.o.frequency.exponentialRampToValueAtTime(240, s.t0 + 0.16);
  });
  if (tipo === "estatica") {
    if (ctx.state === "suspended") ctx.resume();
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b;
    g.gain.value = 0.02;
    s.connect(g).connect(ctx.destination);
    s.start();
  }
}
