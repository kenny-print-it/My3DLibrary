/**
 * STLViewer.tsx
 *
 * Inline Three.js 3D viewer for model cards and detail pages.
 * Supports STL (binary + ASCII) and 3MF files.
 *
 * Exposes a `captureScreenshot()` method via ref:
 *   const viewerRef = useRef<STLViewerHandle>(null);
 *   const blob = await viewerRef.current.captureScreenshot();
 *
 * captureScreenshot() snaps to the classic 3/4 hero angle first,
 * then captures the canvas — unless the user has already rotated
 * the model, in which case it captures the current view.
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { centerAndScaleModel, disposeModel, loadModelObject, modelLoadErrorMessage } from "@/lib/modelGeometry";

// ---------------------------------------------------------------------------
// Public handle type
// ---------------------------------------------------------------------------
export interface STLViewerHandle {
  /**
   * Snap to the classic 3/4 hero angle (if the user hasn't rotated),
   * render one frame, and return the canvas as a PNG Blob.
   * Returns null if the model hasn't loaded yet.
   */
  captureScreenshot: () => Promise<Blob | null>;
  /** Returns true once the model geometry has finished loading */
  isLoaded: () => boolean;
}

// ---------------------------------------------------------------------------
// Classic 3/4 hero angle: slight elevation + left-front rotation
// ---------------------------------------------------------------------------
const HERO_ROT_X = -0.45; // ~-26° tilt up
const HERO_ROT_Y = 0.65;  // ~37° left-front

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface STLViewerProps {
  url: string;
  fileType?: "stl" | "3mf";
  className?: string;
  bgColor?: string;
  onLoaded?: () => void;
}

const STLViewer = forwardRef<STLViewerHandle, STLViewerProps>(
  function STLViewer({ url, fileType = "stl", className, bgColor = "#111", onLoaded }, ref) {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Store onLoaded in a ref so it doesn't need to be in useEffect deps
    const onLoadedRef = useRef(onLoaded);
    onLoadedRef.current = onLoaded;

    // Mutable refs shared between useEffect and the imperative handle
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const meshRef = useRef<THREE.Object3D | null>(null);
    const rotRef = useRef({ x: 0, y: 0, userRotated: false });
    const zoomRef = useRef(1);
    const loadedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      isLoaded: () => loadedRef.current,
      captureScreenshot: async (): Promise<Blob | null> => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const mesh = meshRef.current;
        if (!renderer || !scene || !camera || !mesh || !loadedRef.current) return null;

        // Snap to hero angle if user hasn't manually rotated
        if (!rotRef.current.userRotated) {
          rotRef.current.x = HERO_ROT_X;
          rotRef.current.y = HERO_ROT_Y;
        }

        // Apply rotation and render one frame
        mesh.rotation.x = rotRef.current.x;
        mesh.rotation.y = rotRef.current.y;
        camera.position.z = 5 * zoomRef.current;
        renderer.render(scene, camera);

        // Capture canvas as PNG blob
        return new Promise<Blob | null>((resolve) => {
          renderer.domElement.toBlob((blob) => resolve(blob), "image/png", 0.95);
        });
      },
    }));

    useEffect(() => {
      const el = mountRef.current;
      if (!el) return;

      let animId: number;
      let cancelled = false;

      // Reset state for new URL
      loadedRef.current = false;
      rotRef.current = { x: 0, y: 0, userRotated: false };
      zoomRef.current = 1;

      const width = el.clientWidth || 300;
      const height = el.clientHeight || 300;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColor);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000);
      camera.position.set(0, 0, 5);
      cameraRef.current = camera;

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
      dir1.position.set(1, 2, 3);
      scene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0x8888ff, 0.4);
      dir2.position.set(-2, -1, -1);
      scene.add(dir2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      el.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Orbit state
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;

      const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        rotRef.current.y += (e.clientX - prevX) * 0.01;
        rotRef.current.x += (e.clientY - prevY) * 0.01;
        rotRef.current.userRotated = true;
        prevX = e.clientX; prevY = e.clientY;
      };
      const onMouseUp = () => { isDragging = false; };
      const onWheel = (e: WheelEvent) => {
        zoomRef.current *= e.deltaY > 0 ? 1.1 : 0.9;
        zoomRef.current = Math.max(0.1, Math.min(20, zoomRef.current));
        e.preventDefault();
      };

      let lastTouchDist = 0;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
          rotRef.current.y += (e.touches[0].clientX - prevX) * 0.01;
          rotRef.current.x += (e.touches[0].clientY - prevY) * 0.01;
          rotRef.current.userRotated = true;
          prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
        }
        if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          zoomRef.current *= lastTouchDist / dist;
          zoomRef.current = Math.max(0.1, Math.min(20, zoomRef.current));
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

      // Load and parse the file
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.arrayBuffer();
        })
        .then(async (buf) => {
          if (cancelled) return;
          const model = loadModelObject(buf, fileType);
          if (cancelled) return;
          centerAndScaleModel(model);
          scene.add(model);
          meshRef.current = model;
          loadedRef.current = true;
          setLoading(false);
          onLoadedRef.current?.();
        })
        .catch((err) => {
          if (cancelled) return;
          console.warn("[STLViewer] Load error:", err);
          setError(modelLoadErrorMessage(fileType, err));
          setLoading(false);
        });

      // Animate
      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (meshRef.current) {
          meshRef.current.rotation.x = rotRef.current.x;
          meshRef.current.rotation.y = rotRef.current.y;
          camera.position.z = 5 * zoomRef.current;
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelled = true;
        cancelAnimationFrame(animId);
        el.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        if (meshRef.current) {
          scene.remove(meshRef.current);
          disposeModel(meshRef.current);
        }
        renderer.dispose();
        if (renderer.domElement && el.contains(renderer.domElement)) {
          el.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        meshRef.current = null;
        loadedRef.current = false;
      };
    }, [url, fileType, bgColor]);

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
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 px-5 text-center text-muted-foreground text-xs">
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
);

export default STLViewer;
