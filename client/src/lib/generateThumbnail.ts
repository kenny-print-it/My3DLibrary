/**
 * generateThumbnail.ts
 *
 * Renders an STL or 3MF file in an offscreen Three.js canvas, samples
 * multiple camera angles to find the most informative view (maximises
 * the number of lit pixels / silhouette area), then returns a PNG blob.
 *
 * The algorithm:
 *   1. Parse the geometry (reuses the same parsers as STLViewer.tsx).
 *   2. Spin through N candidate camera positions on a sphere around the model.
 *   3. For each position, render to an offscreen canvas and count non-background pixels.
 *   4. Keep the angle with the highest pixel count (most visible geometry).
 *   5. Do a final high-quality render at that angle and return canvas.toBlob("image/png").
 */

import * as THREE from "three";
import { centerAndScaleModel, disposeModel, loadModelObject } from "@/lib/modelGeometry";

// ---------------------------------------------------------------------------
// Build a reusable Three.js scene with the geometry
// ---------------------------------------------------------------------------
function buildScene(model: THREE.Object3D) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a1a1a");

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.3);
  dir1.position.set(1, 2, 3);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0x8899ff, 0.45);
  dir2.position.set(-2, -1, -1);
  scene.add(dir2);
  const dir3 = new THREE.DirectionalLight(0xffffff, 0.3);
  dir3.position.set(0, -3, 0);
  scene.add(dir3);

  centerAndScaleModel(model);
  scene.add(model);

  return { scene, model };
}

// ---------------------------------------------------------------------------
// Count non-background pixels in a rendered canvas (proxy for "how much
// geometry is visible from this angle").
// ---------------------------------------------------------------------------
function countVisiblePixels(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): number {
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  const ctx = canvas.getContext("2d") ?? (canvas as any).__ctx2d;
  if (!ctx) {
    // Read pixels via WebGL directly
    const gl = renderer.getContext();
    const w = canvas.width;
    const h = canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // Background is #1a1a1a = (26, 26, 26)
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.abs(pixels[i] - 26) > 15 || Math.abs(pixels[i + 1] - 26) > 15 || Math.abs(pixels[i + 2] - 26) > 15) {
        count++;
      }
    }
    return count;
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let count = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (Math.abs(imageData.data[i] - 26) > 15) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Generate candidate camera positions on a sphere (Fibonacci lattice)
// ---------------------------------------------------------------------------
function fibonacciSpherePoints(n: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n);
    const phi = (2 * Math.PI * i) / goldenRatio;
    points.push(new THREE.Vector3(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta)
    ));
  }
  return points;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export interface ThumbnailOptions {
  url: string;
  fileType?: "stl" | "3mf";
  /** Output size in pixels (square). Default: 512 */
  size?: number;
  /** Number of candidate angles to sample. Default: 24 */
  candidates?: number;
  /** Progress callback (0–1) */
  onProgress?: (p: number) => void;
}

export async function generateThumbnail(opts: ThumbnailOptions): Promise<Blob> {
  const { url, fileType = "stl", size = 512, candidates = 24, onProgress } = opts;

  onProgress?.(0.05);

  // 1. Fetch and parse geometry
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching model`);
  const buffer = await resp.arrayBuffer();

  onProgress?.(0.2);

  const model = loadModelObject(buffer, fileType);

  onProgress?.(0.35);

  // 2. Build offscreen renderer (small size for fast sampling)
  const SAMPLE_SIZE = 128;
  const offscreen = document.createElement("canvas");
  offscreen.width = SAMPLE_SIZE;
  offscreen.height = SAMPLE_SIZE;

  const renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(SAMPLE_SIZE, SAMPLE_SIZE);
  renderer.setPixelRatio(1);

  const { scene } = buildScene(model);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);

  // 3. Sample candidate angles
  const CAMERA_DIST = 5.5;
  const candidatePoints = fibonacciSpherePoints(candidates, CAMERA_DIST);

  // Also add some "classic" angles: front, 3/4 front-left elevated, isometric
  const classic = [
    new THREE.Vector3(0, 0, CAMERA_DIST),                                    // front
    new THREE.Vector3(CAMERA_DIST * 0.7, CAMERA_DIST * 0.5, CAMERA_DIST * 0.7), // 3/4 front-right elevated
    new THREE.Vector3(-CAMERA_DIST * 0.7, CAMERA_DIST * 0.5, CAMERA_DIST * 0.7), // 3/4 front-left elevated
    new THREE.Vector3(0, CAMERA_DIST * 0.3, CAMERA_DIST),                   // slightly elevated front
  ];
  const allPoints = [...classic, ...candidatePoints];

  let bestPoint = allPoints[0];
  let bestScore = -1;

  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    camera.position.copy(pt);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const score = countVisiblePixels(renderer, scene, camera);
    if (score > bestScore) {
      bestScore = score;
      bestPoint = pt;
    }

    onProgress?.(0.35 + 0.45 * ((i + 1) / allPoints.length));
  }

  // 4. Final high-quality render at best angle
  renderer.dispose();

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = size;
  finalCanvas.height = size;

  const finalRenderer = new THREE.WebGLRenderer({ canvas: finalCanvas, antialias: true, preserveDrawingBuffer: true });
  finalRenderer.setSize(size, size);
  finalRenderer.setPixelRatio(1);

  const finalCamera = new THREE.PerspectiveCamera(42, 1, 0.01, 10000);
  finalCamera.position.copy(bestPoint);
  finalCamera.lookAt(0, 0, 0);
  finalCamera.updateProjectionMatrix();

  finalRenderer.render(scene, finalCamera);

  onProgress?.(0.95);

  // 5. Export as PNG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob returned null"));
    }, "image/png");
  });

  finalRenderer.dispose();
  disposeModel(model);
  onProgress?.(1.0);

  return blob;
}
