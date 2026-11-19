import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const GOLD = 0xc9a24b;
const GOLD_LIGHT = 0xe6c97a;

// Room: 12 wide (x -6..6), 16 deep (z 0..-16), 5 high. The door wall is at z = 0.
const HALF_W = 6;
const ROOM_D = 16;
const ROOM_H = 5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Small seeded random, so the wood looks the same on every load.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type HallOptions = { endZ?: number; endFov?: number; startAt?: number };

export function createHall(canvas: HTMLCanvasElement, opts: HallOptions = {}) {
  const endZ = opts.endZ ?? -5.5; // where the intro stops: near the door, the whole room in view
  const endFov = opts.endFov ?? 62;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x050504);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070605, 14, 42);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 90);
  scene.add(camera);

  // Soft reflections for the gold and the floor. Low intensity so it stays moody.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  roomEnv.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.3;

  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const mat = <T extends THREE.Material>(m: T) => (materials.push(m), m);

  // ---------- procedural textures (no image files to load) ----------
  function canvasTex(
    w: number,
    h: number,
    draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
    repeatX = 1,
    repeatY = 1,
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = maxAniso;
    textures.push(t);
    return t;
  }

  const woodTex = canvasTex(
    512,
    512,
    (g, w, h) => {
      const r = rng(7);
      const strip = w / 8;
      for (let i = 0; i < 8; i++) {
        let y = -r() * 200;
        while (y < h) {
          const len = 180 + r() * 220;
          const l = 13 + r() * 7;
          g.fillStyle = `hsl(${24 + r() * 8}, ${32 + r() * 10}%, ${l}%)`;
          g.fillRect(i * strip, y, strip, len);
          for (let k = 0; k < 6; k++) {
            g.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`;
            g.lineWidth = 1;
            const x = i * strip + r() * strip;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + (r() - 0.5) * 6, y + len);
            g.stroke();
          }
          g.fillStyle = "rgba(0,0,0,0.55)"; // joint between boards
          g.fillRect(i * strip, y, strip, 2);
          y += len;
        }
        g.fillStyle = "rgba(0,0,0,0.5)"; // seam between planks
        g.fillRect(i * strip, 0, 2, h);
      }
    },
    6,
    8,
  );

  const wallPanelTex = (repeatX: number) =>
    canvasTex(
      256,
      640,
      (g, w, h) => {
        g.fillStyle = "#17140f";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#1d1913"; // raised panel
        g.fillRect(24, 40, w - 48, h * 0.72 - 40);
        g.strokeStyle = "rgba(201,162,75,0.55)";
        g.lineWidth = 3;
        g.strokeRect(24, 40, w - 48, h * 0.72 - 40);
        g.strokeStyle = "rgba(201,162,75,0.22)";
        g.lineWidth = 2;
        g.strokeRect(38, 54, w - 76, h * 0.72 - 68);
        g.fillStyle = "#120f0b"; // wainscot
        g.fillRect(0, h * 0.78, w, h * 0.22);
        g.strokeStyle = "rgba(201,162,75,0.5)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, h * 0.78);
        g.lineTo(w, h * 0.78);
        g.stroke();
        g.strokeStyle = "rgba(201,162,75,0.25)";
        g.lineWidth = 2;
        g.strokeRect(24, h * 0.8, w - 48, h * 0.17);
      },
      repeatX,
      1,
    );

  const rugTex = canvasTex(512, 768, (g, w, h) => {
    g.fillStyle = "#3a1717";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c9a24b";
    g.lineWidth = 14;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 4;
    g.strokeRect(56, 56, w - 112, h - 112);
    g.fillStyle = "#2c1111";
    g.fillRect(70, 70, w - 140, h - 140);
    g.strokeStyle = "rgba(201,162,75,0.8)";
    g.lineWidth = 5;
    g.beginPath(); // diamond in the middle
    g.moveTo(w / 2, h / 2 - 190);
    g.lineTo(w / 2 + 150, h / 2);
    g.lineTo(w / 2, h / 2 + 190);
    g.lineTo(w / 2 - 150, h / 2);
    g.closePath();
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w / 2, h / 2 - 120);
    g.lineTo(w / 2 + 95, h / 2);
    g.lineTo(w / 2, h / 2 + 120);
    g.lineTo(w / 2 - 95, h / 2);
    g.closePath();
    g.stroke();
  });

  const artTex = canvasTex(256, 340, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#2a1f12");
    grad.addColorStop(1, "#0f0c08");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(230,201,122,0.7)";
    for (let i = 1; i < 6; i++) {
      g.lineWidth = 2;
      g.beginPath();
      g.arc(w * 0.3, h * 0.7, i * 38, Math.PI, Math.PI * 1.9);
      g.stroke();
    }
  });

  // ---------- materials ----------
  const dark = mat(
    new THREE.MeshStandardMaterial({
      color: 0x15130f,
      roughness: 0.5,
      metalness: 0.4,
    }),
  );
  const gold = mat(
    new THREE.MeshStandardMaterial({
      color: GOLD,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x3a2a08,
    }),
  );
  const glow = mat(new THREE.MeshBasicMaterial({ color: GOLD_LIGHT }));
  const beacon = mat(
    new THREE.MeshBasicMaterial({ color: 0xe0bc68, fog: false }),
  );
  const ground = mat(
    new THREE.MeshStandardMaterial({
      color: 0x0a0908,
      roughness: 0.6,
      metalness: 0.3,
    }),
  );
  const floorMat = mat(
    new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.38,
      metalness: 0.05,
    }),
  );
  const rugMat = mat(
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }),
  );
  const ceilMat = mat(
    new THREE.MeshStandardMaterial({ color: 0x2a251c, roughness: 0.9 }),
  );
  const fabricTaupe = mat(
    new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 }),
  );
  const fabricTeal = mat(
    new THREE.MeshStandardMaterial({ color: 0x2f4442, roughness: 0.95 }),
  );
  const curtain = mat(
    new THREE.MeshStandardMaterial({ color: 0x4a1c1c, roughness: 1 }),
  );
  const marble = mat(
    new THREE.MeshStandardMaterial({
      color: 0xcfc6b2,
      roughness: 0.18,
      metalness: 0.05,
    }),
  );
  const artMat = mat(
    new THREE.MeshStandardMaterial({
      map: artTex,
      roughness: 0.6,
      emissive: 0x1a1308,
      emissiveMap: artTex,
    }),
  );

  const add = (m: THREE.Object3D, parent: THREE.Object3D = scene) => (
    parent.add(m),
    m
  );
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cyl = (
    rt: number,
    rb: number,
    h: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
  ) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const plane = (w: number, h: number, m: THREE.Material) =>
    new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);

  // ---------- the door wall (outside face is what you see during the intro) ----------
  box(24, 8, 0.4, dark, -13.5, 4, 0); // left of the opening
  box(24, 8, 0.4, dark, 13.5, 4, 0); // right of the opening
  box(3, 4.4, 0.4, dark, 0, 5.8, 0); // above the opening (opening is 3 wide, 3.6 tall)
  box(0.08, 3.6, 0.5, gold, -1.5, 1.8, 0.02);
  box(0.08, 3.6, 0.5, gold, 1.5, 1.8, 0.02);
  box(3.08, 0.08, 0.5, gold, 0, 3.6, 0.02);

  const outsideGround = plane(80, 40, ground);
  outsideGround.rotation.x = -Math.PI / 2;
  outsideGround.position.set(0, 0, 20);
  add(outsideGround);

  const makeDoor = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.5, 0, 0);
    scene.add(pivot);
    const dir = -side;
    box(1.5, 3.6, 0.14, dark, dir * 0.75, 1.8, 0, pivot);
    box(1.0, 2.6, 0.02, gold, dir * 0.75, 1.8, 0.075, pivot);
    box(0.05, 0.5, 0.06, gold, dir * 1.38, 1.7, 0.1, pivot);
    return pivot;
  };
  const leftDoor = makeDoor(-1);
  const rightDoor = makeDoor(1);

  // ---------- shell of the room ----------
  const cz = -ROOM_D / 2; // center z of the room
  const floor = plane(HALF_W * 2, ROOM_D, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, cz);
  const ceiling = plane(HALF_W * 2, ROOM_D, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, cz);
  const wallL = plane(
    ROOM_D,
    ROOM_H,
    mat(
      new THREE.MeshStandardMaterial({
        map: wallPanelTex(8),
        roughness: 0.55,
        metalness: 0.25,
      }),
    ),
  );
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-HALF_W, ROOM_H / 2, cz);
  const wallR = plane(
    ROOM_D,
    ROOM_H,
    mat(
      new THREE.MeshStandardMaterial({
        map: wallPanelTex(8),
        roughness: 0.55,
        metalness: 0.25,
      }),
    ),
  );
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(HALF_W, ROOM_H / 2, cz);
  const wallBack = plane(
    HALF_W * 2,
    ROOM_H,
    mat(
      new THREE.MeshStandardMaterial({
        map: wallPanelTex(6),
        roughness: 0.55,
        metalness: 0.25,
      }),
    ),
  );
  wallBack.position.set(0, ROOM_H / 2, -ROOM_D);
  scene.add(floor, ceiling, wallL, wallR, wallBack);

  rugTex.repeat.set(1, 1);
  const rug = plane(5, 7, rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, -11.2);
  add(rug);

  // skirting boards and crown moulding
  for (const x of [-HALF_W + 0.05, HALF_W - 0.05]) {
    box(0.1, 0.25, ROOM_D, gold, x, 0.125, cz);
    box(0.16, 0.2, ROOM_D, gold, x, ROOM_H - 0.1, cz);
  }
  box(HALF_W * 2, 0.25, 0.1, gold, 0, 0.125, -ROOM_D + 0.05);
  box(HALF_W * 2, 0.2, 0.16, gold, 0, ROOM_H - 0.1, -ROOM_D + 0.08);

  // cove light around the ceiling
  for (const x of [-5.3, 5.3])
    box(0.08, 0.04, 14.6, glow, x, ROOM_H - 0.04, cz);
  for (const z of [-0.8, -ROOM_D + 0.8])
    box(10.6, 0.04, 0.08, glow, 0, ROOM_H - 0.04, z);

  // ---------- window, curtains, chandelier ----------
  box(4.4, 3.4, 0.1, gold, 0, 2.7, -ROOM_D + 0.08);
  const win = plane(4, 3, beacon);
  win.position.set(0, 2.7, -ROOM_D + 0.14);
  add(win);
  for (const x of [-2.9, 2.9])
    box(1, 4.4, 0.35, curtain, x, 2.5, -ROOM_D + 0.3);
  box(7.4, 0.06, 0.06, gold, 0, 4.7, -ROOM_D + 0.4);

  const chandelier = new THREE.Group();
  chandelier.position.set(0, ROOM_H, -8);
  scene.add(chandelier);
  cyl(0.012, 0.012, 1.2, gold, 0, -0.6, 0, chandelier);
  for (const [r, y] of [
    [0.85, -1.2],
    [0.45, -1.0],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 40), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    chandelier.add(ring);
    const n = r > 0.6 ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow);
      bulb.position.set(Math.cos(a) * r, y + 0.08, Math.sin(a) * r);
      chandelier.add(bulb);
    }
  }

  // ---------- furniture ----------
  const sofa = new THREE.Group();
  sofa.position.set(0, 0, -14.3);
  scene.add(sofa);
  box(3.2, 0.4, 1.0, fabricTaupe, 0, 0.3, 0, sofa);
  for (const x of [-0.72, 0.72])
    box(1.4, 0.18, 0.8, fabricTaupe, x, 0.58, 0.05, sofa);
  box(3.2, 0.85, 0.25, fabricTaupe, 0, 0.9, -0.38, sofa);
  for (const x of [-0.72, 0.72])
    box(1.4, 0.5, 0.2, fabricTaupe, x, 0.95, -0.2, sofa);
  for (const x of [-1.6, 1.6])
    box(0.25, 0.65, 1.0, fabricTaupe, x, 0.62, 0, sofa);
  for (const x of [-1.3, 1.3])
    for (const z of [-0.4, 0.4]) cyl(0.03, 0.03, 0.12, gold, x, 0.06, z, sofa);

  for (const side of [-1, 1] as const) {
    const chair = new THREE.Group();
    chair.position.set(side * 2.7, 0, -11.6);
    chair.rotation.y = -side * 0.6; // turned toward the middle of the room
    scene.add(chair);
    box(0.9, 0.35, 0.9, fabricTeal, 0, 0.28, 0, chair);
    box(0.7, 0.14, 0.7, fabricTeal, 0, 0.52, 0.05, chair);
    box(0.9, 0.75, 0.2, fabricTeal, 0, 0.75, -0.35, chair);
    for (const x of [-0.5, 0.5])
      box(0.14, 0.45, 0.8, fabricTeal, x, 0.5, 0, chair);
  }

  const table = new THREE.Group();
  table.position.set(0, 0, -11.9);
  scene.add(table);
  box(1.5, 0.05, 0.8, marble, 0, 0.42, 0, table);
  for (const x of [-0.65, 0.65])
    for (const z of [-0.32, 0.32]) box(0.04, 0.4, 0.04, gold, x, 0.2, z, table);
  cyl(0.08, 0.1, 0.3, gold, 0.3, 0.6, 0, table);

  // console table with a lamp, left wall
  box(0.5, 0.06, 2.2, dark, -HALF_W + 0.3, 0.85, -8);
  for (const z of [-8.9, -7.1])
    for (const dx of [-0.2, 0.2])
      box(0.04, 0.82, 0.04, gold, -HALF_W + 0.3 + dx, 0.41, z);
  cyl(0.05, 0.08, 0.3, gold, -HALF_W + 0.3, 1.03, -8);
  cyl(0.14, 0.2, 0.26, glow, -HALF_W + 0.3, 1.3, -8);

  // framed art on both side walls (a good place for project images later)
  const frame = (x: number, z: number, dir: 1 | -1) => {
    const g = new THREE.Group();
    g.position.set(x, 2.5, z);
    g.rotation.y = dir * (Math.PI / 2);
    scene.add(g);
    box(1.5, 1.9, 0.06, gold, 0, 0, 0, g);
    const pic = plane(1.34, 1.74, artMat);
    pic.position.z = 0.04;
    g.add(pic);
  };
  for (const z of [-4.5, -8, -11.5]) {
    frame(-HALF_W + 0.04, z, 1);
    frame(HALF_W - 0.04, z, -1);
  }

  // ---------- lights (intensities are guesses: tune by eye) ----------
  scene.add(new THREE.AmbientLight(0x4a3f2c, 0.9));
  scene.add(new THREE.HemisphereLight(0xffe6b8, 0x1a120a, 0.35));
  const lamps: [number, number, number, number, number][] = [
    [0, 3.6, -8, 90, 22], // chandelier
    [0, 2.6, -14.5, 35, 14], // window
    [0, 3.6, 3, 40, 14], // lights the doors from outside
  ];
  for (const [x, y, z, intensity, dist] of lamps) {
    const l = new THREE.PointLight(0xffd88a, intensity, dist, 2);
    l.position.set(x, y, z);
    scene.add(l);
  }
  const headlamp = new THREE.PointLight(0xffe2a8, 12, 10, 2);
  camera.add(headlamp);

  // ---------- camera: intro timeline + scroll ----------
  let startZ = 7;
  let currentP = opts.startAt ?? 0;
  let scrollTarget = 0;
  let scrollNow = 0;

  function update(p: number) {
    currentP = p;
    const open = ease(seg(p, 0.1, 0.42)) * 1.75;
    leftDoor.rotation.y = open;
    rightDoor.rotation.y = -open;
    const travel = ease(seg(p, 0.28, 1));
    const baseZ = startZ + (endZ - startZ) * travel;
    const inside = seg(p, 0.85, 1); // scrolling moves the camera only once we are inside
    const z = baseZ - scrollNow * 3.4 * inside;
    const x = Math.sin(scrollNow * Math.PI * 1.2) * 1.1 * inside;
    camera.position.set(x, 1.7, z);
    camera.lookAt(x * 0.3, 1.6, z - 10);
    camera.fov = 55 + (endFov - 55) * ease(seg(p, 0.5, 1));
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    startZ = w / h < 1 ? 10 : 7;
    update(currentP);
    renderer.render(scene, camera);
  }
  window.addEventListener("resize", resize);
  resize();

  let raf = 0;
  let disposed = false;
  let scrollRaf = 0;
  let anim: { cancel: () => void } | null = null;

  // Animates the intro progress to `to` (1 = inside the room, 0 = outside with closed doors).
  // `seconds` is the time of a full 0 to 1 run. Resolves true when it arrives, false if it was cut short.
  function animateTo(to: number, seconds: number) {
    anim?.cancel();
    return new Promise<boolean>((resolve) => {
      if (disposed) return resolve(false);
      const from = currentP;
      const dist = Math.abs(to - from);
      if (dist < 0.001) {
        update(to);
        renderer.render(scene, camera);
        return resolve(true);
      }
      const duration = seconds * dist;
      const start = performance.now();
      const me = {
        cancel: () => {
          cancelAnimationFrame(raf);
          if (anim === me) anim = null;
          resolve(false);
        },
      };
      anim = me;
      const tick = (now: number) => {
        if (disposed) return resolve(false);
        const k = clamp01((now - start) / 1000 / duration);
        update(from + (to - from) * k);
        renderer.render(scene, camera);
        if (k < 1) raf = requestAnimationFrame(tick);
        else {
          if (anim === me) anim = null;
          resolve(true);
        }
      };
      raf = requestAnimationFrame(tick);
    });
  }

  // Jump to a progress without animating.
  function snapTo(p: number) {
    anim?.cancel();
    update(p);
    renderer.render(scene, camera);
  }

  // 0..1 page scroll progress. Eased, and renders only while it is still moving.
  function setScroll(s: number) {
    scrollTarget = clamp01(s);
    if (scrollRaf || disposed) return;
    const step = () => {
      scrollRaf = 0;
      if (disposed) return;
      scrollNow += (scrollTarget - scrollNow) * 0.12;
      if (Math.abs(scrollTarget - scrollNow) < 0.0005) scrollNow = scrollTarget;
      if (!anim) {
        update(currentP);
        renderer.render(scene, camera);
      }
      if (scrollNow !== scrollTarget) scrollRaf = requestAnimationFrame(step);
    };
    scrollRaf = requestAnimationFrame(step);
  }

  function dispose() {
    disposed = true;
    anim?.cancel();
    cancelAnimationFrame(raf);
    cancelAnimationFrame(scrollRaf);
    window.removeEventListener("resize", resize);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    play: (seconds: number) => animateTo(1, seconds).then(() => undefined), // used by the gate
    animateTo,
    snapTo,
    setScroll,
    dispose,
  };
}
