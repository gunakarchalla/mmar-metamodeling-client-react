// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

/**
 * glTF scale parity between this client's preview and the modeling client.
 *
 * The two clients each carry their own copy of `graphic-context.ts`, so the same
 * vizRep string is rendered by two separate implementations. Any divergence between
 * them shows up as a preview that does not match the model — which is exactly how the
 * flattened spheres (Place, Variable, Start Event, ...) were lost: the modeling client
 * overwrote the scale a glTF node bakes into its own matrix. The mirror of this file
 * lives at `mmar-modeling-client-react/src/engine/graphic-context.test.ts` and pins the
 * identical expectations.
 *
 * `@/engine/global-definition` is mocked with a plain fake: importing the real one
 * constructs a WebGLRenderer at module scope, which needs a real GPU context.
 */
const fakeGlobal = vi.hoisted(() => ({
  globalObject: {
    scene: null as unknown,
    dragObjects: [] as unknown[],
    buttonObjects: [] as unknown[],
    updateLinesArray: [] as unknown[],
    current_class_instance: null as unknown,
    current_port_instance: null as unknown,
    readyForVizRepUpdate: true,
    selectedTab: 0,
    tabContext: [] as unknown[],
    render: false,
  },
}));

vi.mock("@/engine/global-definition", () => fakeGlobal);

const { graphicContext } = await import("@/engine/graphic-context");

/**
 * Minimal glTF holding one triangle under a node whose matrix flattens it on z.
 * Real vizReps author flattened primitives exactly this way — the "Sphere" node of
 * the Petri-net "Place" model carries a `matrix` with 0.1 in the z-scale slot.
 */
function makeFlattenedGltf(): string {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const bytes = new Uint8Array(positions.buffer);
  const uri = "data:application/octet-stream;base64," + btoa(String.fromCharCode(...bytes));

  return JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    // column-major; the 0.1 in slot 10 is the z scale
    nodes: [{ name: "Sphere", mesh: 0, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 1] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bytes.byteLength, target: 34962 }],
    buffers: [{ byteLength: bytes.byteLength, uri }],
  });
}

describe("graphic_gltf", () => {
  it("keeps the scale a glTF node bakes into its own matrix", async () => {
    const [mesh] = await graphicContext.graphic_gltf(makeFlattenedGltf());

    expect(mesh.scale.z).toBeCloseTo(0.1);
    expect(mesh.scale.x).toBeCloseTo(1);
  });

  it("multiplies an explicit scale onto the node's own scale", async () => {
    const [mesh] = await graphicContext.graphic_gltf(makeFlattenedGltf(), 0, 0, 0, [2, 2, 2]);

    expect(mesh.scale.toArray().map((v) => Number(v.toFixed(3)))).toEqual([2, 2, 0.2]);
  });
});
