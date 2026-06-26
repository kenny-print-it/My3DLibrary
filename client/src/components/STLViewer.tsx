/**
 * STLViewer.tsx
 *
 * Inline Three.js STL viewer for model cards and detail pages.
 * Loads an STL file from a URL (Google Drive webContentLink) and renders it
 * in a canvas with orbit controls (mouse drag to rotate, scroll to zoom).
 *
 * Usage:
 *   <STLViewer url="https://..." className="w-full h-48" />
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

// Minimal STL parser (binary + ASCII) — avoids importing the full STLLoader
// which requires a separate import path in some three.js versions.
function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Try binary first (binary STL starts with 80-byte header + uint32 triangle count)
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  const expectedSize = 84 + numTriangles * 50;

  if (buffer.byteLength === expectedSize && numTriangles > 0) {
    // Binary STL
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
      offset += 2; // attribute byte count
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  // ASCII STL fallback
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

interface STLViewerProps {
  /** Direct download URL for the STL file */
  url: string;
  className?: string;
  /** Background color (CSS string). Defaults to transparent/dark. */
  bgColor?: string;
}

export default function STLViewer({ url, className, bgColor = "#111" }: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let animId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    const width = el.clientWidth || 300;
    const height = el.clientHeight || 300;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000);
    camera.position.set(0, 0, 5);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(1, 2, 3);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    dir2.position.set(-2, -1, -1);
    scene.add(dir2);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    // Orbit state
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotX = 0;
    let rotY = 0;
    let zoom = 1;

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.01;
      rotX += (e.clientY - prevY) * 0.01;
      prevX = e.clientX; prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => { zoom *= e.deltaY > 0 ? 1.1 : 0.9; zoom = Math.max(0.1, Math.min(20, zoom)); e.preventDefault(); };

    // Touch support
    let lastTouchDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
      if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        rotY += (e.touches[0].clientX - prevX) * 0.01;
        rotX += (e.touches[0].clientY - prevY) * 0.01;
        prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      }
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoom *= lastTouchDist / dist;
        zoom = Math.max(0.1, Math.min(20, zoom));
        lastTouchDist = dist;
      }
      e.preventDefault();
    };
    const onTouchEnd = () => { isDragging = false; };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    let mesh: THREE.Mesh | null = null;

    // Load STL
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const geo = parseSTL(buf);
        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        geo.translate(-center.x, -center.y, -center.z);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        const mat = new THREE.MeshPhongMaterial({ color: 0xe8a020, specular: 0x444444, shininess: 30 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.scale.setScalar(scale);
        scene.add(mesh);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[STLViewer] Load error:", err);
        setError("Could not load STL");
        setLoading(false);
      });

    // Animate
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (mesh) {
        mesh.rotation.x = rotX;
        mesh.rotation.y = rotY;
        camera.position.z = 5 * zoom;
      }
      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      renderer?.dispose();
      if (renderer?.domElement && el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [url, bgColor]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div ref={mountRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/80 text-muted-foreground text-xs gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading 3D model…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 text-muted-foreground text-xs">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/50 pointer-events-none select-none">
          drag to rotate · scroll to zoom
        </div>
      )}
    </div>
  );
}
