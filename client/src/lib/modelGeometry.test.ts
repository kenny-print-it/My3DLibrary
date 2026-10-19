import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loaderParse } = vi.hoisted(() => ({ loaderParse: vi.fn() }));

vi.mock("three/addons/loaders/3MFLoader.js", () => ({
  ThreeMFLoader: class {
    parse(buffer: ArrayBuffer) {
      return loaderParse(buffer);
    }
  },
}));

import {
  centerAndScaleModel,
  countRenderableMeshes,
  loadModelObject,
  modelLoadErrorMessage,
  parse3MF,
  parseSTL,
} from "./modelGeometry";

function makeTriangleMesh(x: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());
  mesh.position.x = x;
  return mesh;
}

function makeTransformedAssembly() {
  const group = new THREE.Group();
  // These represent separate component/build items that the old direct-mesh
  // parser skipped or flattened incorrectly.
  group.add(makeTriangleMesh(20));
  group.add(makeTriangleMesh(30));
  return group;
}

beforeEach(() => {
  loaderParse.mockReset();
});

describe("portable 3MF geometry loading", () => {
  it("keeps every transformed component returned by the standard 3MF loader in frame", () => {
    loaderParse.mockReturnValue(makeTransformedAssembly());

    const model = parse3MF(new ArrayBuffer(0));
    expect(loaderParse).toHaveBeenCalledTimes(1);
    expect(countRenderableMeshes(model)).toBe(2);

    model.updateMatrixWorld(true);
    const originalBounds = new THREE.Box3().setFromObject(model);
    expect(originalBounds.min.x).toBeCloseTo(20);
    expect(originalBounds.max.x).toBeCloseTo(31);

    centerAndScaleModel(model);
    const previewBounds = new THREE.Box3().setFromObject(model);
    expect(previewBounds.getCenter(new THREE.Vector3()).length()).toBeLessThan(0.0001);
    expect(Math.max(...previewBounds.getSize(new THREE.Vector3()).toArray())).toBeCloseTo(3);
  });

  it("preserves the STL model route", () => {
    const stl = new TextEncoder().encode(`solid triangle\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid triangle\n`);
    const buffer = stl.buffer.slice(stl.byteOffset, stl.byteOffset + stl.byteLength) as ArrayBuffer;
    const model = loadModelObject(buffer, "stl");

    expect(countRenderableMeshes(model)).toBe(1);
    expect(parseSTL(buffer).getAttribute("position").count).toBe(3);
  });

  it("uses the legacy-reader failure only as a fallback and gives a helpful 3MF message", () => {
    loaderParse.mockImplementation(() => {
      throw new Error("The standard reader rejected this archive");
    });

    expect(() => parse3MF(new ArrayBuffer(0))).toThrow(/Could not read 3MF geometry/);
    expect(modelLoadErrorMessage("3mf", new Error("No geometry found"))).toBe(
      "This 3MF does not contain viewable model geometry."
    );
  });
});
