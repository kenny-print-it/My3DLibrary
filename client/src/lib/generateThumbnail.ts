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

// ---------------------------------------------------------------------------
// Re-export the same parsers used in STLViewer so we don't duplicate them.
// ---------------------------------------------------------------------------
function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  const expectedSize = 84 + numTriangles * 50;

  if (buffer.byteLength === expectedSize && numTriangles > 0) {
    const positions: number[] = [];
    const normals: number[] = [];
    let offset = 84;
    for (let i = 0; i < numTriangles; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;
      for (let v = 0; v < 3; v++) {
        positions.push(
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true)
        );
        normals.push(nx, ny, nz);
        offset += 12;
      }
      offset += 2;
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  const text = new TextDecoder().decode(buffer);
  const positions: number[] = [];
  const normals: number[] = [];
  const normalRe = /facet normal\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  let nm: RegExpExecArray | null;
  let vm: RegExpExecArray | null;
  while ((nm = normalRe.exec(text)) !== null) {
    const nx = parseFloat(nm[1]);
    const ny = parseFloat(nm[2]);
    const nz = parseFloat(nm[3]);
    for (let v = 0; v < 3; v++) {
      vm = vertexRe.exec(text);
      if (!vm) break;
      positions.push(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
      normals.push(nx, ny, nz);
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

async function parse3MF(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  const { unzipSync } = await import("fflate");
  const uint8 = new Uint8Array(buffer);
  const files = unzipSync(uint8);

  let modelXml: string | null = null;
  for (const name of Object.keys(files)) {
    if (name.toLowerCase().endsWith(".model")) {
      modelXml = new TextDecoder().decode(files[name]);
      break;
    }
  }
  if (!modelXml) throw new Error("No .model file found inside 3MF archive");

  const parser = new DOMParser();
  const doc = parser.parseFromString(modelXml, "text/xml");
  const positions: number[] = [];
  const indices: number[] = [];

  for (const obj of Array.from(doc.querySelectorAll("object"))) {
    const vertexEls = obj.querySelectorAll("vertex");
    const triEls = obj.querySelectorAll("triangle");
    if (vertexEls.length === 0 || triEls.length === 0) continue;
    const baseIndex = positions.length / 3;
    for (const v of Array.from(vertexEls)) {
      positions.push(
        parseFloat(v.getAttribute("x") || "0"),
        parseFloat(v.getAttribute("y") || "0"),
        parseFloat(v.getAttribute("z") || "0")
      );
    }
    for (const t of Array.from(triEls)) {
      indices.push(
        baseIndex + parseInt(t.getAttribute("v1") || "0", 10),
        baseIndex + parseInt(t.getAttribute("v2") || "0", 10),
        baseIndex + parseInt(t.getAttribute("v3") || "0", 10)
      );
    }
  }

  if (positions.length === 0) throw new Error("No geometry found in 3MF model");
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Build a reusable Three.js scene with the geometry
// ---------------------------------------------------------------------------
function buildScene(geometry: THREE.BufferGeometry) {
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

  // Centre and normalise geometry
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3 / maxDim;

  const mat = new THREE.MeshPhongMaterial({
    color: 0xe8a020,
    specular: 0x555555,
    shininess: 35,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.scale.setScalar(scale);
  scene.add(mesh);

  return { scene, mesh };
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

  const geometry = fileType === "3mf" ? await parse3MF(buffer) : parseSTL(buffer);

  onProgress?.(0.35);

  // 2. Build offscreen renderer (small size for fast sampling)
  const SAMPLE_SIZE = 128;
  const offscreen = document.createElement("canvas");
  offscreen.width = SAMPLE_SIZE;
  offscreen.height = SAMPLE_SIZE;

  const renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(SAMPLE_SIZE, SAMPLE_SIZE);
  renderer.setPixelRatio(1);

  const { scene } = buildScene(geometry);

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
  onProgress?.(1.0);

  return blob;
}
