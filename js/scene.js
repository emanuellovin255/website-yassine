// Escena 3D del hero: tuberías, válvula, manómetro y gotas de agua.
(function () {
  const canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = canvas.parentElement;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 18);

  // Mapa de entorno generado: "softboxes" para reflejos metálicos.
  (function buildEnvironment() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, "#1b3a7a");
    bg.addColorStop(0.5, "#07142e");
    bg.addColorStop(1, "#02060f");
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    const strip = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
    strip(80, 60, 260, 70, "#ffffff");
    strip(560, 40, 120, 180, "#dff1ff");
    strip(760, 150, 220, 40, "#ffb070");
    strip(0, 250, 1024, 10, "#5cc8ff");
    strip(380, 300, 160, 60, "#2f7bff");
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
  })();

  scene.add(new THREE.AmbientLight(0x6688cc, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 8, 10);
  scene.add(key);
  const rimBlue = new THREE.PointLight(0x3d8bff, 3, 30);
  rimBlue.position.set(-8, -2, 4);
  scene.add(rimBlue);
  const rimOrange = new THREE.PointLight(0xff7a1f, 2.5, 30);
  rimOrange.position.set(9, -6, 3);
  scene.add(rimOrange);

  // Materiales
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xe0874f, metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xdfe8f5, metalness: 1, roughness: 0.12, clearcoat: 1 });
  const blueMat = new THREE.MeshPhysicalMaterial({ color: 0x1e6bff, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const orangeMat = new THREE.MeshPhysicalMaterial({ color: 0xff5a0a, metalness: 0.2, roughness: 0.3, clearcoat: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const water = new THREE.MeshPhysicalMaterial({ color: 0x4fb8ff, metalness: 0.1, roughness: 0, transparent: true, opacity: 0.7, clearcoat: 1, emissive: 0x0a3a80, emissiveIntensity: 0.6, envMapIntensity: 2 });

  const rig = new THREE.Group();
  scene.add(rig);

  // Tubería con codos redondeados a partir de una lista de puntos
  function pipePath(points, bend) {
    const path = new THREE.CurvePath();
    const v = points.map((p) => new THREE.Vector3(...p));
    let start = v[0].clone();
    for (let i = 1; i < v.length - 1; i++) {
      const prev = v[i - 1], cur = v[i], next = v[i + 1];
      const inDir = cur.clone().sub(prev).normalize();
      const outDir = next.clone().sub(cur).normalize();
      const a = cur.clone().addScaledVector(inDir, -bend);
      const b = cur.clone().addScaledVector(outDir, bend);
      path.add(new THREE.LineCurve3(start, a));
      path.add(new THREE.QuadraticBezierCurve3(a, cur.clone(), b));
      start = b;
    }
    path.add(new THREE.LineCurve3(start, v[v.length - 1]));
    return path;
  }

  const up = new THREE.Vector3(0, 1, 0);
  function flange(pos, dir, radius, mat) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.55, radius * 1.55, 0.2, 36), mat);
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), chrome);
      const a = (i / 6) * Math.PI * 2;
      bolt.position.set(Math.cos(a) * radius * 1.3, 0, Math.sin(a) * radius * 1.3);
      g.add(bolt);
    }
    g.position.copy(pos);
    g.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    return g;
  }

  function addPipe(points, radius, mat, opts = {}) {
    const path = pipePath(points, opts.bend || 0.9);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 160, radius, 28, false), mat);
    rig.add(mesh);
    // Bridas en los tramos largos
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]);
      const b = new THREE.Vector3(...points[i]);
      const len = a.distanceTo(b);
      if (len > 3.2 && !opts.noFlange) rig.add(flange(a.clone().lerp(b, 0.5), b.clone().sub(a), radius, opts.flangeMat || mat));
    }
    // Tapas en los extremos
    [[0, 1], [points.length - 1, points.length - 2]].forEach(([i, j]) => {
      if (opts.openEnd && i === points.length - 1) return;
      const p = new THREE.Vector3(...points[i]);
      const d = p.clone().sub(new THREE.Vector3(...points[j]));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 1.25, 0.35, 28), opts.flangeMat || mat);
      cap.position.copy(p);
      cap.quaternion.setFromUnitVectors(up, d.normalize());
      rig.add(cap);
    });
    return path;
  }

  addPipe([[-9, 4.6, -1.5], [1.5, 4.6, -1.5], [1.5, 1.2, -1.5], [7, 1.2, -1.5], [7, 1.2, 2]], 0.34, copper, { flangeMat: chrome });
  addPipe([[10, 3.2, -3], [4.2, 3.2, -3], [4.2, -6.5, -3]], 0.28, chrome);
  addPipe([[-1.5, -3.2, 0.5], [9, -3.2, 0.5]], 0.24, blueMat, { flangeMat: chrome });

  // Grifo que gotea
  const spoutEnd = [-1.6, 1.4, 1.5];
  addPipe([[-3.4, 7, 1.5], [-3.4, 2.6, 1.5], [-1.6, 2.6, 1.5], spoutEnd], 0.2, chrome, { bend: 0.55, openEnd: true, noFlange: true });
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 28, 1, true), chrome);
  nozzle.position.set(spoutEnd[0], spoutEnd[1] + 0.1, spoutEnd[2]);
  rig.add(nozzle);

  // Tubo de cristal con agua fluyendo
  const glassPath = pipePath([[-14, -5.6, 0.5], [-1.5, -5.6, 0.5], [-1.5, -3.2, 0.5]], 0.9);
  rig.add(new THREE.Mesh(new THREE.TubeGeometry(glassPath, 120, 0.3, 24, false), glass));
  const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.4, 24), copper);
  endCap.position.set(-1.5, -3.2, 0.5);
  rig.add(endCap);
  const flowCount = 70;
  const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), water, flowCount);
  rig.add(flow);
  const flowOffsets = Array.from({ length: flowCount }, (_, i) => ({
    t: i / flowCount,
    r: Math.random() * 0.12,
    a: Math.random() * Math.PI * 2,
    s: 0.6 + Math.random() * 0.6,
  }));

  // Válvula con volante
  const valve = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), chrome);
  body.scale.set(1, 1.1, 1);
  valve.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 16), chrome);
  stem.rotation.x = Math.PI / 2;
  stem.position.z = 0.7;
  valve.add(stem);
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.13, 20, 64), orangeMat));
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.05, 10), orangeMat);
    spoke.position.set(0, 0.52, 0);
    const holder = new THREE.Group();
    holder.add(spoke);
    holder.rotation.z = (i / 5) * Math.PI * 2;
    wheel.add(holder);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 24), chrome);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  wheel.position.z = 1.25;
  valve.add(wheel);
  valve.position.set(4.2, -0.6, -3);
  rig.add(valve);

  // Manómetro
  const gauge = new THREE.Group();
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = faceCanvas.height = 256;
  const fc = faceCanvas.getContext("2d");
  fc.fillStyle = "#f4f8ff"; fc.beginPath(); fc.arc(128, 128, 128, 0, Math.PI * 2); fc.fill();
  fc.strokeStyle = "#0f1a2e"; fc.lineCap = "round";
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * 0.75 + (i / 20) * Math.PI * 1.5;
    const long = i % 5 === 0;
    fc.lineWidth = long ? 6 : 3;
    fc.strokeStyle = i > 15 ? "#ff5a0a" : "#0f1a2e";
    fc.beginPath();
    fc.moveTo(128 + Math.cos(a) * (long ? 82 : 92), 128 + Math.sin(a) * (long ? 82 : 92));
    fc.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    fc.stroke();
  }
  fc.fillStyle = "#0f1a2e"; fc.font = "bold 26px sans-serif"; fc.textAlign = "center";
  fc.fillText("BAR", 128, 190);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.encoding = THREE.sRGBEncoding;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.78, 48), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4 }));
  face.position.z = 0.16;
  gauge.add(face);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.1, 16, 48), chrome);
  bezel.position.z = 0.16;
  gauge.add(bezel);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.3, 48), chrome);
  housing.rotation.x = Math.PI / 2;
  gauge.add(housing);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), glass);
  lens.position.z = 0.24;
  gauge.add(lens);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.02), orangeMat);
  needle.geometry.translate(0, 0.26, 0);
  needle.position.z = 0.2;
  gauge.add(needle);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), chrome);
  neck.position.y = -1.1;
  gauge.add(neck);
  gauge.position.set(0.8, -1.9, 0.5);
  rig.add(gauge);

  // Gotas
  const dropProfile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = Math.PI * t;
    const r = Math.sin(a) * (0.5 + 0.5 * (1 - t)) * Math.pow(1 - t, 0.15);
    dropProfile.push(new THREE.Vector2(Math.max(r, 0.0001) * 0.5, -Math.cos(a) * 0.5 + t * 0.35));
  }
  const dropGeo = new THREE.LatheGeometry(dropProfile, 32);
  dropGeo.computeVertexNormals();
  dropGeo.center();

  const falling = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(dropGeo, water);
    m.userData = { delay: i * 0.55, t: 0 };
    rig.add(m);
    falling.push(m);
  }

  const floating = [];
  const floatSpots = [[0.6, 3.4, 3], [6.5, 5, 1], [8.5, -1.5, 1], [-1, -5.5, 3], [2.6, 5.8, 2.5], [-9, -7.5, 1], [6, -5.5, 2.5]];
  floatSpots.forEach((p, i) => {
    const m = new THREE.Mesh(dropGeo, water);
    const s = 0.9 + (i % 3) * 0.35;
    m.scale.setScalar(s);
    m.position.set(...p);
    m.userData = { base: new THREE.Vector3(...p), phase: i * 1.3, spin: 0.3 + (i % 4) * 0.15 };
    rig.add(m);
    floating.push(m);
  });

  // Diseño responsivo
  function layout() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w >= 1000) {
      rig.position.set(2.4, 0.2, 0);
      rig.scale.setScalar(Math.min(1, w / 1500));
    } else {
      rig.position.set(0.5, h > w ? 5.5 : 1.5, -4);
      rig.scale.setScalar(0.85);
    }
  }
  layout();
  window.addEventListener("resize", layout);

  // Interacción
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !reduceMotion) requestAnimationFrame(tick);
  }).observe(hero);

  const clock = new THREE.Clock();
  const tmp = new THREE.Object3D();
  const spout = new THREE.Vector3(spoutEnd[0], spoutEnd[1] - 0.35, spoutEnd[2]);
  let running = false;

  function update(time, dt) {
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    const scrollY = Math.min(window.scrollY, 900);
    rig.rotation.y = Math.sin(time * 0.25) * 0.12 + eased.x * 0.25 - 0.18;
    rig.rotation.x = eased.y * 0.12 + scrollY * 0.0004 + 0.06;
    rig.position.y += (Math.sin(time * 0.8) * 0.004);

    wheel.rotation.z = time * 0.6;
    needle.rotation.z = 0.9 - Math.sin(time * 0.7) * 0.5 - Math.sin(time * 2.3) * 0.08;

    flowOffsets.forEach((o, i) => {
      const t = (o.t + time * 0.08 * o.s) % 1;
      glassPath.getPointAt(t, tmp.position);
      tmp.position.x += Math.cos(o.a + time) * o.r;
      tmp.position.y += Math.sin(o.a + time) * o.r;
      tmp.scale.setScalar(0.6 + o.s * 0.5);
      tmp.updateMatrix();
      flow.setMatrixAt(i, tmp.matrix);
    });
    flow.instanceMatrix.needsUpdate = true;

    falling.forEach((d) => {
      const cycle = 2.2;
      const t = ((time + d.userData.delay) % cycle) / cycle;
      const grow = Math.min(t / 0.35, 1);
      if (t < 0.35) {
        d.position.copy(spout).y -= grow * 0.15;
        d.scale.set(grow * 0.5, grow * 0.55, grow * 0.5);
      } else {
        const f = (t - 0.35) / 0.65;
        d.position.set(spout.x, spout.y - 0.15 - f * f * 9, spout.z);
        d.scale.set(0.45, 0.55 + f * 0.35, 0.45);
      }
      d.visible = d.position.y > -8;
    });

    floating.forEach((m) => {
      const u = m.userData;
      m.position.y = u.base.y + Math.sin(time * 0.9 + u.phase) * 0.35;
      m.position.x = u.base.x + Math.cos(time * 0.5 + u.phase) * 0.2;
      m.rotation.y = time * u.spin;
      m.rotation.z = Math.sin(time * 0.6 + u.phase) * 0.35;
    });
    void dt;
  }

  function tick() {
    if (!visible || running) return;
    running = true;
    requestAnimationFrame(() => {
      running = false;
      const dt = clock.getDelta();
      update(clock.elapsedTime, dt);
      renderer.render(scene, camera);
      tick();
    });
  }

  if (reduceMotion) {
    update(1.2, 0);
    renderer.render(scene, camera);
    window.addEventListener("resize", () => renderer.render(scene, camera));
  } else {
    tick();
  }
  hero.classList.add("has-3d");
})();
