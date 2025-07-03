import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const canvas = document.getElementById("solarCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 30, 100);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 1.0;
controls.minDistance = 10;
controls.maxDistance = 500;
controls.target.set(0, 0, 0);

scene.add(new THREE.PointLight(0xffffff, 2, 1000));
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// ✅ Fixed createStars()
function createStars() {
  const geo = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i < 1000; i++) {
    verts.push(
      THREE.MathUtils.randFloatSpread(2000),
      THREE.MathUtils.randFloatSpread(2000),
      THREE.MathUtils.randFloatSpread(2000)
    );
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        sizeAttenuation: true
      })
    )
  );
}
createStars();

const loader = new THREE.TextureLoader();
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(16, 32, 32),
  new THREE.MeshStandardMaterial({ map: loader.load("/sun.jpg") })
);
scene.add(sun);

const planetData = [
  { name: "Mercury", size: 2, distance: 28, speed: 0.02, texture: "mercury.jpg" },
  { name: "Venus", size: 3, distance: 40, speed: 0.015, texture: "venus.jpg" },
  { name: "Earth", size: 3.5, distance: 56, speed: 0.01, texture: "earth.jpg" },
  { name: "Mars", size: 2.5, distance: 70, speed: 0.008, texture: "mars.jpg" },
  { name: "Jupiter", size: 7, distance: 100, speed: 0.004, texture: "jupiter.jpg" },
  { name: "Saturn", size: 6, distance: 130, speed: 0.003, texture: "saturn.jpg", hasRing: true },
  { name: "Uranus", size: 4.5, distance: 160, speed: 0.002, texture: "uranus.jpg" },
  { name: "Neptune", size: 4.5, distance: 190, speed: 0.001, texture: "neptune.jpg" },
];

const planets = [], planetSpeeds = {}, planetLabels = [], orbitMeshes = [];

const slidersDiv = document.getElementById("sliders");
const dataDiv = document.getElementById("planetData");
const tooltip = document.getElementById("tooltip");
const sidebar = document.getElementById("sidebar");

planetData.forEach((p) => {
  const tex = loader.load(`/${p.texture}`);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.size, 32, 32),
    new THREE.MeshStandardMaterial({ map: tex })
  );
  mesh.userData = { angle: 0, distance: p.distance, name: p.name };
  scene.add(mesh);
  planets.push(mesh);
  planetSpeeds[p.name] = p.speed;

  // Orbit trail
  const orbitGeom = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 128 }, (_, i) =>
      new THREE.Vector3(
        Math.cos((i / 128) * Math.PI * 2) * p.distance,
        0,
        Math.sin((i / 128) * Math.PI * 2) * p.distance
      )
    )
  );
  const orbitLine = new THREE.Line(
    orbitGeom,
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  orbitMeshes.push(orbitLine);
  scene.add(orbitLine);

  // Saturn ring
  if (p.hasRing) {
    const rg = new THREE.RingGeometry(p.size + 1, p.size + 3, 64);
    const rm = new THREE.MeshBasicMaterial({
      map: loader.load("/planet-textures/saturn_ring.png"),
      side: THREE.DoubleSide,
    });
    const rmesh = new THREE.Mesh(rg, rm);
    rmesh.rotation.x = Math.PI / 2;
    mesh.add(rmesh);
  }

  // Label (HTML overlay synced with 3D position)
  const label = document.createElement("div");
  label.className = "planet-label";
  label.textContent = p.name;
  label.style.position = "absolute";
  label.style.color = "white";
  label.style.fontSize = "12px";
  label.style.pointerEvents = "none";
  label.style.zIndex = "1";
  document.body.appendChild(label);
  planetLabels.push({ mesh, label });

  // Sidebar info (HTML UI)
  const entry = document.createElement("div");
  entry.innerHTML = `<strong>${p.name}</strong><br>Size: ${p.size}<br>Distance: ${p.distance}<br>`;
  slidersDiv.appendChild(
    Object.assign(document.createElement("label"), {
      innerHTML: `${p.name}: <input type="range" min="0" max="0.05" step="0.001" value="${p.speed}" data-name="${p.name}">`,
    })
  );
  dataDiv.appendChild(entry);
});

// UI interactions
document.getElementById("toggleOrbits").onchange = (e) =>
  orbitMeshes.forEach((l) => (l.visible = e.target.checked));

document.getElementById("toggleSidebar").onclick = () =>
  sidebar.classList.toggle("closed");

let paused = false;
document.getElementById("pauseBtn").onclick = () => (paused = true);
document.getElementById("resumeBtn").onclick = () => (paused = false);

slidersDiv.addEventListener("input", (e) => {
  const n = e.target.dataset.name;
  if (n) planetSpeeds[n] = parseFloat(e.target.value);
});

// Tooltip hover
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
renderer.domElement.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(planets)[0];
  if (hit) {
    tooltip.textContent = hit.object.userData.name;
    tooltip.style.top = `${e.clientY + 8}px`;
    tooltip.style.left = `${e.clientX + 8}px`;
    tooltip.classList.remove("hidden");
  } else tooltip.classList.add("hidden");
});

// Animate scene
function animate() {
  requestAnimationFrame(animate);

  if (!paused) {
    planets.forEach((m) => {
      m.userData.angle += planetSpeeds[m.userData.name];
      m.position.x = Math.cos(m.userData.angle) * m.userData.distance;
      m.position.z = Math.sin(m.userData.angle) * m.userData.distance;
      m.rotation.y += 0.01;
    });
  }

  planetLabels.forEach(({ mesh, label }) => {
    const vector = mesh.position.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (vector.y * 0.5 + 0.5)) * window.innerHeight;

    if (vector.z < -1 || vector.z > 1) {
      label.style.display = "none";
    } else {
      label.style.display = "block";
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.transform = "translate(-50%, -50%)";
    }
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
