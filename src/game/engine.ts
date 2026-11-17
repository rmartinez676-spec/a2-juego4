import { H, ROWS, T, W, type DiffCfg } from "./config";
import type { EnemyKind, LevelData } from "./level";
import type { WorldDef } from "./worlds";
import { drawBackground, drawTile } from "./render";
import { drawBook, drawBoss, drawChest, drawCoin, drawDoor, drawEnemy, drawFlag, drawHeart, drawPerson } from "./sprites";
import { CHARACTERS, LIA, character } from "./characters";
import { audio } from "./audio";

export type GameEvent =
  | { t: "npc"; i: number }
  | { t: "block"; i: number }
  | { t: "chest" }
  | { t: "goal" }
  | { t: "book" }
  | { t: "dead" }
  | { t: "bossDown" };

export interface EngineOpts {
  level: LevelData;
  world: WorldDef;
  diff: DiffCfg;
  sub: number;
  title: string;
  label: string;
  onEvent: (e: GameEvent) => void;
}

interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}
interface Enemy extends Body {
  kind: EnemyKind;
  alive: boolean;
  dir: number;
  t: number;
  homeX: number;
  homeY: number;
  squish: number;
  hopT: number;
  ground: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}
interface Proj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grav: boolean;
  life: number;
}
interface BossState extends Body {
  hp: number;
  max: number;
  state: "walk" | "windup" | "jump" | "dying";
  stateT: number;
  actT: number;
  stun: number;
  flash: number;
  dir: number;
  t: number;
  done: boolean;
}

const STEP = 1 / 60;
const GRAV = 1500;
const MAXFALL = 720;
const SPEED = 138;
const JUMP = 590;
const FLOOR = 12 * T;

const overlap = (a: Body, b: Body, m = 0) => a.x + m < b.x + b.w && a.x + a.w - m > b.x && a.y + m < b.y + b.h && a.y + a.h - m > b.y;

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private lv: LevelData;
  private world: WorldDef;
  private diff: DiffCfg;
  private sub: number;
  private title: string;
  private label: string;
  private emit: (e: GameEvent) => void;

  private p = { x: 0, y: 0, w: 14, h: 30, vx: 0, vy: 0, face: 1 as 1 | -1, ground: false, coyote: 0, jumpBuf: 0, invuln: 0, anim: 0 };
  private cp: { x: number; y: number };
  private enemies: Enemy[] = [];
  private coins: { x: number; y: number; got: boolean; ph: number }[] = [];
  private npcs: { x: number; y: number; who: string; near: boolean }[] = [];
  private talked: boolean[] = [];
  private bump = new Map<string, number>();
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private keys = { left: false, right: false, jump: false, act: false };
  private virt = { left: false, right: false, jump: false, act: false };
  private prevJump = false;
  private prevAct = false;
  private cam = 0;
  private time = 0;
  private banner = 2.8;
  private cooldown = 0;
  private chestOpen = false;
  private flagOn = false;
  private boss?: BossState;
  private projs: Proj[] = [];
  private book?: { x: number; y: number };
  private bookT = 3;
  private shake = 0;

  paused = false;
  over = false;
  hearts: number;
  maxHearts: number;
  score = 0;
  coinCount = 0;
  heartsLost = 0;
  blocksOk = 0;

  constructor(private canvas: HTMLCanvasElement, o: EngineOpts) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = W;
    canvas.height = H;
    this.lv = o.level;
    this.world = o.world;
    this.diff = o.diff;
    this.sub = o.sub;
    this.title = o.title;
    this.label = o.label;
    this.emit = o.onEvent;
    this.hearts = this.maxHearts = o.diff.hearts;
    this.p.x = this.lv.spawn.x;
    this.p.y = this.lv.spawn.y;
    this.cp = { ...this.lv.spawn };

    for (const e of this.lv.enemies) {
      const dims = e.kind === "walker" ? [18, 16] : e.kind === "hopper" ? [16, 18] : [20, 16];
      const top = e.kind === "flyer" ? e.y : e.y - dims[1];
      this.enemies.push({ kind: e.kind, x: e.x - dims[0] / 2, y: top, w: dims[0], h: dims[1], vx: 0, vy: 0, alive: true, dir: -1, t: Math.random() * 6, homeX: e.x, homeY: top, squish: 0, hopT: 0.5 + Math.random(), ground: false });
    }
    this.coins = this.lv.coins.map((c) => ({ ...c, got: false, ph: Math.random() * 6 }));
    this.npcs = this.lv.npcs.map((n) => ({ ...n, near: false }));
    this.talked = this.npcs.map(() => false);

    if (this.lv.isBoss) {
      const d = o.world.boss;
      const hp = o.diff.bossHp + (o.world.id === 7 ? 3 : 0);
      this.boss = { x: 19 * T, y: FLOOR - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp, max: hp, state: "walk", stateT: 0, actT: 2.2, stun: 0, flash: 0, dir: -1, t: 0, done: false };
      this.banner = 3.4;
      this.bookT = 2.5;
    }
    this.cam = this.lv.isBoss ? (this.lv.cols * T - W) / 2 : 0;

    window.addEventListener("keydown", this.kd);
    window.addEventListener("keyup", this.ku);
  }

  // ---------- entrada ----------
  private kd = (e: KeyboardEvent) => this.onKey(e, true);
  private ku = (e: KeyboardEvent) => this.onKey(e, false);
  private onKey(e: KeyboardEvent, down: boolean) {
    const k = e.key.toLowerCase();
    const map: Record<string, "left" | "right" | "jump" | "act"> = {
      arrowleft: "left", a: "left", arrowright: "right", d: "right",
      arrowup: "jump", w: "jump", " ": "jump", z: "jump", k: "jump",
      e: "act", x: "act", j: "act", enter: "act", arrowdown: "act", s: "act",
    };
    const m = map[k];
    if (!m) return;
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
    this.keys[m] = down;
  }
  setVirtual(k: "left" | "right" | "jump" | "act", v: boolean) {
    this.virt[k] = v;
  }

  // ---------- ciclo ----------
  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.1) dt = 0.1;
      if (!this.paused && !this.over) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 6 && !this.paused && !this.over) {
          this.update(STEP);
          this.acc -= STEP;
          n++;
        }
        if (n >= 6) this.acc = 0;
      } else if (this.over) this.updateFx(dt);
      this.time += dt;
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.kd);
    window.removeEventListener("keyup", this.ku);
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.prevJump = true;
    this.prevAct = true;
    this.acc = 0;
  }
  finish() {
    this.over = true;
  }
  stats() {
    return { hearts: this.hearts, maxHearts: this.maxHearts, score: this.score, coins: this.coinCount, talked: this.talked.filter(Boolean).length, npcs: this.npcs.length, heartsLost: this.heartsLost, blocksOk: this.blocksOk };
  }

  // ---------- resultados desde la interfaz ----------
  blockResult(i: number, ok: boolean) {
    this.resume();
    const b = this.lv.blocks[i];
    const bx = b ? b.c * T + T / 2 : this.p.x;
    const by = b ? b.r * T : this.p.y;
    if (ok) {
      this.blocksOk++;
      this.score += 100;
      this.coinCount += 3;
      audio.sfx("correct");
      this.float(bx, by - 6, "+100", "#ffe066");
      if (this.hearts < this.maxHearts) {
        this.hearts++;
        this.float(bx, by - 20, "☕ +1♥", "#ff8a95");
      }
      this.burst(bx, by - 4, "#ffd23c", 10);
    } else {
      audio.sfx("wrong");
      this.float(bx, by - 6, "¡Casi!", "#ffffff");
    }
  }
  chestResult(score: number) {
    this.resume();
    this.chestOpen = true;
    const c = this.lv.chest;
    const pts = Math.round(score * 300);
    this.score += pts;
    this.coinCount += Math.round(score * 10);
    if (c) {
      this.float(c.x, c.y - 30, `+${pts}`, "#ffe066");
      this.burst(c.x, c.y - 14, "#ffd23c", 16);
    }
    if (score >= 0.75 && this.hearts < this.maxHearts) this.hearts++;
    audio.sfx(score >= 0.5 ? "correct" : "wrong");
  }
  goalFail() {
    this.resume();
    this.cooldown = 1.6;
    this.p.x = Math.max(0, this.p.x - 50);
    this.p.vx = -140;
  }
  bossResult(ok: boolean) {
    this.resume();
    const b = this.boss;
    this.bookT = 3.2;
    if (!b) return;
    if (ok) {
      b.hp--;
      b.stun = 2.8;
      b.flash = 0.5;
      this.projs = [];
      this.score += 250;
      audio.sfx("bossHit");
      this.shake = 0.4;
      this.burst(b.x + b.w / 2, b.y + b.h / 2, "#ffe066", 22);
      if (b.hp <= 0) {
        b.state = "dying";
        b.t = 0;
      } else this.float(b.x + b.w / 2, b.y - 10, "¡IMPACTO!", "#ffe066");
    } else {
      audio.sfx("wrong");
      this.loseHeart();
      this.p.invuln = 1.2;
      this.float(this.p.x, this.p.y - 8, "¡Error!", "#ff8a95");
    }
  }

  // ---------- física ----------
  private solid(c: number, r: number) {
    if (c < 0 || c >= this.lv.cols) return true;
    if (r < 0 || r >= ROWS) return false;
    return this.lv.tiles[c][r] > 0;
  }
  private moveX(e: Body, dx: number) {
    e.x += dx;
    const t0 = Math.floor(e.y / T);
    const t1 = Math.floor((e.y + e.h - 0.01) / T);
    if (dx > 0) {
      const c = Math.floor((e.x + e.w - 0.01) / T);
      for (let r = t0; r <= t1; r++)
        if (this.solid(c, r)) {
          e.x = c * T - e.w;
          e.vx = 0;
          return true;
        }
    } else if (dx < 0) {
      const c = Math.floor(e.x / T);
      for (let r = t0; r <= t1; r++)
        if (this.solid(c, r)) {
          e.x = (c + 1) * T;
          e.vx = 0;
          return true;
        }
    }
    return false;
  }
  private moveY(e: Body, dy: number) {
    e.y += dy;
    let ground = false;
    let quiz: { c: number; r: number } | undefined;
    const c0 = Math.floor(e.x / T);
    const c1 = Math.floor((e.x + e.w - 0.01) / T);
    if (dy > 0) {
      const r = Math.floor((e.y + e.h) / T);
      if (r >= 0)
        for (let c = c0; c <= c1; c++)
          if (this.solid(c, r)) {
            e.y = r * T - e.h;
            e.vy = 0;
            ground = true;
            break;
          }
    } else if (dy < 0) {
      const r = Math.floor(e.y / T);
      let hit = false;
      for (let c = c0; c <= c1; c++)
        if (this.solid(c, r)) {
          hit = true;
          if (this.lv.tiles[c]?.[r] === 4 && !quiz) quiz = { c, r };
        }
      if (hit) {
        e.y = (r + 1) * T;
        e.vy = 0;
      }
    }
    return { ground, quiz };
  }

  private float(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, life: 1.1, color });
  }
  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6 + Math.random() * 0.4, max: 1, color, size: 2 + Math.floor(Math.random() * 3) });
    }
  }
  private updateFx(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 22 * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const [k, v] of this.bump) {
      if (v - dt <= 0) this.bump.delete(k);
      else this.bump.set(k, v - dt);
    }
    this.shake = Math.max(0, this.shake - dt);
  }

  private loseHeart() {
    this.hearts--;
    this.heartsLost++;
    if (this.hearts <= 0) this.die();
  }
  private hurt(fromX: number) {
    const p = this.p;
    if (p.invuln > 0 || this.over) return;
    p.invuln = 1.6;
    p.vy = -250;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 160;
    audio.sfx("hurt");
    this.float(p.x, p.y - 8, "-1♥", "#ff8a95");
    this.loseHeart();
  }
  private die() {
    if (this.over) return;
    this.over = true;
    audio.sfx("lose");
    this.emit({ t: "dead" });
  }
  private fall() {
    audio.sfx("hurt");
    this.loseHeart();
    if (this.over) return;
    this.p.x = this.cp.x;
    this.p.y = this.cp.y;
    this.p.vx = this.p.vy = 0;
    this.p.invuln = 1.5;
  }

  private update(dt: number) {
    const p = this.p;
    const lv = this.lv;
    this.banner = Math.max(0, this.banner - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.updateFx(dt);

    const left = this.keys.left || this.virt.left;
    const right = this.keys.right || this.virt.right;
    const jump = this.keys.jump || this.virt.jump;
    const act = this.keys.act || this.virt.act;
    const jumpEdge = jump && !this.prevJump;
    const actEdge = act && !this.prevAct;
    this.prevJump = jump;
    this.prevAct = act;

    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    p.vx += (ax * SPEED - p.vx) * Math.min(1, (p.ground ? 18 : 10) * dt);
    if (!ax && Math.abs(p.vx) < 4) p.vx = 0;
    if (ax) p.face = ax > 0 ? 1 : -1;

    p.coyote = p.ground ? 0.1 : p.coyote - dt;
    p.jumpBuf = jumpEdge ? 0.12 : p.jumpBuf - dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -JUMP;
      p.jumpBuf = 0;
      p.coyote = 0;
      p.ground = false;
      audio.sfx("jump");
    }
    if (!jump && p.vy < -220) p.vy = -220;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    this.moveX(p, p.vx * dt);
    const r = this.moveY(p, p.vy * dt);
    p.ground = r.ground;
    p.anim += dt * (Math.abs(p.vx) / 60 + 0.1);
    if (r.quiz) {
      const { c, r: row } = r.quiz;
      if (lv.tiles[c][row] === 4) {
        lv.tiles[c][row] = 5;
        this.bump.set(`${c},${row}`, 0.18);
        audio.sfx("block");
        const i = lv.blocks.findIndex((b) => b.c === c && b.r === row);
        this.paused = true;
        this.emit({ t: "block", i });
        return;
      }
    }
    if (p.y > (ROWS + 1) * T) {
      this.fall();
      return;
    }

    // cámara
    if (!lv.isBoss) {
      const target = Math.max(0, Math.min(lv.cols * T - W, p.x + p.w / 2 - W * 0.42));
      this.cam += (target - this.cam) * Math.min(1, 8 * dt);
    }

    const pcx = p.x + p.w / 2;
    const feet = p.y + p.h;

    // checkpoint
    if (!this.flagOn && lv.checkpoint.x !== lv.spawn.x && pcx > lv.checkpoint.x) {
      this.flagOn = true;
      this.cp = { x: lv.checkpoint.x, y: lv.checkpoint.y };
      audio.sfx("door");
      this.float(lv.checkpoint.x, lv.checkpoint.y - 20, "¡Punto de control!", "#9dffb5");
    }

    // monedas
    for (const c of this.coins) {
      if (c.got) continue;
      if (Math.abs(c.x - pcx) < 13 && Math.abs(c.y - (p.y + p.h / 2)) < 18) {
        c.got = true;
        this.coinCount++;
        this.score += 10;
        audio.sfx("coin");
      }
    }

    // NPC
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i];
      n.near = Math.abs(pcx - n.x) < 38 && Math.abs(feet - n.y) < 30;
      if (n.near && ((!this.talked[i] && p.ground) || actEdge)) {
        this.talked[i] = true;
        this.paused = true;
        audio.sfx("click");
        this.emit({ t: "npc", i });
        return;
      }
    }

    // cofre
    const ch = lv.chest;
    if (ch && !this.chestOpen && this.cooldown <= 0 && Math.abs(pcx - ch.x) < 18 && Math.abs(feet - ch.y) < 24) {
      this.paused = true;
      this.cooldown = 1;
      this.emit({ t: "chest" });
      return;
    }
    // meta
    const g = lv.goal;
    if (g && this.cooldown <= 0 && Math.abs(pcx - g.x) < 22 && p.y < g.y && p.y + p.h > g.y - 80) {
      this.paused = true;
      audio.sfx("door");
      this.emit({ t: "goal" });
      return;
    }

    this.updateEnemies(dt);
    if (this.over) return;
    if (this.boss) this.updateBoss(dt);
  }

  private updateEnemies(dt: number) {
    const p = this.p;
    const sp = this.diff.enemy;
    for (const e of this.enemies) {
      if (!e.alive) {
        e.squish -= dt;
        continue;
      }
      e.t += dt;
      if (e.kind === "flyer") {
        e.x = e.homeX - e.w / 2 + Math.sin(e.t * 1.1 * sp) * 70;
        e.y = e.homeY + Math.sin(e.t * 2.4) * 10;
        e.dir = Math.cos(e.t * 1.1 * sp) > 0 ? 1 : -1;
      } else {
        if (e.kind === "walker") e.vx = e.dir * 34 * sp;
        else {
          if (e.ground) e.vx = 0;
          e.hopT -= dt;
          if (e.ground && e.hopT <= 0) {
            e.vy = -300;
            e.hopT = 1.1 + Math.random() * 0.8;
            e.vx = e.dir * 55 * sp;
          }
        }
        e.vy = Math.min(MAXFALL, e.vy + GRAV * dt);
        const hit = this.moveX(e, e.vx * dt);
        if (hit) {
          e.dir = -e.dir;
          e.vx = -e.vx;
        }
        e.ground = this.moveY(e, e.vy * dt).ground;
        if (e.kind === "walker" && e.ground) {
          const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
          if (!this.solid(Math.floor(fx / T), Math.floor((e.y + e.h + 2) / T))) e.dir = -e.dir;
        }
        if (e.y > (ROWS + 2) * T) e.alive = false;
        if (e.hopT < 0.5 && e.kind === "hopper") e.dir = p.x < e.x ? -1 : 1;
      }
      if (e.alive && overlap(p, e, 2)) {
        if (p.vy > 0 && p.y + p.h - e.y < 15) {
          e.alive = false;
          e.squish = 0.4;
          p.vy = this.keys.jump || this.virt.jump ? -420 : -270;
          this.score += 100;
          audio.sfx("stomp");
          this.float(e.x, e.y - 4, "+100", "#ffffff");
          this.burst(e.x + e.w / 2, e.y + e.h / 2, "#f4f4f4", 6);
        } else this.hurt(e.x + e.w / 2);
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.squish > 0);
  }

  private updateBoss(dt: number) {
    const b = this.boss!;
    const p = this.p;
    const lv = this.lv;
    if (b.state === "dying") {
      b.t += dt;
      if (Math.random() < 0.6) this.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, ["#ffe066", "#ff8a65", "#ffffff"][Math.floor(Math.random() * 3)], 3);
      if (b.t > 2.2 && !b.done) {
        b.done = true;
        this.over = true;
        audio.sfx("win");
        this.emit({ t: "bossDown" });
      }
      return;
    }
    b.flash = Math.max(0, b.flash - dt);
    const rage = b.hp <= b.max / 2;
    const sp = this.diff.enemy * (rage ? 1.3 : 1);
    const pcx = p.x + p.w / 2;
    if (b.stun > 0) {
      b.stun -= dt;
      b.vx = 0;
    } else {
      b.t += dt;
      b.dir = pcx < b.x + b.w / 2 ? -1 : 1;
      if (b.state === "walk") {
        b.x += b.dir * 46 * sp * dt;
        b.actT -= dt;
        if (b.actT <= 0) {
          const r = Math.random();
          if (r < 0.55) {
            b.state = "windup";
            b.stateT = 0.6;
          } else if (r < 0.85) {
            b.state = "jump";
            b.vy = -470;
            b.vx = b.dir * 95 * sp;
          } else b.actT = 1.2;
        }
      } else if (b.state === "windup") {
        b.stateT -= dt;
        if (b.stateT <= 0) {
          this.bossShoot(rage);
          b.state = "walk";
          b.actT = (rage ? 1.1 : 2) + Math.random() * 1.2;
        }
      } else if (b.state === "jump") b.x += b.vx * dt;
    }
    b.vy += GRAV * dt;
    b.y += b.vy * dt;
    if (b.y + b.h >= FLOOR) {
      b.y = FLOOR - b.h;
      if (b.state === "jump" && b.vy > 0) {
        b.state = "walk";
        b.actT = 1.2;
        this.shake = 0.25;
        audio.sfx("block");
      }
      b.vy = 0;
    }
    b.x = Math.max(T, Math.min(lv.cols * T - T - b.w, b.x));
    if (b.stun <= 0 && overlap(p, b, 4)) this.hurt(b.x + b.w / 2);

    for (const q of this.projs) {
      q.x += q.vx * dt;
      if (q.grav) {
        q.vy += 900 * dt;
        q.y += q.vy * dt;
      }
      q.life -= dt;
      if (q.grav && q.y + q.r >= FLOOR) {
        q.life = 0;
        this.burst(q.x, FLOOR - 4, this.world.boss.proj, 6);
      }
      if (Math.abs(q.x - pcx) < q.r + p.w / 2 - 2 && Math.abs(q.y - (p.y + p.h / 2)) < q.r + p.h / 2 - 3) {
        q.life = 0;
        this.hurt(q.x);
      }
      if (q.x < 0 || q.x > lv.cols * T) q.life = 0;
    }
    this.projs = this.projs.filter((q) => q.life > 0);

    this.bookT -= dt;
    if (!this.book && b.stun <= 0 && this.bookT <= 0) {
      const pr = lv.perches[Math.floor(Math.random() * lv.perches.length)];
      this.book = { x: pr.x - 7, y: pr.y - 22 };
    }
    if (this.book && Math.abs(this.book.x + 7 - pcx) < 14 && Math.abs(this.book.y + 8 - (p.y + p.h / 2)) < 20) {
      this.book = undefined;
      this.paused = true;
      audio.sfx("coin");
      this.emit({ t: "book" });
    }
  }

  private bossShoot(rage: boolean) {
    const b = this.boss!;
    const p = this.p;
    const dir = b.dir;
    audio.sfx("tick");
    if (Math.random() < 0.5) {
      this.projs.push({ x: b.x + (dir > 0 ? b.w : 0), y: FLOOR - 9, vx: dir * (125 + (rage ? 40 : 0)) * this.diff.enemy, vy: 0, r: 8, grav: false, life: 5 });
    } else {
      const n = rage ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const dx = p.x + p.w / 2 - (b.x + b.w / 2) + (i ? 70 : 0);
        this.projs.push({ x: b.x + b.w / 2, y: b.y + 14, vx: Math.max(-200, Math.min(200, dx / 0.92)), vy: -320, r: 7, grav: true, life: 4 });
      }
    }
  }

  // ---------- dibujo ----------
  private txt(s: string, x: number, y: number, col = "#fff", al: CanvasTextAlign = "left", size = 8) {
    const c = this.ctx;
    c.font = `${size}px PS2P, monospace`;
    c.textAlign = al;
    c.fillStyle = "rgba(0,0,0,0.65)";
    c.fillText(s, x + 1, y + 1);
    c.fillStyle = col;
    c.fillText(s, x, y);
  }

  private render() {
    const ctx = this.ctx;
    const lv = this.lv;
    const th = this.world.theme;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 6));
    const cam = Math.round(this.cam);
    drawBackground(ctx, th, this.sub, cam, this.time, lv.isBoss);
    ctx.save();
    ctx.translate(-cam, 0);

    const c0 = Math.max(0, Math.floor(cam / T));
    const c1 = Math.min(lv.cols - 1, c0 + Math.ceil(W / T) + 1);
    for (let c = c0; c <= c1; c++)
      for (let r = 0; r < ROWS; r++) {
        const tt = lv.tiles[c][r];
        if (!tt) continue;
        let y = r * T;
        const bt = this.bump.get(`${c},${r}`);
        if (bt) y -= Math.sin((bt / 0.18) * Math.PI) * 6;
        drawTile(ctx, th, tt, c * T, y, this.time);
      }

    if (lv.checkpoint.x !== lv.spawn.x) drawFlag(ctx, lv.checkpoint.x, lv.checkpoint.y + 40, this.flagOn, this.time);
    if (lv.chest) drawChest(ctx, lv.chest.x, lv.chest.y, this.chestOpen, this.time);
    if (lv.goal) drawDoor(ctx, lv.goal.x, lv.goal.y, this.time);
    for (const c of this.coins) if (!c.got) drawCoin(ctx, c.x, c.y, this.time, c.ph);

    const pcx = this.p.x + this.p.w / 2;
    this.npcs.forEach((n, i) => {
      const ch = character(n.who);
      drawPerson(ctx, ch.look, n.x, n.y, { face: pcx < n.x ? -1 : 1, state: n.near ? "talk" : "idle", t: this.time + i });
      ctx.font = "8px PS2P, monospace";
      if (!this.talked[i]) {
        const by = n.y - 62 + Math.sin(this.time * 6) * 3;
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(n.x - 6, by - 10, 12, 14);
        ctx.fillStyle = "#b3202a";
        ctx.textAlign = "center";
        ctx.fillText("!", n.x + 1, by + 2);
      }
      if (n.near) this.txt(ch.name, n.x, n.y - 50, "#ffffff", "center", 7);
    });

    if (this.book) drawBook(ctx, this.book.x, this.book.y, this.time);
    for (const e of this.enemies) drawEnemy(ctx, e.kind, Math.round(e.x), Math.round(e.y), e.w, e.h, e.t, e.dir, e.alive ? 0 : e.squish, th.accent);

    if (this.boss) {
      const b = this.boss;
      const d = this.world.boss;
      const dead = b.state === "dying";
      if (!dead || Math.floor(this.time * 20) % 2 === 0)
        drawBoss(ctx, { kind: d.kind, color: d.color, look: d.look }, Math.round(b.x), Math.round(b.y), b.w, b.h, this.time, { face: b.dir, flash: b.flash > 0 && Math.floor(this.time * 30) % 2 === 0, stun: b.stun > 0, rage: b.hp <= b.max / 2, wind: b.state === "windup" || b.state === "jump" });
      for (const q of this.projs) {
        ctx.fillStyle = d.proj;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(q.x + 2, q.y + 2, q.r - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // jugadora
    const p = this.p;
    if (p.invuln <= 0 || Math.floor(this.time * 14) % 2 === 0) {
      const state = !p.ground ? "jump" : Math.abs(p.vx) > 14 ? "walk" : "idle";
      drawPerson(ctx, LIA, p.x + p.w / 2, p.y + p.h, { face: p.face, state, t: p.anim * 1.2 + (state === "idle" ? this.time : 0) });
    }

    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2));
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) this.txt(f.text, f.x, f.y, f.color, "center", 8);
    ctx.restore();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, 24);
    for (let i = 0; i < this.maxHearts; i++) drawHeart(ctx, 8 + i * 13, 8, i < this.hearts);
    this.txt(this.label, 8, 21, "#ffe066", "left", 7);
    this.txt(`PTS ${String(this.score).padStart(5, "0")}`, W - 104, 11, "#ffffff", "right", 8);
    this.txt(`●x${String(this.coinCount).padStart(2, "0")}`, W - 104, 21, "#ffd23c", "right", 7);
    if (this.boss) {
      const bw = 220;
      const bx = (W - bw) / 2;
      ctx.fillStyle = "#220";
      ctx.fillRect(bx - 2, 5, bw + 4, 10);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(bx, 7, (bw * Math.max(0, this.boss.hp)) / this.boss.max, 6);
      this.txt(this.world.boss.nombre.toUpperCase(), W / 2, 22, "#ffffff", "center", 6);
    } else this.txt(this.title, W / 2, 14, "#ffffff", "center", 7);

    if (this.banner > 0) {
      const a = Math.min(1, this.banner * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 120, W, 86);
      if (this.boss) {
        this.txt("¡JEFE FINAL!", W / 2, 148, "#ff6b6b", "center", 14);
        this.txt(this.world.boss.nombre, W / 2, 172, "#ffffff", "center", 10);
        const tn = this.world.boss.taunts[0];
        this.txt(tn.length > 52 ? tn.slice(0, 52) + "…" : tn, W / 2, 194, "#ffe066", "center", 7);
      } else {
        this.txt(`MUNDO ${this.label}`, W / 2, 150, "#ffe066", "center", 14);
        this.txt(this.title.length > 44 ? this.title.slice(0, 44) + "…" : this.title, W / 2, 178, "#ffffff", "center", 8);
        this.txt(this.world.nombre, W / 2, 196, "#9dd6ff", "center", 7);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

export { CHARACTERS };
