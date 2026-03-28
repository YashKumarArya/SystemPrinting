/**
 * SystemPrintings — 3D Scene Engine
 * Loads the coffee cup GLB model and provides a cinematic intro animation.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'gsap';

// ─── State ────────────────────────────────────────────────────────
let renderer, scene, camera, model, mixer;
let animationId = null;
let introComplete = false;
let scrollProgress = 0;
const clock = new THREE.Clock();

// Camera resting position (where intro ends / idle lives)
const REST_POS = { x: 0, y: 1.0, z: 5.0 };
// Camera start position (far away)
const START_POS = { x: 0, y: 2.0, z: 9.0 };

// ─── Init ─────────────────────────────────────────────────────────
export function initScene(canvas, onProgress) {
  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0a05);
  scene.fog = new THREE.Fog(0x0e0a05, 8, 20);

  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(START_POS.x, START_POS.y, START_POS.z);
  camera.lookAt(0, 0.5, 0);

  // Lighting
  setupLights();

  // Load model
  loadModel(onProgress);

  // Resize handler
  window.addEventListener('resize', onResize);

  // Scroll handler
  window.addEventListener('scroll', onScroll, { passive: true });

  // Start render loop
  tick();
}

// ─── Lights ───────────────────────────────────────────────────────
function setupLights() {
  // Soft warm ambient
  const ambient = new THREE.AmbientLight(0xffd4a0, 0.6);
  scene.add(ambient);

  // Key light — warm directional from upper-right
  const key = new THREE.DirectionalLight(0xffecd2, 1.8);
  key.position.set(3, 5, 4);
  key.castShadow = false;
  scene.add(key);

  // Fill light — cooler from the left
  const fill = new THREE.DirectionalLight(0xc8d8f0, 0.4);
  fill.position.set(-3, 2, 2);
  scene.add(fill);

  // Rim light — subtle back-light
  const rim = new THREE.DirectionalLight(0xffe0b0, 0.5);
  rim.position.set(0, 3, -4);
  scene.add(rim);

  // Spotlight for dramatic top-down glow
  const spot = new THREE.SpotLight(0xffd090, 0.8, 15, Math.PI / 6, 0.5);
  spot.position.set(0, 6, 0);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);
}

// ─── Model Loading ────────────────────────────────────────────────
function loadModel(onProgress) {
  const loader = new GLTFLoader();

  // Optional Draco decoder for compressed meshes
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    import.meta.env.BASE_URL + 'take_away_coffee_cup_set.glb',
    (gltf) => {
      model = gltf.scene;

      // Center the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(center);
         // Move the model up — increase this value to move higher
            model.position.y += 0.3;

      // Scale if needed (normalize to ~2 units tall)
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 3) {
        const scale = 4.0 / maxDim;
        model.scale.setScalar(scale);
      }

      // Improve materials
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.envMapIntensity = 0.8;
          if (child.material.metalness !== undefined) {
            child.material.metalness = Math.min(child.material.metalness, 0.6);
          }
        }
      });

      scene.add(model);

      // If the GLB has animations, set up mixer
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }

      // Add environment (a subtle gradient to give reflections something to catch)
      addEnvironment();

      if (onProgress) onProgress(100);
    },
    (xhr) => {
      if (onProgress) {
        if (xhr.total > 0) {
          onProgress(Math.round((xhr.loaded / xhr.total) * 95));
        } else {
          // xhr.total can be 0 when Content-Length header is missing
          // Use a heuristic based on known ~15MB file size
          const estimatedTotal = 16_000_000;
          onProgress(Math.min(90, Math.round((xhr.loaded / estimatedTotal) * 95)));
        }
      }
    },
    (error) => {
      console.error('Error loading GLB:', error);
      if (onProgress) onProgress(100); // proceed anyway
    }
  );
}

// ─── Environment (for reflections) ───────────────────────────────
function addEnvironment() {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Create a simple gradient environment
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(10, 32, 32);
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x1a1008) },
      bottomColor: { value: new THREE.Color(0x0e0a05) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
      }
    `,
  });
  const envMesh = new THREE.Mesh(envGeo, envMat);
  envScene.add(envMesh);

  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  pmremGenerator.dispose();
}

// ─── Intro Animation ──────────────────────────────────────────────
export function startIntroAnimation(onComplete) {
  if (!model) {
    // Model not loaded yet — wait and retry
    const waitInterval = setInterval(() => {
      if (model) {
        clearInterval(waitInterval);
        runIntro(onComplete);
      }
    }, 100);
    return;
  }
  runIntro(onComplete);
}

function runIntro(onComplete) {
  const tl = gsap.timeline({
    onComplete: () => {
      introComplete = true;
      if (onComplete) onComplete();
    },
  });

  const lookTarget = { x: 0, y: 0.5, z: 0 };

  // Phase 1: Zoom in (2s)
  tl.to(camera.position, {
    x: 0,
    y: 0.8,
    z: 3.8,
    duration: 2,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z),
  });

  // Phase 2: Orbit around the cup (3s)
  const orbitState = { theta: 0 };
  const orbitRadius = 3.8;
  tl.to(orbitState, {
    theta: Math.PI * 1.6,
    duration: 3,
    ease: 'power1.inOut',
    onUpdate: () => {
      camera.position.x = Math.sin(orbitState.theta) * orbitRadius;
      camera.position.z = Math.cos(orbitState.theta) * orbitRadius;
      camera.position.y = 0.6 + Math.sin(orbitState.theta * 0.5) * 0.3;
      camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
    },
  });

  // Phase 3: Zoom out to resting hero position (1.5s)
  tl.to(camera.position, {
    x: REST_POS.x,
    y: REST_POS.y,
    z: REST_POS.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z),
  });
}

// ─── Scroll Parallax ──────────────────────────────────────────────
function onScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
}

// ─── Render Loop ──────────────────────────────────────────────────
function tick() {
  animationId = requestAnimationFrame(tick);

  const delta = clock.getDelta();

  // Animation mixer (if GLB has animations)
  if (mixer) mixer.update(delta);

  // Idle rotation of the model after intro
  if (introComplete && model) {
    model.rotation.y += delta * 0.15; // slow auto-rotate
  }

  // Scroll-based camera parallax (subtle Y shift)
  if (introComplete) {
    const parallaxY = REST_POS.y - scrollProgress * 0.6;
    camera.position.y += (parallaxY - camera.position.y) * 0.05;
    camera.lookAt(0, 0.5 - scrollProgress * 0.2, 0);
  }

  renderer.render(scene, camera);
}

// ─── Resize ───────────────────────────────────────────────────────
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Cleanup (if ever needed) ─────────────────────────────────────
export function disposeScene() {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onScroll);
  renderer?.dispose();
}
