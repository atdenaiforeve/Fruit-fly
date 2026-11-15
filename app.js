(() => {
  const ground = document.getElementById("habitatGround");
  const groundCtx = ground.getContext("2d");
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const state = {
    running: false, elapsed: 0, lastFrame: 0, frame: 0,
    fly: { x: 0.5, y: 0.5, angle: 0.2, energy: 100, hunger: 0, hydration: 100 },
    food: { x: 0.27, y: 0.66, amount: 100 },
    water: { x: 0.76, y: 0.34, amount: 100 },
    events: []
  };
  let width = 0, height = 0, dpr = 1, raf = 0;

  function drawGround() {
    const w = window.innerWidth, h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    ground.style.height = h + "px";
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ground.width = Math.round(w * ratio); ground.height = Math.round(h * ratio);
    groundCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    groundCtx.clearRect(0, 0, w, h);
    const tile = Math.max(92, Math.min(150, w / 8));
    const angle = -0.105, cx = w / 2, cy = h / 2;
    const cols = Math.ceil((w + h) / tile) + 4, rows = Math.ceil((w + h) / tile) + 4;
    const points = [];
    for (let r = -2; r < rows; r++) {
      points[r] = [];
      for (let c = -2; c < cols; c++) {
        const gx = (c - cols / 2) * tile, gy = (r - rows / 2) * tile;
        const seed = Math.sin((c + 17) * 127.1 + (r + 29) * 311.7) * 43758.5453;
        const seed2 = Math.sin((c + 43) * 269.5 + (r + 11) * 183.3) * 24634.6345;
        const jx = (seed - Math.floor(seed) - .5) * 10;
        const jy = (seed2 - Math.floor(seed2) - .5) * 10;
        points[r][c] = {
          x: cx + gx * Math.cos(angle) - gy * Math.sin(angle) + jx,
          y: cy + gx * Math.sin(angle) + gy * Math.cos(angle) + jy + gy * gy * .000025
        };
      }
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = points[r][c], b = points[r][c+1], d = points[r+1][c], e = points[r+1][c+1];
      const shade = ((r + c) % 2 === 0) ? 1 : 0;
      const base = shade ? 48 : 25;
      const variation = Math.round((Math.sin(c * 8.2 + r * 3.7) + 1) * 5);
      groundCtx.beginPath(); groundCtx.moveTo(a.x,a.y); groundCtx.lineTo(b.x,b.y); groundCtx.lineTo(e.x,e.y); groundCtx.lineTo(d.x,d.y); groundCtx.closePath();
      groundCtx.fillStyle = `rgb(${base+variation},${base+variation},${base+variation+2})`;
      groundCtx.fill();
      groundCtx.strokeStyle = "rgba(0,0,0,.28)"; groundCtx.lineWidth = 2; groundCtx.stroke();
      groundCtx.strokeStyle = "rgba(220,220,225,.025)"; groundCtx.lineWidth = 1;
      groundCtx.beginPath(); groundCtx.moveTo(a.x+2,a.y+2); groundCtx.lineTo(b.x-2,b.y-2); groundCtx.stroke();
    }
    const shade = groundCtx.createRadialGradient(cx,cy,Math.min(w,h)*.12,cx,cy,Math.max(w,h)*.78);
    shade.addColorStop(0,"rgba(0,0,0,0)"); shade.addColorStop(1,"rgba(0,0,0,.32)");
    groundCtx.fillStyle = shade; groundCtx.fillRect(0,0,w,h);
  }

  function resize() {
    drawGround();
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function log(message) {
    const total = Math.floor(state.elapsed);
    const time = String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
    state.events.unshift({ time, message });
    state.events = state.events.slice(0, 5);
    $("eventLog").innerHTML = state.events.map(e => "<p><time>" + e.time + "</time><span>" + e.message + "</span></p>").join("");
  }
  function drawPlant(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.strokeStyle = "#719c70"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(-4, 0, 0, -16); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 - 1.1;
      ctx.fillStyle = i % 2 ? "#6d9d72" : "#8ab27b";
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 10, -8 + Math.sin(a) * 9, 9, 4, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawResource(resource, type) {
    const x = resource.x * width, y = resource.y * height;
    ctx.save();
    if (type === "food") {
      ctx.fillStyle = "#8e5f3d"; ctx.beginPath(); ctx.ellipse(x, y, 23, 16, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c58b56"; ctx.beginPath(); ctx.ellipse(x - 3, y - 3, 18, 12, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#668c58"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 3, y - 13); ctx.lineTo(x + 7, y - 21); ctx.stroke();
      ctx.fillStyle = "#d7a66e"; ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.fillText("FOOD", x, y + 31);
    } else {
      ctx.fillStyle = "#3b8791"; ctx.beginPath(); ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#80cbd2"; ctx.beginPath(); ctx.ellipse(x - 3, y - 3, 15, 7, -.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a8e2e0"; ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.fillText("WATER", x, y + 29);
    }
    ctx.restore();
  }
  function drawFly() {
    const x = state.fly.x * width, y = state.fly.y * height;
    ctx.save(); ctx.translate(x, y); ctx.rotate(state.fly.angle);
    ctx.strokeStyle = "#d4e8db"; ctx.lineWidth = 1.5;
    ctx.fillStyle = "rgba(185,222,225,.72)";
    ctx.beginPath(); ctx.ellipse(-5, -8, 7, 13, -.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-5, 8, 7, 13, .55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#bd8568"; ctx.beginPath(); ctx.arc(-10, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#273b35"; ctx.beginPath(); ctx.ellipse(1, 0, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d99b70"; ctx.beginPath(); ctx.ellipse(12, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#d5c6a4"; ctx.lineWidth = 1;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-1, side * 3); ctx.lineTo(-5, side * 12); ctx.lineTo(-10, side * 14); ctx.moveTo(4, side * 3); ctx.lineTo(7, side * 11); ctx.stroke(); }
    ctx.restore();
  }
  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    drawResource(state.food, "food"); drawResource(state.water, "water"); drawFly();
  }
  function update(dt) {
    state.elapsed += dt;
    const f = state.fly;
    f.hunger = Math.min(100, f.hunger + dt * 1.15);
    f.hydration = Math.max(0, f.hydration - dt * .42);
    f.energy = Math.max(0, f.energy - dt * .12);
    // Temporary placeholder movement for the visual prototype; not a neural model.
    const target = f.hunger > 45 ? state.food : (f.hydration < 55 ? state.water : state.food);
    const dx = target.x - f.x, dy = target.y - f.y, distance = Math.hypot(dx, dy);
    if (distance > .035) {
      f.angle = Math.atan2(dy, dx);
      const step = Math.min(distance, dt * .035);
      f.x += dx / distance * step; f.y += dy / distance * step;
    } else if (target === state.food && state.food.amount > 0) {
      f.hunger = Math.max(0, f.hunger - dt * 5); state.food.amount = Math.max(0, state.food.amount - dt * .25);
    } else if (target === state.water && state.water.amount > 0) {
      f.hydration = Math.min(100, f.hydration + dt * 6); state.water.amount = Math.max(0, state.water.amount - dt * .2);
    }
    f.x = Math.max(.06, Math.min(.94, f.x)); f.y = Math.max(.08, Math.min(.92, f.y));
    renderStats(); draw();
  }
  function renderStats() {
    const f = state.fly;
    $("positionStat").textContent = Math.round(f.x * 100) + ", " + Math.round(f.y * 100);
    $("coordinates").textContent = "X: " + Math.round(f.x * 100) + " · Y: " + Math.round(f.y * 100);
    $("energyStat").textContent = Math.round(f.energy) + "%";
    $("hungerStat").textContent = Math.round(f.hunger) + "%";
    $("waterStat").textContent = Math.round(f.hydration) + "%";
    $("foodAmount").textContent = Math.round(state.food.amount) + "%";
    $("waterAmount").textContent = Math.round(state.water.amount) + "%";
    const t = Math.floor(state.elapsed);
    $("simClock").textContent = "Day 1 · " + String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  }
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min((now - state.lastFrame) / 1000, .08);
    state.lastFrame = now; update(dt); raf = requestAnimationFrame(frame);
  }
  $("startBtn").addEventListener("click", () => {
    if (state.running) return;
    state.running = true; state.lastFrame = performance.now();
    $("startBtn").disabled = true; $("pauseBtn").disabled = false;
    $("runStatus").innerHTML = '<span class="status-dot" style="background:#86d5b5"></span> RUNNING';
    log("Simulation started. Placeholder movement is active.");
    raf = requestAnimationFrame(frame);
  });
  $("pauseBtn").addEventListener("click", () => {
    state.running = false; cancelAnimationFrame(raf);
    $("startBtn").disabled = false; $("pauseBtn").disabled = true;
    $("runStatus").innerHTML = '<span class="status-dot"></span> PAUSED';
    log("Simulation paused.");
  });
  $("resetBtn").addEventListener("click", () => {
    state.running = false; cancelAnimationFrame(raf);
    state.elapsed = 0; state.fly = { x: .5, y: .5, angle: .2, energy: 100, hunger: 0, hydration: 100 };
    state.food.amount = 100; state.water.amount = 100; state.events = [];
    $("startBtn").disabled = false; $("pauseBtn").disabled = true;
    $("runStatus").innerHTML = '<span class="status-dot"></span> PAUSED';
    log("Habitat reset. Subject #001 restored.");
    renderStats(); draw();
  });
  window.addEventListener("resize", resize);
  resize(); renderStats();
})();