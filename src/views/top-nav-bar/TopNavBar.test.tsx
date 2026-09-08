// @vitest-environment jsdom
//
// The Sign Out button's guard. Signing out now tears the whole session down —
// `session-reset` closes every editor tab and empties every collection — so it
// destroys unsaved edits exactly as the Refresh button does, and carries the
// same confirmation. The regression this guards is silent data loss: one click
// on Sign Out discarding work the user never agreed to discard.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { SceneType } from "@gds";

import TopNavBar from "./TopNavBar";
import { useAuthStore } from "@/resources/store/authStore";
import { useSelectedObjectStore } from "@/resources/store/selectedObjectStore";

const store = () => useSelectedObjectStore.getState();
const signOutBtn = () => screen.getByRole("button", { name: "Sign Out" });

function openTwo() {
  store().setObjects(
    [
      SceneType.fromJS({ uuid: "st-1", name: "Alpha" }) as SceneType,
      SceneType.fromJS({ uuid: "st-2", name: "Beta" }) as SceneType,
    ],
    "SceneType",
  );
  store().setSelectedObject("st-1");
  store().setSelectedObject("st-2");
}

/** Signed in, with `logout` stubbed — the teardown itself is tested elsewhere. */
let logout: ReturnType<typeof vi.fn<() => Promise<void>>>;

beforeEach(() => {
  store().resetObjects();
  logout = vi.fn<() => Promise<void>>(() => Promise.resolve());
  useAuthStore.setState({ currentUser: { username: "ann", isAdmin: false }, logout });
});

afterEach(cleanup);

describe("TopNavBar sign-out guard", () => {
  it("signs out immediately when no tab is dirty", () => {
    openTwo();
    render(<TopNavBar onOpenLogin={vi.fn()} />);
    fireEvent.click(signOutBtn());

    expect(screen.queryByText("Discard unsaved changes?")).toBeNull();
    expect(logout).toHaveBeenCalled();
  });

  it("confirms first when a tab has unsaved changes", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<TopNavBar onOpenLogin={vi.fn()} />);
    fireEvent.click(signOutBtn());

    expect(screen.getByText("Discard unsaved changes?")).toBeTruthy();
    // nothing torn down yet
    expect(logout).not.toHaveBeenCalled();
  });

  it("'Sign out and discard' signs out", () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<TopNavBar onOpenLogin={vi.fn()} />);
    fireEvent.click(signOutBtn());
    fireEvent.click(screen.getByRole("button", { name: "Sign out and discard" }));

    expect(logout).toHaveBeenCalled();
  });

  it("Cancel dismisses the dialog and keeps the session", async () => {
    openTwo();
    store().updateSelectedField("name", "Beta edited");
    render(<TopNavBar onOpenLogin={vi.fn()} />);
    fireEvent.click(signOutBtn());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Discard unsaved changes?")).toBeNull());
    expect(logout).not.toHaveBeenCalled();
    expect(store().openTabs).toHaveLength(2);
  });
});
