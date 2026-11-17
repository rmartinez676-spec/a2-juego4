import type { EnemyKind } from "./level";

export interface Look {
  skin: string;
  hair: string;
  hair2?: string;
  style: "bun" | "short" | "long" | "bald" | "curly" | "wig" | "side";
  top: string;
  top2?: string;
  pants: string;
  shoes: string;
  glasses?: boolean;
  x?: string[];
}

export interface PersonOpts {
  face?: 1 | -1;
  state?: "idle" | "walk" | "jump" | "talk";
  t?: number;
  s?: number;
}

type Ctx = CanvasRenderingContext2D;

function R(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** Dibuja un personaje "chibi" en pixel-art. (cx, by) = centro y pies. */
export function drawPerson(ctx: Ctx, L: Look, cx: number, by: number, o: PersonOpts = {}) {
  const face = o.face ?? 1;
  const state = o.state ?? "idle";
  const t = o.t ?? 0;
  const s = o.s ?? 1;
  const X = L.x ?? [];
  const walk = state === "walk";
  const ph = Math.floor(t * 9) % 4;
  const swing = walk ? [3, 0, -3, 0][ph] : state === "jump" ? 3 : 0;
  const armDy = walk ? [1, 0, -1, 0][ph] : 0;
  const bob = walk ? (ph % 2 === 1 ? 1 : 0) : state === "idle" ? Math.floor(t * 2) % 2 : 0;
  const B = -bob;
  const robe = X.includes("robe");
  const hair2 = L.hair2 ?? L.hair;
  const f = 1;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(by));
  ctx.scale(face * s, s);

  if (X.includes("cape")) {
    R(ctx, -9, -19 + B, 18, 17, "#b3202a");
    R(ctx, -9, -19 + B, 18, 2, "#f2f2f2");
  }
  if (L.style === "long") R(ctx, -9, -33 + B, 18, 18, L.hair);

  // piernas
  if (robe) {
    R(ctx, -5, -3, 5, 3, L.shoes);
    R(ctx, 1, -3, 5, 3, L.shoes);
  } else {
    R(ctx, -5 + swing, -8, 4, 5, L.pants);
    R(ctx, -5 + swing, -3, 6, 3, L.shoes);
    R(ctx, 1 - swing, -8, 4, 5, L.pants);
    R(ctx, 1 - swing, -3, 6, 3, L.shoes);
    R(ctx, -5 + swing, -1, 6, 1, "#f2f2f2");
    R(ctx, 1 - swing, -1, 6, 1, "#f2f2f2");
  }

  // brazo trasero
  if (state === "jump") {
    R(ctx, -8, -24 + B, 2, 9, L.top);
    R(ctx, -8, -26 + B, 2, 2, L.skin);
  } else {
    R(ctx, -8, -17 + B + armDy, 2, 9, L.top);
    R(ctx, -8, -8 + B + armDy, 2, 2, L.skin);
  }

  // torso
  if (robe) {
    R(ctx, -7, -18 + B, 14, 15 - B, L.top);
    R(ctx, -2, -18 + B, 4, 5, "#f4f4f4");
  } else {
    R(ctx, -6, -18 + B, 12, 10 - B, L.top);
    if (L.top2) R(ctx, -3, -18 + B, 6, 9 - B, L.top2);
  }
  if (X.includes("robotTee")) {
    R(ctx, -1, -15 + B, 3, 3, "#e8402a");
    R(ctx, 0, -16 + B, 1, 1, "#e8402a");
  }
  if (X.includes("tie")) {
    R(ctx, -3, -18 + B, 6, 2, "#f4f4f4");
    R(ctx, -1, -17 + B, 3, 9, "#b3202a");
  }
  if (X.includes("coat")) {
    R(ctx, -6, -18 + B, 12, 10 - B, "#f4f7f9");
    R(ctx, -3, -18 + B, 1, 7, "#455a64");
    R(ctx, 2, -18 + B, 1, 7, "#455a64");
  }
  if (X.includes("stars")) for (const [a, b] of [[-4, -16], [3, -16], [-1, -13], [-4, -11], [3, -11]]) R(ctx, a, b + B, 1, 1, "#ffd700");
  if (X.includes("badge")) R(ctx, 2, -15 + B, 3, 3, "#f5c518");
  if (X.includes("scarf")) R(ctx, -6, -19 + B, 12, 3, "#c0392b");
  if (X.includes("phones")) R(ctx, -7, -20 + B, 1, 9, "#eeeeee");

  // cabeza
  R(ctx, -7, -31 + B, 14, 13, L.skin);
  R(ctx, -8, -26 + B, 1, 3, L.skin);
  R(ctx, 7, -26 + B, 1, 3, L.skin);
  R(ctx, -6, -22 + B, 2, 1, "#f4a39a");
  R(ctx, 4, -22 + B, 2, 1, "#f4a39a");

  // pelo
  switch (L.style) {
    case "bun":
      R(ctx, -8, -34 + B, 16, 6, L.hair);
      R(ctx, -8, -29 + B, 2, 9, L.hair);
      R(ctx, 6, -29 + B, 2, 7, L.hair);
      R(ctx, -6, -30 + B, 12, 1, L.hair);
      R(ctx, -4, -41 + B, 8, 7, L.hair);
      R(ctx, -3, -42 + B, 6, 1, L.hair);
      R(ctx, -2, -39 + B, 4, 1, hair2);
      R(ctx, -5, -32 + B, 2, 1, hair2);
      R(ctx, 3, -33 + B, 3, 1, hair2);
      break;
    case "short":
      R(ctx, -8, -34 + B, 16, 6, L.hair);
      R(ctx, -8, -29 + B, 2, 5, L.hair);
      R(ctx, 6, -29 + B, 2, 5, L.hair);
      R(ctx, -6, -30 + B, 12, 1, L.hair);
      break;
    case "long":
      R(ctx, -8, -34 + B, 16, 6, L.hair);
      R(ctx, -8, -29 + B, 2, 11, L.hair);
      R(ctx, 6, -29 + B, 2, 11, L.hair);
      R(ctx, -6, -30 + B, 12, 1, L.hair);
      break;
    case "bald":
      R(ctx, -8, -27 + B, 1, 5, L.hair);
      R(ctx, 7, -27 + B, 1, 5, L.hair);
      break;
    case "curly":
      R(ctx, -10, -36 + B, 20, 8, L.hair);
      R(ctx, -10, -29 + B, 3, 8, L.hair);
      R(ctx, 7, -29 + B, 3, 8, L.hair);
      R(ctx, -7, -38 + B, 14, 2, L.hair);
      break;
    case "wig":
      R(ctx, -9, -36 + B, 18, 8, "#f4f4f4");
      R(ctx, -10, -29 + B, 4, 3, "#f4f4f4");
      R(ctx, -10, -25 + B, 4, 3, "#dcdcdc");
      R(ctx, 6, -29 + B, 4, 3, "#f4f4f4");
      R(ctx, 6, -25 + B, 4, 3, "#dcdcdc");
      break;
    case "side":
      R(ctx, -8, -34 + B, 16, 5, L.hair);
      R(ctx, -8, -29 + B, 2, 8, L.hair);
      R(ctx, -8, -29 + B, 5, 3, L.hair);
      R(ctx, 4, -30 + B, 3, 2, L.hair);
      break;
  }

  // cara
  if (L.glasses) {
    for (const lx of [-6, 1]) {
      R(ctx, lx, -29 + B, 5, 5, "#2b2b2b");
      R(ctx, lx + 1, -28 + B, 3, 3, "#ffffff");
      R(ctx, lx + 1 + f, -28 + B, 2, 3, "#5a3317");
      R(ctx, lx + 2 + f, -28 + B, 1, 1, "#ffffff");
    }
    R(ctx, -1, -27 + B, 2, 1, "#2b2b2b");
  } else {
    R(ctx, -4 + f, -27 + B, 2, 3, "#222222");
    R(ctx, 2 + f, -27 + B, 2, 3, "#222222");
    R(ctx, -4 + f, -27 + B, 1, 1, "#ffffff");
    R(ctx, 2 + f, -27 + B, 1, 1, "#ffffff");
  }
  const talking = state === "talk" && Math.floor(t * 6) % 2 === 0;
  if (talking) R(ctx, -1 + f, -21 + B, 3, 2, "#7a2a2a");
  else {
    R(ctx, -2 + f, -21 + B, 4, 1, "#b4574f");
    R(ctx, -2 + f, -22 + B, 1, 1, "#b4574f");
    R(ctx, 2 + f, -22 + B, 1, 1, "#b4574f");
  }
  if (X.includes("mustache")) R(ctx, -3 + f, -23 + B, 6, 1, L.hair);
  if (X.includes("beard")) R(ctx, -5, -21 + B, 10, 3, L.hair);
  if (X.includes("visor")) {
    R(ctx, -8, -32 + B, 16, 3, "#2e8b57");
    R(ctx, -8, -31 + B, 20, 1, "#1f6b41");
  }
  if (X.includes("helmet")) {
    R(ctx, -8, -35 + B, 16, 5, "#f5c518");
    R(ctx, -6, -38 + B, 12, 3, "#f5c518");
    R(ctx, -9, -31 + B, 18, 1, "#d4a017");
  }
  if (X.includes("hat")) {
    R(ctx, -10, -34 + B, 20, 2, "#e0c068");
    R(ctx, -6, -39 + B, 12, 5, "#e0c068");
    R(ctx, -6, -36 + B, 12, 1, "#8b5a2b");
  }
  if (X.includes("crown")) {
    R(ctx, -5, -40 + B, 10, 5, "#f5c518");
    R(ctx, -5, -43 + B, 2, 3, "#f5c518");
    R(ctx, -1, -44 + B, 2, 4, "#f5c518");
    R(ctx, 3, -43 + B, 2, 3, "#f5c518");
    R(ctx, -1, -38 + B, 2, 2, "#d62839");
  }
  if (X.includes("antenna")) {
    R(ctx, 0, -38 + B, 1, 5, "#888888");
    R(ctx, -1, -41 + B, 3, 3, "#e33");
  }

  // brazo delantero
  if (state === "jump") {
    R(ctx, 6, -24 + B, 2, 9, L.top);
    R(ctx, 6, -26 + B, 2, 2, L.skin);
  } else if (state === "talk") {
    R(ctx, 6, -21 + B, 2, 8, L.top);
    R(ctx, 6, -23 + B, 2, 2, L.skin);
  } else {
    R(ctx, 6, -17 + B - armDy, 2, 9, L.top);
    R(ctx, 6, -8 + B - armDy, 2, 2, L.skin);
    if (X.includes("book")) {
      R(ctx, 5, -13 + B, 6, 7, "#2f5d8a");
      R(ctx, 6, -12 + B, 4, 5, "#f4ecd8");
      R(ctx, 5, -9 + B, 2, 3, "#8e2b2b");
    }
    if (X.includes("briefcase")) {
      R(ctx, 5, -8 + B, 8, 6, "#6b4423");
      R(ctx, 7, -10 + B, 4, 2, "#333333");
    }
    if (X.includes("cane")) R(ctx, 9, -12, 1, 12, "#6b4423");
  }
  ctx.restore();
}

export function drawEnemy(ctx: Ctx, kind: EnemyKind, x: number, y: number, w: number, h: number, t: number, dir: number, squish: number, accent: string) {
  if (squish > 0) {
    R(ctx, x, y + h - 5, w, 5, kind === "hopper" ? "#c0392b" : "#e8c76a");
    return;
  }
  const step = Math.floor(t * 6) % 2;
  if (kind === "walker") {
    R(ctx, x + 2 + step, y + h - 3, 5, 3, "#4a3010");
    R(ctx, x + w - 7 - step, y + h - 3, 5, 3, "#4a3010");
    R(ctx, x, y + 3, w, h - 6, "#e8c76a");
    R(ctx, x + 2, y, 7, 4, "#e8c76a");
    R(ctx, x + 3, y + 1, w - 7, 3, "#ffffff");
    R(ctx, x, y + 3, w, 2, accent);
    R(ctx, x + 3, y + 7, 4, 4, "#ffffff");
    R(ctx, x + w - 7, y + 7, 4, 4, "#ffffff");
    R(ctx, x + 4 + (dir > 0 ? 2 : 0), y + 8, 2, 3, "#111111");
    R(ctx, x + w - 6 + (dir > 0 ? 2 : 0), y + 8, 2, 3, "#111111");
    R(ctx, x + 2, y + 6, 6, 1, "#7a3b00");
    R(ctx, x + w - 8, y + 6, 6, 1, "#7a3b00");
  } else if (kind === "hopper") {
    R(ctx, x + 5, y, 6, 5, "#8b5a2b");
    R(ctx, x + 1, y + 5, w - 2, 3, "#6b4423");
    R(ctx, x, y + 8, w, h - 10, "#c0392b");
    R(ctx, x, y + h - 2, w, 2, "#7b1d14");
    R(ctx, x + 3, y + 10, 3, 3, "#ffffff");
    R(ctx, x + w - 6, y + 10, 3, 3, "#ffffff");
    R(ctx, x + 4 + (dir > 0 ? 1 : 0), y + 11, 1, 2, "#111111");
    R(ctx, x + w - 5 + (dir > 0 ? 1 : 0), y + 11, 1, 2, "#111111");
    R(ctx, x + 2, y + 9, 5, 1, "#3a0d09");
    R(ctx, x + w - 7, y + 9, 5, 1, "#3a0d09");
  } else {
    const flap = Math.floor(t * 10) % 2 === 0 ? -3 : 2;
    R(ctx, x - 5, y + 3 + flap, 6, 7, "#ffffff");
    R(ctx, x + w - 1, y + 3 + flap, 6, 7, "#ffffff");
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffbe8";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - 4);
    ctx.moveTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2 + 3, y + h / 2 + 1);
    ctx.stroke();
    R(ctx, x + 4, y + 2, 5, 1, "#7a1a10");
    R(ctx, x + w - 9, y + 2, 5, 1, "#7a1a10");
  }
}

export function drawCoin(ctx: Ctx, x: number, y: number, t: number, ph: number) {
  const w = Math.abs(Math.cos(t * 4 + ph));
  const rx = 1 + w * 5;
  ctx.fillStyle = "#b8860b";
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 1, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd23c";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (rx > 3) R(ctx, x - 1, y - 4, 2, 8, "#fff1a8");
}

export function drawHeart(ctx: Ctx, x: number, y: number, full: boolean) {
  const c = full ? "#e63946" : "#4a2a35";
  R(ctx, x + 1, y, 3, 2, c);
  R(ctx, x + 6, y, 3, 2, c);
  R(ctx, x, y + 1, 10, 3, c);
  R(ctx, x + 1, y + 4, 8, 2, c);
  R(ctx, x + 3, y + 6, 4, 1, c);
  R(ctx, x + 4, y + 7, 2, 1, c);
  if (full) R(ctx, x + 2, y + 1, 2, 1, "#ffb3b8");
}

export function drawBook(ctx: Ctx, x: number, y: number, t: number) {
  const b = Math.sin(t * 4) * 2;
  const yy = y + b;
  ctx.fillStyle = "rgba(255,240,150,0.35)";
  ctx.beginPath();
  ctx.arc(x + 7, yy + 7, 13 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, x, yy, 14, 15, "#8e1b2d");
  R(ctx, x + 2, yy + 1, 11, 13, "#f4ecd8");
  R(ctx, x, yy, 3, 15, "#b3202a");
  R(ctx, x + 5, yy + 4, 6, 1, "#8e1b2d");
  R(ctx, x + 5, yy + 7, 6, 1, "#8e1b2d");
  R(ctx, x + 5, yy + 10, 4, 1, "#8e1b2d");
}

export function drawChest(ctx: Ctx, x: number, y: number, open: boolean, t: number) {
  R(ctx, x - 11, y - 14, 22, 14, "#7a4a1f");
  R(ctx, x - 11, y - 18, 22, 6, open ? "#5e3813" : "#a0692f");
  R(ctx, x - 11, y - 8, 22, 2, "#f1c40f");
  R(ctx, x - 2, y - 11, 4, 5, "#f1c40f");
  if (!open) {
    const b = Math.sin(t * 5) * 3;
    ctx.fillStyle = "#fff3a0";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★", x, y - 24 + b);
  }
}

export function drawDoor(ctx: Ctx, x: number, y: number, t: number) {
  R(ctx, x - 18, y - 54, 36, 54, "#3b2a1a");
  R(ctx, x - 15, y - 51, 30, 51, "#a0692f");
  R(ctx, x - 11, y - 47, 22, 20, "#7ec8e3");
  R(ctx, x - 11, y - 22, 22, 22, "#8e5a2b");
  R(ctx, x + 6, y - 20, 3, 3, "#f1c40f");
  R(ctx, x - 24, y - 72, 48, 14, "#b3202a");
  R(ctx, x - 24, y - 72, 48, 2, "#ff6b6b");
  ctx.fillStyle = "#ffffff";
  ctx.font = "7px PS2P, monospace";
  ctx.textAlign = "center";
  ctx.fillText("PRUEBA", x, y - 62);
  ctx.fillStyle = "#ffe066";
  ctx.fillText("▼", x, y - 76 + Math.sin(t * 5) * 2);
}

export function drawFlag(ctx: Ctx, x: number, y: number, on: boolean, t: number) {
  R(ctx, x, y - 42, 2, 42, "#dddddd");
  const wave = Math.floor(Math.sin(t * 5) * 1.5);
  R(ctx, x + 2, y - 42, 14 + wave, 10, on ? "#27ae60" : "#b3202a");
  R(ctx, x + 2, y - 42, 14 + wave, 2, on ? "#6be39a" : "#ff6b6b");
}

export interface BossLook {
  kind: "boletin" | "leon" | "euro" | "monitor" | "caja" | "person";
  color: string;
  look?: Look;
}

export function drawBoss(ctx: Ctx, b: BossLook, x: number, y: number, w: number, h: number, t: number, o: { face: number; flash: boolean; stun: boolean; rage: boolean; wind: boolean }) {
  ctx.save();
  const cx = x + w / 2;
  const bob = Math.round(Math.sin(t * 5) * 1.5);
  const eyeY = y + h * 0.42;
  const angry = (ex: number, ey: number, sz: number, dir: number) => {
    R(ctx, ex, ey, sz, sz, "#ffffff");
    R(ctx, ex + (dir > 0 ? sz * 0.5 : 0), ey + 1, Math.max(2, sz * 0.5), sz - 2, o.rage ? "#e00" : "#111");
  };
  switch (b.kind) {
    case "person": {
      const s = h / 42;
      drawPerson(ctx, b.look as Look, cx, y + h, { face: o.face >= 0 ? 1 : -1, state: o.wind ? "jump" : "walk", t, s });
      break;
    }
    case "boletin": {
      R(ctx, x + 6, y + h - 10, 10, 10, "#4a3b1a");
      R(ctx, x + w - 16, y + h - 10, 10, 10, "#4a3b1a");
      R(ctx, x, y + bob, w, h - 8, "#4a3b1a");
      R(ctx, x + 3, y + 3 + bob, w - 6, h - 14, b.color);
      R(ctx, x + 6, y + 6 + bob, w - 12, 14, "#1a1a1a");
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("B O E", cx, y + 17 + bob);
      for (let i = 0; i < 3; i++) R(ctx, x + 8, y + h - 24 + i * 4 + bob, w - 16, 1, "#9a8f6a");
      angry(x + w * 0.25, eyeY - 6 + bob, 9, o.face);
      angry(x + w * 0.58, eyeY - 6 + bob, 9, o.face);
      R(ctx, x + w * 0.2, eyeY - 8 + bob, 14, 2, "#7a1a10");
      R(ctx, x + w * 0.58, eyeY - 8 + bob, 14, 2, "#7a1a10");
      for (let i = 0; i < 6; i++) R(ctx, x + w * 0.3 + i * 5, eyeY + 8 + (i % 2) * 3 + bob, 4, 2, "#7a1a10");
      break;
    }
    case "leon": {
      R(ctx, x + 6, y + h * 0.5, w - 12, h * 0.42, b.color);
      R(ctx, x + 4, y + h - 10, 14, 10, "#8a6020");
      R(ctx, x + w - 18, y + h - 10, 14, 10, "#8a6020");
      R(ctx, x - 6, y + h * 0.55, 8, 4 + Math.round(Math.sin(t * 6) * 2), "#8a6020");
      ctx.fillStyle = "#6b4a14";
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.33 + bob, h * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.35 + bob, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      angry(cx - 14, y + h * 0.28 + bob, 7, o.face);
      angry(cx + 6, y + h * 0.28 + bob, 7, o.face);
      R(ctx, cx - 4, y + h * 0.4 + bob, 8, 5, "#3a2208");
      R(ctx, cx - 7, y + h * 0.48 + bob, 14, o.wind ? 8 : 3, "#5a0f0f");
      break;
    }
    case "euro": {
      const r = Math.min(w, h) / 2;
      ctx.fillStyle = "#b8860b";
      ctx.beginPath();
      ctx.arc(cx, y + h / 2 + bob, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(cx, y + h / 2 + bob, r - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff2a8";
      ctx.font = `bold ${Math.round(r)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("€", cx, y + h / 2 + r * 0.35 + bob);
      angry(cx - 16, y + h * 0.2 + bob, 8, o.face);
      angry(cx + 6, y + h * 0.2 + bob, 8, o.face);
      for (let i = 0; i < 12; i++) {
        const a = t * 1.6 + (i * Math.PI * 2) / 12;
        R(ctx, cx + Math.cos(a) * (r + 10) - 2, y + h / 2 + Math.sin(a) * (r + 10) - 2, 4, 4, "#ffdd00");
      }
      break;
    }
    case "monitor": {
      R(ctx, cx - 10, y + h - 14, 20, 14, "#4a5560");
      R(ctx, cx - 22, y + h - 4, 44, 4, "#39424b");
      R(ctx, x, y + bob, w, h - 14, "#cfd6dc");
      R(ctx, x + 6, y + 6 + bob, w - 12, h - 28, "#143a8a");
      ctx.fillStyle = "#9fd0ff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("NO HAY CITA", cx, y + 20 + bob);
      angry(cx - 16, eyeY - 2 + bob, 9, o.face);
      angry(cx + 6, eyeY - 2 + bob, 9, o.face);
      R(ctx, cx - 10, eyeY + 14 + bob, 20, o.wind ? 6 : 2, "#ff6b6b");
      R(ctx, x + w - 14, y + h - 22, 10, 3, "#222222");
      break;
    }
    case "caja": {
      R(ctx, x + 4, y + h - 8, 14, 8, "#2b3138");
      R(ctx, x + w - 18, y + h - 8, 14, 8, "#2b3138");
      R(ctx, x, y + bob, w, h - 6, "#59636e");
      R(ctx, x + 4, y + 4 + bob, w - 8, h - 14, "#7a8591");
      for (const [a, c] of [[x + 6, y + 6], [x + w - 10, y + 6], [x + 6, y + h - 18], [x + w - 10, y + h - 18]]) R(ctx, a, c + bob, 4, 4, "#2b3138");
      ctx.fillStyle = "#2b3138";
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.66 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.66 + bob, 8, t * 2, t * 2 + 4);
      ctx.stroke();
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("€", cx - 12, eyeY - 2 + bob);
      ctx.fillText("€", cx + 12, eyeY - 2 + bob);
      R(ctx, cx - 14, eyeY - 12 + bob, 10, 2, "#111111");
      R(ctx, cx + 4, eyeY - 12 + bob, 10, 2, "#111111");
      break;
    }
  }
  if (o.stun) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1;
      R(ctx, cx + Math.cos(a) * 18 - 2, y - 8 + Math.sin(a) * 4, 5, 5, "#ffe066");
    }
  }
  if (o.flash) {
    ctx.globalAlpha = 0.55;
    R(ctx, x - 6, y - 6, w + 12, h + 12, "#ffffff");
  }
  ctx.restore();
}
