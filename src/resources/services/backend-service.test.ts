import { describe, it, expect } from "vitest";
import { backendService } from "./backend-service";

describe("BackendService.getCorrectType", () => {
  it("maps the type vocabulary to REST path segments", () => {
    expect(backendService.getCorrectType("SceneType")).toBe("sceneTypes");
    expect(backendService.getCorrectType("Class")).toBe("classes");
    expect(backendService.getCorrectType("RelationClass")).toBe("relationclasses");
    expect(backendService.getCorrectType("AttributeType")).toBe("attributeTypes");
    expect(backendService.getCorrectType("Attribute")).toBe("attributes");
    expect(backendService.getCorrectType("Port")).toBe("ports");
    expect(backendService.getCorrectType("File")).toBe("files");
    expect(backendService.getCorrectType("Role")).toBe("roles");
    expect(backendService.getCorrectType("Procedure")).toBe("procedures");
    expect(backendService.getCorrectType("UserGroup")).toBe("userGroups");
    expect(backendService.getCorrectType("User")).toBe("users");
  });

  it("returns undefined for an unknown type", () => {
    expect(backendService.getCorrectType("Nope")).toBeUndefined();
  });
});
