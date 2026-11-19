import * as THREE from "three";

const GOLD = 0xc9a24b;
const GOLD_LIGHT = 0xe6c97a;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createHall(
  canvas: HTMLCanvasElement,
  opts: { endZ?: number; endFov?: number; startAt?: number } = {},
) {
  const endZ = opts.endZ ?? -24; // where the camera stops (the gate flies deeper than the room)
  const endFov = opts.endFov ?? 70;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x050504);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050504, 8, 44);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 90);
  scene.add(camera);

  const materials: THREE.Material[] = [];
  const mat = <T extends THREE.Material>(m: T) => (materials.push(m), m);
  const dark = mat(
    new THREE.MeshStandardMaterial({
      color: 0x15130f,
      roughness: 0.5,
      metalness: 0.4,
    }),
  );
  const floorMat = mat(
    new THREE.MeshStandardMaterial({
      color: 0x0c0b09,
      roughness: 0.22,
      metalness: 0.85,
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
    new THREE.MeshBasicMaterial({ color: 0xd9b45f, fog: false }),
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

  // ---- the wall with the door opening (opening: 3 wide, 3.6 tall) ----
  box(12, 7, 0.4, dark, -7.5, 3.5, 0);
  box(12, 7, 0.4, dark, 7.5, 3.5, 0);
  box(3, 3.4, 0.4, dark, 0, 5.3, 0);
  box(0.08, 3.6, 0.5, gold, -1.5, 1.8, 0.02);
  box(0.08, 3.6, 0.5, gold, 1.5, 1.8, 0.02);
  box(3.08, 0.08, 0.5, gold, 0, 3.6, 0.02);

  // ---- two doors, each on a hinge at the outer edge ----
  const makeDoor = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.5, 0, 0);
    scene.add(pivot);
    const dir = -side; // the door extends from the hinge toward the center
    box(1.5, 3.6, 0.14, dark, dir * 0.75, 1.8, 0, pivot);
    box(1.0, 2.6, 0.02, gold, dir * 0.75, 1.8, 0.075, pivot); // gold inset panel
    box(0.05, 0.5, 0.06, gold, dir * 1.38, 1.7, 0.1, pivot); // handle
    return pivot;
  };
  const leftDoor = makeDoor(-1);
  const rightDoor = makeDoor(1);

  // ---- the hall behind the doors ----
  const plane = (w: number, h: number, m: THREE.Material) =>
    new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  const floor = plane(10, 36, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -18.3);
  const ceiling = plane(10, 36, dark);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 7, -18.3);
  const wallL = plane(36, 7, dark);
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-5, 3.5, -18.3);
  const wallR = plane(36, 7, dark);
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(5, 3.5, -18.3);
  const endWall = plane(10, 7, dark);
  endWall.position.set(0, 3.5, -36);
  scene.add(floor, ceiling, wallL, wallR, endWall);

  const endGlow = plane(3.2, 5, beacon); // the light at the far end
  endGlow.position.set(0, 2.5, -35.9);
  scene.add(endGlow);

  // columns, with gold rings and a glowing strip
  for (let i = 0; i < 7; i++) {
    for (const x of [-4, 4]) {
      const z = -4 - i * 4.6;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 7, 20),
        dark,
      );
      col.position.set(x, 3.5, z);
      scene.add(col);
      for (const y of [0.3, 6.7]) {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.44, 0.44, 0.12, 20),
          gold,
        );
        ring.position.set(x, y, z);
        scene.add(ring);
      }
      box(0.05, 6, 0.05, glow, x * 0.9, 3.5, z + 0.5);
    }
  }

  // gold lines on the floor and ceiling: their convergence sells the depth
  for (const x of [-1.2, 1.2]) {
    box(0.06, 0.01, 36, glow, x, 0.01, -18.3);
    box(0.06, 0.01, 36, glow, x, 6.99, -18.3);
  }

  // ---- lights (intensities may need tuning by eye) ----
  scene.add(new THREE.AmbientLight(0x4a3f2c, 1.4));
  const lamps: [number, number, number, number][] = [
    [0, 5.5, -8, 110],
    [0, 5.5, -22, 110],
    [0, 4, 5, 45],
  ];
  for (const [x, y, z, intensity] of lamps) {
    const l = new THREE.PointLight(0xffd88a, intensity, 30, 2);
    l.position.set(x, y, z);
    scene.add(l);
  }
  const headlamp = new THREE.PointLight(0xffe2a8, 25, 14, 2);
  camera.add(headlamp);

  // ---- timeline (p goes from 0 to 1) ----
  let startZ = 7;
  let currentP = opts.startAt ?? 0; // 1 = start already inside the hall
  function update(p: number) {
    currentP = p;
    const open = ease(seg(p, 0.1, 0.42)) * 1.75; // radians, about 100 degrees
    leftDoor.rotation.y = open; // swings away from the viewer
    rightDoor.rotation.y = -open;
    const travel = ease(seg(p, 0.28, 1));
    camera.position.set(0, 1.7, startZ + (endZ - startZ) * travel);
    camera.fov = 55 + (endFov - 55) * ease(seg(p, 0.5, 1));
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    startZ = w / h < 1 ? 10 : 7; // step back on portrait phones so both doors fit
    update(currentP);
    renderer.render(scene, camera);
  }
  window.addEventListener("resize", resize);
  resize();

  let raf = 0;
  let disposed = false;
  let playing: Promise<void> | null = null;

  // Safe to call twice (React strict mode): the second call returns the first run.
  function play(seconds: number) {
    if (playing) return playing;
    playing = new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        if (disposed) return resolve();
        const p = clamp01((now - start) / 1000 / seconds);
        update(p);
        renderer.render(scene, camera);
        if (p < 1) raf = requestAnimationFrame(tick);
        else resolve();
      };
      raf = requestAnimationFrame(tick);
    });
    return playing;
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    materials.forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { play, dispose };
}
