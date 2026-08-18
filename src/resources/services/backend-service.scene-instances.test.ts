// @vitest-environment jsdom
//
// jsdom supplies the `localStorage` the bearer token is read from.
//
// The route is asserted literally: scene instances hang off a scene type, and
// getting the path wrong turns the 3D preview into a silent 404.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SceneInstance } from "@gds/models/instance/Instance_scenes.structure";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./api", () => ({ apiFetch: mocks.apiFetch }));

import { backendService } from "./backend-service";

const okText = (body: unknown) => ({
  ok: true,
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body),
});
const failure = {
  ok: false,
  statusText: "Not Found",
  text: () => Promise.resolve("no route"),
  json: () => Promise.resolve(null),
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("backendService.sceneInstancesAllGET", () => {
  it("revives the payload into SceneInstance class instances", async () => {
    localStorage.setItem("auth_token", "tok");
    mocks.apiFetch.mockResolvedValue(okText([{ uuid: "si-1", name: "Scene 1" }]));

    const result = await backendService.sceneInstancesAllGET("st-1");

    expect(result).toHaveLength(1);
    // gds contract: hydrate with the class, never leave plain JSON (CLAUDE.md).
    expect(result[0]).toBeInstanceOf(SceneInstance);
    expect(result[0].uuid).toBe("si-1");
  });

  it("GETs the scene-type's sceneInstances route with the uuid encoded", async () => {
    localStorage.setItem("auth_token", "tok");
    mocks.apiFetch.mockResolvedValue(okText([]));

    await backendService.sceneInstancesAllGET("st/1");

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "instances/sceneTypes/st%2F1/sceneInstances",
      { method: "GET", headers: { Authorization: "Bearer tok" } },
    );
  });

  it("returns [] when the server sends a non-array body", async () => {
    localStorage.setItem("auth_token", "tok");
    mocks.apiFetch.mockResolvedValue(okText({ not: "an array" }));

    await expect(backendService.sceneInstancesAllGET("st-1")).resolves.toEqual([]);
  });

  it("returns [] without calling the API when there is no token", async () => {
    await expect(backendService.sceneInstancesAllGET("st-1")).resolves.toEqual([]);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("swallows a failed response and returns []", async () => {
    localStorage.setItem("auth_token", "tok");
    mocks.apiFetch.mockResolvedValue(failure);

    await expect(backendService.sceneInstancesAllGET("st-1")).resolves.toEqual([]);
  });

  it("never throws on a missing sceneTypeUUID", async () => {
    localStorage.setItem("auth_token", "tok");

    await expect(
      backendService.sceneInstancesAllGET(undefined as unknown as string),
    ).resolves.toEqual([]);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
});
