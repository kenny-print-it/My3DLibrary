import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { unzipSync } from "fflate";

export type SupportedModelFileType = "stl" | "3mf";

function createPreviewMaterial() {
  return new THREE.MeshPhongMaterial({
    color: 0xe8a020,
    specular: 0x444444,
    shininess: 30,
    side: THREE.DoubleSide,
  });
}

/** Parse binary or ASCII STL geometry for the portable preview. */
export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const view = new DataView(buffer);

  // A binary STL begins with an 80-byte header followed by a triangle count.
  if (buffer.byteLength >= 84) {
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
  }

  // ASCII STL fallback.
  const text = new TextDecoder().decode(buffer);
  const positions: number[] = [];
  const normals: number[] = [];
  const normalRe = /facet normal\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  let normalMatch: RegExpExecArray | null;
  let vertexMatch: RegExpExecArray | null;

  while ((normalMatch = normalRe.exec(text)) !== null) {
    const nx = parseFloat(normalMatch[1]);
    const ny = parseFloat(normalMatch[2]);
    const nz = parseFloat(normalMatch[3]);

    for (let v = 0; v < 3; v++) {
      vertexMatch = vertexRe.exec(text);
      if (!vertexMatch) break;
      positions.push(
        parseFloat(vertexMatch[1]),
        parseFloat(vertexMatch[2]),
        parseFloat(vertexMatch[3])
      );
      normals.push(nx, ny, nz);
    }
  }

  if (positions.length === 0) {
    throw new Error("No STL triangles found");
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function hasFiniteBounds(bounds: THREE.Box3) {
  return [
    bounds.min.x,
    bounds.min.y,
    bounds.min.z,
    bounds.max.x,
    bounds.max.y,
    bounds.max.z,
  ].every(Number.isFinite);
}

/** Count meshes with actual position data, not empty resource groups. */
export function countRenderableMeshes(model: THREE.Object3D): number {
  let count = 0;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const positions = child.geometry.getAttribute("position");
    if (positions && positions.count > 0) count++;
  });
  return count;
}

/**
 * Ensure imported meshes remain visible even when their source has reversed
 * triangle winding.  Source material colours are otherwise preserved.
 */
export function prepareModelForPreview(model: THREE.Object3D) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (!child.geometry.getAttribute("normal")) {
      child.geometry.computeVertexNormals();
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    }
  });
}

/**
 * Parse a regular standards-compliant 3MF project with Three.js's maintained
 * loader. It supports resource meshes, component assemblies, build items, and
 * 3MF transforms—the structures emitted by modern slicers.
 */
function parseStandard3MF(buffer: ArrayBuffer): THREE.Group {
  const model = new ThreeMFLoader().parse(buffer);
  if (countRenderableMeshes(model) === 0) {
    throw new Error("No renderable mesh geometry was found in this 3MF project");
  }
  prepareModelForPreview(model);
  return model;
}

/**
 * Keep the older direct-mesh behaviour as a fallback for simple legacy 3MF
 * archives that omit the relationship files required by the formal 3MF spec.
 */
function parseLegacyDirectMesh3MF(buffer: ArrayBuffer): THREE.Group {
  const files = unzipSync(new Uint8Array(buffer));
  const modelName = Object.keys(files).find((name) => /^3D\/.*\.model$/i.test(name))
    ?? Object.keys(files).find((name) => name.toLowerCase().endsWith(".model"));

  if (!modelName) {
    throw new Error("No 3MF model document was found");
  }

  const modelXml = new TextDecoder().decode(files[modelName]);
  const document = new DOMParser().parseFromString(modelXml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("The 3MF model document is not valid XML");
  }

  const positions: number[] = [];
  const indices: number[] = [];

  for (const object of Array.from(document.querySelectorAll("resources > object"))) {
    const mesh = object.querySelector(":scope > mesh");
    if (!mesh) continue;

    const vertices = Array.from(mesh.querySelectorAll(":scope > vertices > vertex"));
    const triangles = Array.from(mesh.querySelectorAll(":scope > triangles > triangle"));
    if (vertices.length === 0 || triangles.length === 0) continue;

    const baseIndex = positions.length / 3;
    for (const vertex of vertices) {
      const x = Number.parseFloat(vertex.getAttribute("x") ?? "");
      const y = Number.parseFloat(vertex.getAttribute("y") ?? "");
      const z = Number.parseFloat(vertex.getAttribute("z") ?? "");
      if (![x, y, z].every(Number.isFinite)) {
        throw new Error("The 3MF mesh contains an invalid vertex");
      }
      positions.push(x, y, z);
    }

    for (const triangle of triangles) {
      const v1 = Number.parseInt(triangle.getAttribute("v1") ?? "", 10);
      const v2 = Number.parseInt(triangle.getAttribute("v2") ?? "", 10);
      const v3 = Number.parseInt(triangle.getAttribute("v3") ?? "", 10);
      if (![v1, v2, v3].every(Number.isInteger) || [v1, v2, v3].some((value) => value < 0 || value >= vertices.length)) {
        throw new Error("The 3MF mesh contains an invalid triangle");
      }
      indices.push(baseIndex + v1, baseIndex + v2, baseIndex + v3);
    }
  }

  if (positions.length === 0 || indices.length === 0) {
    throw new Error("No direct mesh geometry was found in this 3MF project");
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, createPreviewMaterial()));
  return group;
}

/** Parse 3MF while retaining support for both current and older simple files. */
export function parse3MF(buffer: ArrayBuffer): THREE.Group {
  try {
    return parseStandard3MF(buffer);
  } catch (standardError) {
    try {
      const fallback = parseLegacyDirectMesh3MF(buffer);
      prepareModelForPreview(fallback);
      return fallback;
    } catch (fallbackError) {
      const standardMessage = standardError instanceof Error ? standardError.message : "unknown standard-loader error";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "unknown fallback-loader error";
      throw new Error(`Could not read 3MF geometry (${standardMessage}; ${fallbackMessage})`);
    }
  }
}

/** Parse a supported file into a full Three.js object, preserving 3MF assemblies. */
export function loadModelObject(buffer: ArrayBuffer, fileType: SupportedModelFileType): THREE.Object3D {
  if (fileType === "3mf") return parse3MF(buffer);
  return new THREE.Mesh(parseSTL(buffer), createPreviewMaterial());
}

/** Turn loader errors into a short explanation suitable for the preview panel. */
export function modelLoadErrorMessage(fileType: SupportedModelFileType, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/HTTP \d+/.test(message)) {
    return `The ${fileType.toUpperCase()} file could not be found.`;
  }
  if (/no (renderable|direct mesh|visible)|no geometry|no visible size/i.test(message)) {
    return "This 3MF does not contain viewable model geometry.";
  }
  if (/not valid XML|No 3MF model document/i.test(message)) {
    return "This 3MF file is not a readable model project.";
  }
  return fileType === "3mf"
    ? "This 3MF could not be opened as a model preview."
    : "This STL could not be opened as a model preview.";
}

/** Centre a model and scale its largest dimension to the requested preview size. */
export function centerAndScaleModel(model: THREE.Object3D, targetSize = 3) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty() || !hasFiniteBounds(bounds)) {
    throw new Error("The model has no visible geometry");
  }

  const size = new THREE.Vector3();
  bounds.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDimension) || maxDimension <= Number.EPSILON) {
    throw new Error("The model has no visible size");
  }

  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const scaleFactor = targetSize / maxDimension;
  // Bounds are in world coordinates. Scale the root position too, then offset
  // by the scaled centre so component/build transforms stay centered in view.
  model.position.multiplyScalar(scaleFactor).addScaledVector(center, -scaleFactor);
  model.scale.multiplyScalar(scaleFactor);
  model.updateMatrixWorld(true);
}

/** Release geometry and material resources when a preview is replaced or closed. */
export function disposeModel(model: THREE.Object3D) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}
