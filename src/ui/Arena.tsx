import { useEffect, useRef } from 'react';
import { ARENA, armMotion, type LogEntry } from '../game/combat';
import type { CombatView } from '../game/combat/types';
import {
  monster,
  oval,
  rect,
  pixelItem,
  puppetBounds,
  room,
  roomLights,
  type Pen,
} from '../art/pixel';
import { puppetLayout } from '../art/puppet';
import type { Build } from '../game/types';
import { prepareCanvas } from '../art/canvas';

const arenaScenery = new Image();
arenaScenery.src = `${import.meta.env.BASE_URL}ui/arena-chamber-v1.png`;
let arenaSceneryReady = false;
void arenaScenery
  .decode()
  .then(() => {
    arenaSceneryReady = true;
  })
  .catch(() => {});
// Measured floor landmarks register generated scenery to the unchanged combat ellipse.
const ARENA_ART_FLOOR = { cx: 0.5, cy: 0.604, rx: 0.395, ry: 0.307 };

const displayStage = new Image();
displayStage.src = `${import.meta.env.BASE_URL}ui/display-step-v2.png`;
const portraitAlcove = new Image();
portraitAlcove.src = `${import.meta.env.BASE_URL}ui/quartermaster-alcove-v2.png`;
const landscapeAlcove = new Image();
landscapeAlcove.src = `${import.meta.env.BASE_URL}ui/quartermaster-alcove-landscape-v2.png`;
const portraitClinic = new Image();
portraitClinic.src = `${import.meta.env.BASE_URL}ui/clinic-alcove-v1.png`;
const landscapeClinic = new Image();
landscapeClinic.src = `${import.meta.env.BASE_URL}ui/clinic-alcove-landscape-v1.png`;
let alcoveReady = false;
void Promise.all([
  portraitAlcove.decode(),
  landscapeAlcove.decode(),
  portraitClinic.decode(),
  landscapeClinic.decode(),
])
  .then(() => {
    alcoveReady = true;
  })
  .catch(() => {});
let displayStageReady = false;
void displayStage
  .decode()
  .then(() => {
    displayStageReady = true;
  })
  .catch(() => {});

function text(c: Pen, value: string, x: number, y: number, colour: string, size = 10) {
  c.font = `bold ${size}px monospace`;
  c.textAlign = 'center';
  c.fillStyle = '#121018';
  c.fillText(value, Math.round(x) + 1, Math.round(y) + 1);
  c.fillStyle = colour;
  c.fillText(value, Math.round(x), Math.round(y));
}
function effect(c: Pen, e: LogEntry, time: number, reduced: boolean) {
  const age = time - e.time;
  if (age < 0 || age > 1) return;
  const x = e.tx ?? e.x,
    y = e.ty ?? e.y;
  c.save();
  c.globalAlpha = Math.min(1, (1 - age) * 2.3);
  if (e.kind === 'damage') {
    if (e.attack === 'bolt' || e.attack === 'arrow') {
      const p = Math.min(1, age / 0.16),
        px = e.x + (x - e.x) * p,
        py = e.y + (y - e.y) * p - 36;
      if (p < 1) {
        rect(c, px - 3, py - 3, 7, 7, e.attack === 'bolt' ? '#b1b9ed' : '#e0c593');
        rect(c, px - 8, py, 6, 2, e.attack === 'bolt' ? '#796ca5' : '#a58661');
      }
    }
    if (age < 0.24) {
      const colour = e.shieldBreak
        ? '#aecbe4'
        : e.crit
          ? '#ffe0a1'
          : e.attack === 'bolt'
            ? '#b1b9ed'
            : e.attack === 'heavy'
              ? '#ecb771'
              : '#e3d8bd';
      if (e.attack === 'slash') {
        for (let i = 0; i < 7; i++) {
          const a = -1.25 + i * 0.4;
          rect(c, x + Math.cos(a) * 22, y - 25 + Math.sin(a) * 23, 5, 3, colour);
        }
      } else if (e.attack === 'heavy') {
        const p = age / 0.24;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          rect(
            c,
            x + Math.cos(a) * (8 + p * 25),
            y - 15 + Math.sin(a) * (5 + p * 13),
            5,
            3,
            colour,
          );
        }
      }
      for (let i = 0; i < 5; i++) {
        const a = (e.id + i) * 2.4,
          p = age * 75;
        rect(c, x + Math.cos(a) * p, y - 30 + Math.sin(a) * p, 2 + (i % 2), 2, colour);
      }
      if (e.shieldBreak)
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          rect(
            c,
            x + Math.cos(a) * (24 + age * 20),
            y - 28 + Math.sin(a) * (30 + age * 20),
            4,
            4,
            '#b3d5e3',
          );
        }
    }
    const value =
      (e.value ?? 0) > 0
        ? `${e.crit ? '! ' : ''}${Math.ceil(e.value!)}${e.crit ? ' !' : ''}`
        : e.shieldBreak
          ? 'BREAK'
          : 'BLOCK';
    text(
      c,
      value,
      x + ((e.id % 3) - 1) * 12,
      y - 66 - (reduced ? 0 : age * 22),
      e.crit ? '#ffe29b' : e.value === 0 ? '#c5c5db' : '#eee1c5',
      e.crit ? 14 : 11,
    );
  } else if (e.kind === 'heal') {
    text(c, `+${Math.ceil(e.value ?? 0)}`, e.x + 13, e.y - 65 - age * 20, '#bed788');
  } else if (e.kind === 'status' && age < 0.7) {
    text(
      c,
      e.status === 'poison' ? 'POISON' : 'BLEED',
      x,
      y - 82 - age * 10,
      e.status === 'poison' ? '#a7bd70' : '#d9867c',
      7,
    );
  } else if (e.kind === 'shield' && age < 0.5) {
    text(c, `+${Math.round(e.value ?? 0)} SHIELD`, e.x, e.y - 81 - age * 15, '#a8c4d7', 7);
  } else if (e.kind === 'activation' && e.actor === 'player' && age < 0.45) {
    /* item names are shown in the cooldown belt, not over every hit */
  }
  c.restore();
}
export function Arena({
  combat,
  floor,
  paused,
  onInspect,
}: {
  combat: CombatView;
  floor: number;
  paused: boolean;
  onInspect: (build: Build) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef({ combat, paused });
  latest.current = { combat, paused };
  useEffect(() => {
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    const backdrop = document.createElement('canvas');
    backdrop.width = ARENA.width;
    backdrop.height = ARENA.height;
    room(backdrop.getContext('2d')!, floor);
    let scenicBackdrop = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0,
      doneAt = 0;
    function draw(now: number) {
      if (!canvas.current) return;
      const { combat: sim, paused: stopped } = latest.current;
      if (arenaSceneryReady && !scenicBackdrop) {
        const sx = ARENA.rx / (arenaScenery.naturalWidth * ARENA_ART_FLOOR.rx);
        const sy = ARENA.ry / (arenaScenery.naturalHeight * ARENA_ART_FLOOR.ry);
        const ctx = backdrop.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, ARENA.width, ARENA.height);
        ctx.drawImage(
          arenaScenery,
          ARENA.cx - arenaScenery.naturalWidth * ARENA_ART_FLOOR.cx * sx,
          ARENA.cy - arenaScenery.naturalHeight * ARENA_ART_FLOOR.cy * sy,
          arenaScenery.naturalWidth * sx,
          arenaScenery.naturalHeight * sy,
        );
        scenicBackdrop = true;
      }
      if (sim.done && !doneAt) doneAt = now;
      const time = sim.time + (sim.done && !stopped ? (now - doneAt) / 1000 : 0);
      const small = canvas.current!.clientWidth < 680,
        w = small ? 400 : 640,
        h = (w * canvas.current!.clientHeight) / Math.max(1, canvas.current!.clientWidth);
      prepareCanvas(c!, w, h);
      c!.clearRect(0, 0, w, h);
      c!.save();
      const alive = sim.actors.filter((a) => a.hp > 0),
        subjects = alive.length ? alive : sim.actors;
      const renderScale = (a: CombatView['actors'][number]) =>
        a.side === 'player' ? 1.1 : /Ogre|Brute/.test(a.build.name) ? 1.25 : 0.91;
      const minX = Math.min(
          ...subjects.map((a) => a.x + puppetBounds(a.build).left * renderScale(a)),
        ),
        maxX = Math.max(...subjects.map((a) => a.x + puppetBounds(a.build).right * renderScale(a)));
      const minY = Math.min(
          ...subjects.map((a) => a.y + puppetBounds(a.build).top * renderScale(a)),
        ),
        maxY = Math.max(
          ...subjects.map((a) => a.y + puppetBounds(a.build).bottom * renderScale(a)),
        );
      const left = small ? minX : Math.min(0, minX - 8),
        right = small ? maxX : Math.max(640, maxX + 8),
        top = small ? minY : Math.min(0, minY - 8),
        bottom = small ? maxY : Math.max(400, maxY + 8);
      const zoom = small
        ? Math.min(1.12, (w - 36) / (right - left), (h - 48) / (bottom - top))
        : Math.min(1, w / (right - left), h / (bottom - top));
      const ox = w / 2 - ((left + right) / 2) * zoom,
        oy = h / 2 - ((top + bottom) / 2) * zoom;
      c!.translate(ox, oy);
      c!.scale(zoom, zoom);
      canvas
        .current!.parentElement?.querySelectorAll<HTMLButtonElement>('.actor-target')
        .forEach((button, i) => {
          const a = alive[i];
          if (a) {
            const b = puppetLayout(a.build).torso,
              s = renderScale(a);
            button.style.left = `${(((a.x + (b.x + b.w / 2) * s) * zoom + ox) / w) * 100}%`;
            button.style.top = `${(((a.y + (b.y + b.h / 2) * s) * zoom + oy) / h) * 100}%`;
            button.style.width = `${((b.w * s * zoom) / w) * 100}%`;
            button.style.height = `${((b.h * s * zoom) / h) * 100}%`;
          }
        });
      const hit = [...sim.logs]
        .reverse()
        .find((e) => e.attack === 'heavy' && (e.value ?? 0) > 1000 && time - e.time < 0.18);
      if (hit && !reduced && !stopped)
        c!.translate(Math.round(Math.sin(time * 80) * 2), Math.round(Math.cos(time * 75) * 1));
      c!.drawImage(backdrop, 0, 0);
      if (!scenicBackdrop) roomLights(c!, reduced ? 0 : time);
      const actors = [...sim.actors].sort((a, b) => a.y - b.y);
      for (const a of actors) {
        const scale = renderScale(a);
        const dead = a.diedAt === undefined ? undefined : time - a.diedAt;
        if (a.side === 'player' && a.hp > 0) {
          oval(c!, a.x, a.y + 1, a.radius + 7, 7, '#748867');
          oval(c!, a.x, a.y, a.radius + 5, 5, '#222a25');
        }
        const hurt = !reduced && time - a.lastHit < 0.12;
        const arms = Object.fromEntries(
          a.abilities
            .filter((n) => n.slot === 'hand')
            .map((n) => {
              const motion = armMotion(a, n, time);
              return [
                n.uid,
                reduced ? { drawback: motion.drawback, facing: motion.facing } : motion,
              ];
            }),
        );
        monster(c!, a.build, a.x, a.y, scale, {
          time: reduced ? 0 : time,
          walk: a.walked,
          moving: !reduced && !stopped && a.hp > 0 && Math.hypot(a.vx, a.vy) > 5,
          facing: a.facing,
          enemy: a.side === 'enemy',
          arms,
          hurt,
          dead,
        });
        if (a.hp <= 0) continue;
        if (a.shield > 0) {
          const body = puppetLayout(a.build).torso;
          for (let i = 0; i < 20; i++) {
            const t = (i * Math.PI) / 10;
            rect(
              c!,
              a.x + Math.cos(t) * ((body.w * scale) / 2 + 6),
              a.y + (body.y + body.h / 2) * scale + Math.sin(t) * ((body.h * scale) / 2 + 8),
              3,
              3,
              '#8dadba',
            );
          }
        }
        const barY = a.y + puppetBounds(a.build).top * scale - 3,
          bw = a.side === 'player' ? 52 : 37;
        rect(c!, a.x - bw / 2 - 1, barY - 1, bw + 2, 5, '#14141a');
        rect(
          c!,
          a.x - bw / 2,
          barY,
          (bw * a.hp) / a.stats.maxHp,
          3,
          a.side === 'player' ? '#9ea86f' : '#b66963',
        );
        if (a.poison > 0) text(c!, `● ${Math.ceil(a.poison)}`, a.x - 15, barY - 5, '#acba69', 8);
        if (a.bleed > 0) text(c!, `♦ ${Math.ceil(a.bleed)}`, a.x + 18, barY - 5, '#dc8675', 8);
        if (a.windup > 0.2) {
          text(c!, '!', a.x + 30, a.y - 54, '#efb268', 14);
        }
      }
      for (const e of sim.logs
        .filter((e) => time - e.time < 1 && e.kind !== 'activation')
        .slice(-32))
        effect(c!, e, time, reduced);
      c!.restore();
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [combat, floor]);
  return (
    <div className="arena-scene">
      <canvas
        ref={canvas}
        width={640}
        height={400}
        role="img"
        aria-label={`Floor ${floor} arena. ${combat.player.build.name} fighting ${combat.enemies.map((e) => e.build.name).join(', ')}.`}
      />
      {combat.actors
        .filter((a) => a.hp > 0)
        .map((a) => (
          <button
            className="actor-target"
            key={a.id}
            aria-label={`Inspect ${a.build.name}`}
            title={`Inspect ${a.build.name}`}
            style={{ left: `${(a.x / 640) * 100}%`, top: `${((a.y - 34) / 400) * 100}%` }}
            onClick={() => onInspect(a.build)}
          />
        ))}
      {paused && <div className="paused-banner">PAUSED</div>}
    </div>
  );
}
export function DressingRoom({
  build,
  floor,
  surgery = false,
  embedded = false,
}: {
  build: Build;
  floor: number;
  surgery?: boolean;
  embedded?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(build);
  latest.current = build;
  useEffect(() => {
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    const bg = document.createElement('canvas');
    bg.width = 320;
    bg.height = 340;
    const b = bg.getContext('2d')!;
    rect(b, 0, 0, 320, 340, '#1b191f');
    for (let row = 0; row < 12; row++)
      for (let col = 0; col < 9; col++) {
        const x = col * 42 + (row % 2) * 21 - 21,
          y = row * 25;
        rect(b, x + 1, y + 1, 40, 23, (row + col) % 3 ? '#302c33' : '#373039');
        rect(b, x + 2, y + 2, 38, 2, '#443a42');
      }
    rect(b, 49, 33, 222, 228, '#17181e');
    rect(b, 57, 25, 206, 16, '#584a50');
    rect(b, 70, 17, 180, 9, '#655157');
    rect(b, 42, 43, 10, 220, '#635359');
    rect(b, 269, 43, 10, 220, '#493f48');
    for (let i = 0; i < 6; i++) {
      rect(b, 0, 263 + i * 14, 320, 13, i % 2 ? '#3d3339' : '#342d34');
      for (let j = 0; j < 7; j++) rect(b, j * 55 + (i % 2) * 25, 263 + i * 14, 1, 14, '#1b1921');
    }
    oval(b, 160, 275, 99, 27, '#1c1b21');
    oval(b, 160, 270, 92, 23, surgery ? '#52635b' : '#4b3b42');
    oval(b, 160, 266, 92, 22, surgery ? '#839080' : '#6b5055');
    oval(b, 160, 264, 83, 17, surgery ? '#657d70' : '#4e3e48');
    if (surgery) {
      rect(b, 249, 256, 45, 8, '#a1aba0');
      rect(b, 253, 264, 4, 33, '#555f60');
      pixelItem(b, 'surgery', 258, 234, 22);
      rect(b, 21, 177, 28, 59, '#36343f');
      for (let i = 0; i < 3; i++) {
        rect(b, 25 + i * 7, 183, 4, 18, '#90a786');
        rect(b, 25 + i * 7, 204, 4, 2, '#c8d0b0');
      }
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    function draw(now: number) {
      if (!canvas.current) return;
      const height = embedded
        ? (320 * canvas.current.clientHeight) / Math.max(1, canvas.current.clientWidth)
        : 340;
      const stageScale = embedded ? Math.min(1, height / 160) : 1;
      const ground = embedded ? height - 40 * stageScale : 257;
      prepareCanvas(c!, 320, height);
      c!.clearRect(0, 0, 320, height);
      c!.imageSmoothingEnabled = false;
      if (embedded) {
        if (alcoveReady) {
          const alcove = surgery
            ? height < 260
              ? landscapeClinic
              : portraitClinic
            : height < 260
              ? landscapeAlcove
              : portraitAlcove;
          const roomHeight = (320 * alcove.naturalHeight) / alcove.naturalWidth;
          c!.drawImage(alcove, 0, ground + 35 * stageScale - roomHeight * 0.93, 320, roomHeight);
        }
        if (displayStageReady)
          c!.drawImage(
            displayStage,
            64,
            303,
            1136,
            237,
            160 - 150 * stageScale,
            ground - 27 * stageScale,
            300 * stageScale,
            ((300 * 237) / 1136) * stageScale,
          );
        else {
          oval(c!, 160, ground + 13, 92, 23, '#4b3b42');
          oval(c!, 160, ground + 7, 83, 17, '#4e3e48');
        }
      } else {
        c!.drawImage(bg, 0, 0);
        torchAt(now);
      }
      const build = latest.current,
        b = puppetBounds(build, embedded),
        top = 20,
        scale = Math.min(3, (embedded ? 300 : 280) / b.width, (ground - top) / -b.top);
      monster(c!, build, 160 - ((b.left + b.right) * scale) / 2, ground, scale, {
        time: reduced ? 0 : now / 1000,
      });
      frame = requestAnimationFrame(draw);
    }
    function torchAt(now: number) {
      const t = reduced ? 0 : now / 1000;
      importTorch(c!, 30, 96, t);
      importTorch(c!, 287, 96, t);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [floor, surgery, embedded]);
  return (
    <canvas
      ref={canvas}
      className="dressing-room"
      width={640}
      height={680}
      role="img"
      aria-label={`${build.name} in ${surgery ? 'the surgery' : 'the equipment room'}`}
    />
  );
}
import { torch as importTorch } from '../art/pixel';
