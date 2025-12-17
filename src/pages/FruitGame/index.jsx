import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Clamp a number into the inclusive range [min, max].
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Return a random floating-point number in the range [min, max).
 */
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Compute the squared distance from point P(px, py) to segment AB.
 * Using squared distance avoids an extra square root for performance.
 */
function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abLenSquared = abx * abx + aby * aby;
  if (abLenSquared === 0) return apx * apx + apy * apy;

  let t = (apx * abx + apy * aby) / abLenSquared;
  t = clamp(t, 0, 1);

  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  const dx = px - closestX;
  const dy = py - closestY;
  return dx * dx + dy * dy;
}

function segmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
  const d2 = distanceToSegmentSquared(cx, cy, ax, ay, bx, by);
  return d2 <= r * r;
}

/**
 * Convert a pointer (client) position into canvas-local coordinates.
 */
function getCanvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return { x, y };
}

export default function FruitGame() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastFrameRef = useRef(0);

  const fruitsRef = useRef([]);
  const particlesRef = useRef([]);
  const slashesRef = useRef([]);
  const nextIdRef = useRef(1);
  const spawnRef = useRef({ nextSpawnAt: 0, levelTime: 0 });

  const pointerRef = useRef({
    down: false,
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastMoveAt: 0,
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 540 });

  const fruitPalette = useMemo(
    () => [
      { name: 'Apple', color: '#ef4444' },
      { name: 'Orange', color: '#f97316' },
      { name: 'Lime', color: '#84cc16' },
      { name: 'Blueberry', color: '#3b82f6' },
      { name: 'Grape', color: '#a855f7' },
      { name: 'Peach', color: '#fb7185' },
    ],
    []
  );

  /**
   * Resize the canvas to match its container and devicePixelRatio.
   */
  function resizeCanvas() {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = clamp(Math.floor(window.innerHeight * 0.62), 420, 640);
    setCanvasSize({ width, height });

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Small helper to update multiple state slices with optional values.
   */
  function setGameState({ nextRunning, nextGameOver, nextScore, nextLives }) {
    if (typeof nextRunning === 'boolean') setRunning(nextRunning);
    if (typeof nextGameOver === 'boolean') setGameOver(nextGameOver);
    if (typeof nextScore === 'number') setScore(nextScore);
    if (typeof nextLives === 'number') setLives(nextLives);
  }

  /**
   * Reset all in-memory world entities and timers.
   */
  function resetWorld() {
    fruitsRef.current = [];
    particlesRef.current = [];
    slashesRef.current = [];
    spawnRef.current = { nextSpawnAt: 0, levelTime: 0 };
    pointerRef.current.down = false;
  }

  /**
   * Start (or restart) a new game.
   */
  function startGame() {
    resetWorld();
    setGameState({ nextScore: 0, nextLives: 3, nextGameOver: false });
    lastFrameRef.current = performance.now();
    spawnRef.current.nextSpawnAt = lastFrameRef.current + 300;
    setRunning(true);
  }

  /**
   * End the current game and switch UI into "Game Over" state.
   */
  const endGame = useCallback(() => {
    setRunning(false);
    setGameOver(true);
  }, []);

  /**
   * Spawn a fruit (or bomb) with randomized initial position and velocity.
   */
  const spawnFruit = useCallback((now, width, height) => {
    const bombChance = clamp(0.09 + spawnRef.current.levelTime / 120000, 0.09, 0.18);
    const isBomb = Math.random() < bombChance;
    const baseRadius = isBomb
      ? randomBetween(18, 24)
      : randomBetween(20, 32);
    const x = randomBetween(baseRadius + 8, width - baseRadius - 8);
    const y = height + baseRadius + 10;
    const vy = -randomBetween(820, 1040);
    const vx = randomBetween(-220, 220);

    let fruitMeta = fruitPalette[Math.floor(Math.random() * fruitPalette.length)];
    if (isBomb) fruitMeta = { name: 'Bomb', color: '#111827' };

    fruitsRef.current.push({
      id: nextIdRef.current++,
      x,
      y,
      vx,
      vy,
      r: baseRadius,
      type: fruitMeta.name,
      color: fruitMeta.color,
      spawnedAt: now,
      isBomb,
    });
  }, [fruitPalette]);

  /**
   * Create a burst of particles at (x, y) for slice/bomb feedback.
   */
  const addParticles = useCallback((x, y, color, amount) => {
    for (let i = 0; i < amount; i += 1) {
      particlesRef.current.push({
        x,
        y,
        vx: randomBetween(-220, 220),
        vy: randomBetween(-240, 120),
        size: randomBetween(2, 5),
        life: randomBetween(220, 420),
        color,
      });
    }
  }, []);

  /**
   * Handle a pointer swipe segment and apply slice logic against all fruits.
   */
  const handleSliceSegment = useCallback((ax, ay, bx, by) => {
    const fruits = fruitsRef.current;
    let sliced = false;

    for (let i = fruits.length - 1; i >= 0; i -= 1) {
      const fruit = fruits[i];
      if (!segmentIntersectsCircle(ax, ay, bx, by, fruit.x, fruit.y, fruit.r)) {
        continue;
      }

      if (fruit.isBomb) {
        addParticles(fruit.x, fruit.y, '#ef4444', 28);
        fruits.splice(i, 1);
        endGame();
        return;
      }

      addParticles(fruit.x, fruit.y, fruit.color, 18);
      fruits.splice(i, 1);
      sliced = true;
    }

    if (sliced) setScore(prev => prev + 1);
  }, [addParticles, endGame, setScore]);

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    /**
     * Pointer down starts a swipe trail.
     */
    const onPointerDown = e => {
      canvas.setPointerCapture(e.pointerId);
      const p = getCanvasPoint(canvas, e.clientX, e.clientY);
      pointerRef.current.down = true;
      pointerRef.current.x = p.x;
      pointerRef.current.y = p.y;
      pointerRef.current.lastX = p.x;
      pointerRef.current.lastY = p.y;
      pointerRef.current.lastMoveAt = performance.now();
    };

    /**
     * Pointer move updates trail segments and triggers slice checks when running.
     */
    const onPointerMove = e => {
      if (!pointerRef.current.down) return;

      const p = getCanvasPoint(canvas, e.clientX, e.clientY);
      const ax = pointerRef.current.lastX;
      const ay = pointerRef.current.lastY;
      const bx = p.x;
      const by = p.y;

      pointerRef.current.x = bx;
      pointerRef.current.y = by;
      pointerRef.current.lastX = bx;
      pointerRef.current.lastY = by;

      const dx = bx - ax;
      const dy = by - ay;
      if (dx * dx + dy * dy < 36) return;

      const now = performance.now();
      pointerRef.current.lastMoveAt = now;

      slashesRef.current.push({ ax, ay, bx, by, bornAt: now, ttl: 120 });
      if (running) handleSliceSegment(ax, ay, bx, by);
    };

    /**
     * Pointer up cancels the current swipe.
     */
    const onPointerUp = () => {
      pointerRef.current.down = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [handleSliceSegment, running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    /**
     * Paint the background and grid.
     */
    function drawBackground(width, height) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#020617');
      gradient.addColorStop(1, '#0b1220');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      const spacing = 32;
      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    /**
     * Draw one fruit (or bomb) based on its current world state.
     */
    function drawFruit(fruit) {
      ctx.save();

      if (fruit.isBomb) {
        ctx.fillStyle = fruit.color;
        ctx.beginPath();
        ctx.arc(fruit.x, fruit.y, fruit.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(fruit.x + fruit.r * 0.45, fruit.y - fruit.r * 0.55, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fruit.x + fruit.r * 0.15, fruit.y - fruit.r * 0.85);
        ctx.lineTo(fruit.x + fruit.r * 0.55, fruit.y - fruit.r * 1.2);
        ctx.stroke();

        ctx.restore();
        return;
      }

      ctx.fillStyle = fruit.color;
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        fruit.x - fruit.r * 0.35,
        fruit.y - fruit.r * 0.35,
        fruit.r * 0.42,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }

    /**
     * Draw all particles in the current frame.
     */
    function drawParticles(particles) {
      for (const p of particles) {
        const alpha = clamp(p.life / 420, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /**
     * Draw recent swipe trail segments with fade-out.
     */
    function drawSlashes(now) {
      for (const s of slashesRef.current) {
        const age = now - s.bornAt;
        const t = clamp(1 - age / s.ttl, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.9 * t;
        ctx.strokeStyle = '#e0e7ff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay);
        ctx.lineTo(s.bx, s.by);
        ctx.stroke();
        ctx.restore();
      }
    }

    /**
     * Per-frame update loop (spawn, simulate, render).
     */
    function tick(now) {
      const width = canvasSize.width;
      const height = canvasSize.height;
      const dt = Math.min(0.034, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      drawBackground(width, height);

      if (running && !gameOver) {
        spawnRef.current.levelTime += dt * 1000;

        if (spawnRef.current.nextSpawnAt <= now) {
          spawnFruit(now, width, height);

          const minDelay = clamp(580 - spawnRef.current.levelTime / 600, 320, 580);
          const maxDelay = clamp(900 - spawnRef.current.levelTime / 700, 520, 920);
          spawnRef.current.nextSpawnAt = now + randomBetween(minDelay, maxDelay);
        }
      }

      const gravity = 1500;
      const drag = 0.995;

      const fruits = fruitsRef.current;
      for (let i = fruits.length - 1; i >= 0; i -= 1) {
        const fruit = fruits[i];
        fruit.vy += gravity * dt;
        fruit.vx *= drag;
        fruit.x += fruit.vx * dt;
        fruit.y += fruit.vy * dt;

        if (fruit.x < fruit.r) {
          fruit.x = fruit.r;
          fruit.vx *= -0.8;
        } else if (fruit.x > width - fruit.r) {
          fruit.x = width - fruit.r;
          fruit.vx *= -0.8;
        }

        if (fruit.y - fruit.r > height + 40) {
          fruits.splice(i, 1);
          if (!fruit.isBomb && running && !gameOver) {
            setLives(prev => {
              const next = prev - 1;
              if (next <= 0) endGame();
              return next;
            });
          }
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.vy += gravity * 0.75 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1000;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = slashesRef.current.length - 1; i >= 0; i -= 1) {
        const s = slashesRef.current[i];
        if (now - s.bornAt > s.ttl) slashesRef.current.splice(i, 1);
      }

      for (const fruit of fruits) drawFruit(fruit);
      drawParticles(particles);
      drawSlashes(now);

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [canvasSize.height, canvasSize.width, endGame, gameOver, running, spawnFruit]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">切水果</h1>
            <p className="mt-2 text-sm text-slate-300">
              按住并滑动鼠标/手指切水果，切到炸弹会直接结束。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/70"
            >
              返回菜单
            </Link>
            <button
              type="button"
              onClick={startGame}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              {running ? '重开' : '开始'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div ref={containerRef} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <canvas
              ref={canvasRef}
              className="block w-full rounded-xl bg-slate-950"
              style={{ touchAction: 'none' }}
              aria-label="Fruit game canvas"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm text-slate-300">Score</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">
              {score}
            </div>

            <div className="mt-5 text-sm text-slate-300">Lives</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {lives}
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="font-medium text-slate-100">玩法</div>
              <div className="mt-2">- 切到水果 +1 分</div>
              <div className="mt-1">- 漏掉水果 -1 命</div>
              <div className="mt-1">- 切到炸弹：游戏结束</div>
            </div>

            {gameOver && (
              <div className="mt-6 rounded-xl bg-red-500/15 p-4">
                <div className="text-sm font-medium text-red-200">
                  Game Over
                </div>
                <div className="mt-1 text-sm text-red-200/80">
                  点击“重开”再来一局。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
