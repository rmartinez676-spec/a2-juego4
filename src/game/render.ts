import { H, T, W } from "./config";
import type { Theme } from "./worlds";

type Ctx = CanvasRenderingContext2D;
const FLOOR = 288;

function R(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function rep(cam: number, par: number, period: number, fn: (x: number, i: number) => void) {
  const sc = cam * par;
  const i0 = Math.floor(sc / period);
  const off = -(sc - i0 * period);
  for (let k = 0; off + k * period < W + period; k++) fn(off + k * period, i0 + k);
}
function circle(ctx: Ctx, x: number, y: number, r: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBackground(ctx: Ctx, th: Theme, sub: number, cam: number, t: number, boss: boolean) {
  const sky = th.skies[sub % th.skies.length];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  switch (th.kind) {
    case "academy":
      rep(cam, 0.12, 170, (x, i) => {
        R(ctx, x + 30, 60, 60, 124, "#7a4a2a");
        R(ctx, x + 34, 70, 52, 110, "#bfe3ff");
        circle(ctx, x + 60, 70, 26, "#7a4a2a");
        circle(ctx, x + 60, 70, 22, "#bfe3ff");
        R(ctx, x + 58, 48, 4, 132, "#7a4a2a");
        R(ctx, x + 34, 120, 52, 4, "#7a4a2a");
        if (sub % 3 === 2) circle(ctx, x + 72 + (i % 2) * 4, 90, 5, "#fff6c0");
      });
      rep(cam, 0.4, 140, (x, i) => {
        R(ctx, x, 120, 112, 168, "#6b3f1d");
        for (let r = 0; r < 4; r++) {
          const y = 128 + r * 40;
          for (let j = 0; j < 14; j++) {
            const hh = 20 + hash(i * 31 + r * 7 + j) * 12;
            const col = ["#c0392b", "#2980b9", "#27ae60", "#f1c40f", "#8e44ad", "#e67e22", "#ecf0f1"][Math.floor(hash(i * 17 + r * 3 + j * 5) * 7)];
            R(ctx, x + 5 + j * 7, y + 34 - hh, 6, hh, col);
          }
          R(ctx, x + 2, y + 34, 108, 4, "#4a2a12");
        }
      });
      break;
    case "congreso":
      rep(cam, 0.1, 460, (x) => {
        R(ctx, x + 40, 150, 380, 138, "#d9cfb0");
        ctx.fillStyle = "#cfc3a0";
        ctx.beginPath();
        ctx.moveTo(x + 110, 150);
        ctx.lineTo(x + 350, 150);
        ctx.lineTo(x + 230, 100);
        ctx.fill();
        for (let k = 0; k < 6; k++) R(ctx, x + 130 + k * 40, 150, 14, 130, "#efe6c8");
        R(ctx, x + 110, 278, 240, 10, "#b8ad8c");
        R(ctx, x + 229, 70, 2, 32, "#555");
        R(ctx, x + 231, 70, 22, 4, "#c0202e");
        R(ctx, x + 231, 74, 22, 6, "#f5c518");
        R(ctx, x + 231, 80, 22, 4, "#c0202e");
      });
      rep(cam, 0.35, 170, (x, i) => {
        R(ctx, x + 20, 0, 28, FLOOR, "#e9dfc0");
        R(ctx, x + 20, 0, 6, FLOOR, "#cfc3a0");
        R(ctx, x + 14, 0, 40, 14, "#d8cca6");
        R(ctx, x + 14, FLOOR - 12, 40, 12, "#d8cca6");
        if (i % 2 === 0) {
          R(ctx, x + 60, 0, 44, 74, "#8e1b2d");
          for (let k = 0; k < 4; k++) R(ctx, x + 66 + k * 10, 0, 2, 74, "#6b1020");
          R(ctx, x + 78, 72, 6, 10, "#e0b84c");
        }
      });
      break;
    case "europa": {
      const sx = W * 0.5 - cam * 0.03;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + t * 0.1;
        const px = sx + Math.cos(a) * 62;
        const py = 92 + Math.sin(a) * 62;
        R(ctx, px - 1, py - 4, 3, 9, "#ffd700");
        R(ctx, px - 4, py - 1, 9, 3, "#ffd700");
      }
      rep(cam, 0.12, 300, (x, i) => {
        for (let k = 0; k < 4; k++) {
          const hh = 90 + hash(i * 9 + k) * 90;
          R(ctx, x + k * 72, FLOOR - hh, 64, hh, "#3b5fa8");
          for (let r = 0; r < hh - 10; r += 14) for (let c = 6; c < 60; c += 14) R(ctx, x + k * 72 + c, FLOOR - hh + 6 + r, 6, 8, (r + c + i) % 3 ? "#7aa5f0" : "#ffe9a0");
        }
      });
      rep(cam, 0.4, 200, (x) => {
        R(ctx, x + 20, 110, 3, 178, "#cccccc");
        R(ctx, x + 23, 114, 52, 34, "#0b3d9a");
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          R(ctx, x + 49 + Math.cos(a) * 11, 131 + Math.sin(a) * 11, 3, 3, "#ffd700");
        }
      });
      break;
    }
    case "ciudad":
      rep(cam, 0.1, 360, (x, i) => {
        for (let k = 0; k < 5; k++) {
          const hh = 60 + hash(i * 7 + k) * 110;
          R(ctx, x + k * 70, FLOOR - hh, 56, hh, "#b7d3e0");
          R(ctx, x + k * 70 + 8, FLOOR - hh + 8, 40, 4, "#9ec0d2");
        }
      });
      rep(cam, 0.35, 260, (x, i) => {
        R(ctx, x + 40, 170, 6, 118, "#f4f4f4");
        const a = t * 1.5 + i;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          ctx.moveTo(x + 43, 170);
          ctx.lineTo(x + 43 + Math.cos(a + (k * Math.PI * 2) / 3) * 42, 170 + Math.sin(a + (k * Math.PI * 2) / 3) * 42);
        }
        ctx.stroke();
        if (hash(i + 3) < 0.5) {
          R(ctx, x + 150, 206, 64, 82, "#f4f4f4");
          R(ctx, x + 176, 220, 12, 32, "#e53935");
          R(ctx, x + 166, 230, 32, 12, "#e53935");
        } else {
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = "#1d4ed8";
            ctx.fillRect(x + 150 + k * 22, 262 - k * 2, 18, 8);
            R(ctx, x + 158 + k * 22, 270, 2, 18, "#555");
          }
        }
        circle(ctx, x + 232, 262, 14, "#2e7d32");
        R(ctx, x + 230, 272, 4, 16, "#6b4423");
      });
      break;
    case "tribunal":
      rep(cam, 0.1, 200, (x) => {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(x + 40, 100, 120, FLOOR - 100);
        ctx.beginPath();
        ctx.arc(x + 100, 100, 60, Math.PI, 0);
        ctx.fill();
      });
      rep(cam, 0.38, 180, (x, i) => {
        R(ctx, x + 30, 0, 26, FLOOR, "#f1ede2");
        R(ctx, x + 36, 0, 2, FLOOR, "#d9d3c3");
        R(ctx, x + 46, 0, 2, FLOOR, "#d9d3c3");
        R(ctx, x + 26, 0, 34, 12, "#e2dccb");
        if (i % 3 === 0) {
          R(ctx, x + 108, 76, 3, 60, "#c9a227");
          R(ctx, x + 90, 82, 40, 3, "#c9a227");
          R(ctx, x + 86, 98, 14, 2, "#c9a227");
          R(ctx, x + 119, 98, 14, 2, "#c9a227");
          R(ctx, x + 90, 85, 1, 13, "#c9a227");
          R(ctx, x + 129, 85, 1, 13, "#c9a227");
        }
      });
      break;
    case "rrhh":
      rep(cam, 0.1, 220, (x, i) => {
        R(ctx, x + 30, 50, 140, 100, "#6b7f91");
        R(ctx, x + 34, 54, 132, 92, "#9fc3e0");
        for (let k = 0; k < 5; k++) {
          const hh = 20 + hash(i * 5 + k) * 50;
          R(ctx, x + 38 + k * 25, 146 - hh, 20, hh, "#7aa5c4");
        }
        R(ctx, x + 98, 54, 4, 92, "#6b7f91");
      });
      rep(cam, 0.35, 300, (x, i) => {
        R(ctx, x + 20, 90, 150, 90, "#8a8a8a");
        R(ctx, x + 23, 93, 144, 84, "#fafafa");
        R(ctx, x + 80, 100, 30, 14, "#3498db");
        R(ctx, x + 94, 114, 2, 10, "#555555");
        R(ctx, x + 50, 124, 90, 2, "#555555");
        for (const bx of [36, 82, 128]) {
          R(ctx, x + bx, 126, 26, 12, i % 2 ? "#e67e22" : "#27ae60");
          R(ctx, x + bx + 12, 124, 2, 2, "#555555");
        }
        circle(ctx, x + 222, 100, 18, "#37474f");
        circle(ctx, x + 222, 100, 15, "#ffffff");
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 222, 100);
        ctx.lineTo(x + 222 + Math.cos(t) * 9, 100 + Math.sin(t) * 9);
        ctx.moveTo(x + 222, 100);
        ctx.lineTo(x + 222, 90);
        ctx.stroke();
        R(ctx, x + 250, 258, 18, 30, "#a0522d");
        circle(ctx, x + 259, 250, 12, "#2e8b57");
        R(ctx, x + 180, 244, 62, 6, "#7b5a3a");
        R(ctx, x + 184, 250, 4, 38, "#5e4429");
        R(ctx, x + 234, 250, 4, 38, "#5e4429");
      });
      break;
    case "tesoro":
      rep(cam, 0.08, 600, (x) => {
        circle(ctx, x + 300, 150, 124, "#c9a227");
        circle(ctx, x + 300, 150, 112, "#2f4858");
        ctx.strokeStyle = "#c9a227";
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = t * 0.2 + (k * Math.PI) / 2;
          ctx.moveTo(x + 300 - Math.cos(a) * 90, 150 - Math.sin(a) * 90);
          ctx.lineTo(x + 300 + Math.cos(a) * 90, 150 + Math.sin(a) * 90);
        }
        ctx.stroke();
        circle(ctx, x + 300, 150, 18, "#c9a227");
      });
      rep(cam, 0.35, 170, (x, i) => {
        R(ctx, x, 110, 150, 178, "#34495e");
        for (let r = 0; r < 6; r++)
          for (let c = 0; c < 4; c++) {
            R(ctx, x + 6 + c * 35, 116 + r * 28, 30, 24, "#46627a");
            R(ctx, x + 18 + c * 35, 126 + r * 28, 6, 4, "#f1c40f");
          }
        for (let k = 0; k < 3; k++) {
          const hh = 10 + hash(i * 3 + k) * 26;
          R(ctx, x + 156 + k * 3, FLOOR - hh, 12, hh, "#f1c40f");
          R(ctx, x + 156 + k * 3, FLOOR - hh, 12, 2, "#fff1a8");
        }
        ctx.fillStyle = "rgba(241,196,15,0.5)";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.fillText("€", x + 80, 90 + Math.sin(t * 2 + i) * 6);
      });
      break;
    case "examen":
      rep(cam, 0.05, 300, (x, i) => {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.moveTo(x + 150, 0);
        ctx.lineTo(x + 40 + (i % 2) * 20, FLOOR);
        ctx.lineTo(x + 260 - (i % 2) * 20, FLOOR);
        ctx.fill();
      });
      rep(cam, 0.35, 200, (x, i) => {
        R(ctx, x + 20, 230, 80, 6, "#6b4f8a");
        R(ctx, x + 26, 236, 4, 52, "#4a3668");
        R(ctx, x + 90, 236, 4, 52, "#4a3668");
        R(ctx, x + 38, 224, 24, 6, "#ffffff");
        R(ctx, x + 70, 222, 14, 8, "#ffffff");
        if (i % 3 === 0) {
          circle(ctx, x + 110, 80, 24, "#ece7f7");
          ctx.strokeStyle = "#222";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 110, 80);
          ctx.lineTo(x + 110 + Math.cos(t * 0.5) * 14, 80 + Math.sin(t * 0.5) * 14);
          ctx.moveTo(x + 110, 80);
          ctx.lineTo(x + 110, 64);
          ctx.stroke();
        }
      });
      break;
  }

  const tint = th.tints[sub % th.tints.length];
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }
  if (boss) {
    ctx.fillStyle = `rgba(120,0,20,${0.2 + 0.07 * Math.sin(t * 3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawTile(ctx: Ctx, th: Theme, type: number, x: number, y: number, t: number) {
  const g = th.ground;
  const b = th.brick;
  switch (type) {
    case 1:
      R(ctx, x, y, T, T, g.fill);
      R(ctx, x, y, T, 5, g.top);
      R(ctx, x, y + 5, T, 2, g.trim);
      R(ctx, x + T - 1, y + 7, 1, T - 7, g.line);
      R(ctx, x + 5, y + 14, 3, 2, g.line);
      break;
    case 2:
      R(ctx, x, y, T, T, g.fill);
      R(ctx, x + T - 1, y, 1, T, g.line);
      R(ctx, x, y + T - 1, T, 1, g.line);
      R(ctx, x + 12, y + 8, 4, 2, g.line);
      break;
    case 3:
      R(ctx, x, y, T, T, b.face);
      R(ctx, x, y + 11, T, 2, b.line);
      R(ctx, x + 11, y, 2, 11, b.line);
      R(ctx, x + 5, y + 13, 2, 11, b.line);
      R(ctx, x + 17, y + 13, 2, 11, b.line);
      R(ctx, x, y, T, 2, b.hi);
      R(ctx, x, y + T - 1, T, 1, b.line);
      break;
    case 4: {
      const k = Math.floor(t * 4) % 4;
      R(ctx, x, y, T, T, "#8a5a00");
      R(ctx, x + 1, y + 1, T - 2, T - 2, k === 0 ? "#ffd85a" : "#f5b21b");
      R(ctx, x + 1, y + 1, T - 2, 2, "#ffe58a");
      R(ctx, x + 2, y + 2, 2, 2, "#8a5a00");
      R(ctx, x + T - 4, y + 2, 2, 2, "#8a5a00");
      R(ctx, x + 2, y + T - 4, 2, 2, "#8a5a00");
      R(ctx, x + T - 4, y + T - 4, 2, 2, "#8a5a00");
      ctx.fillStyle = "#6b3f00";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("?", x + T / 2 + 1, y + 18);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("?", x + T / 2, y + 17);
      break;
    }
    case 5:
      R(ctx, x, y, T, T, "#5e5348");
      R(ctx, x + 1, y + 1, T - 2, T - 2, "#8c7f70");
      R(ctx, x + 2, y + 2, 2, 2, "#5e5348");
      R(ctx, x + T - 4, y + 2, 2, 2, "#5e5348");
      break;
  }
}
