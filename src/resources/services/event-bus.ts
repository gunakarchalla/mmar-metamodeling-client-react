import type { AttributeInstance } from "@gds/models/instance/Instance_attributes.structure";

/**
 * A small typed publish/subscribe bus.
 *
 * It carries the handful of signals that cross the boundary between React and
 * the 3D engine, where neither side can hold a reference to the other: the
 * engine has no components to call into, and the components must not import the
 * engine eagerly (its module scope creates a WebGL renderer).
 *
 * `subscribe` returns a disposable, so a React effect unsubscribes by returning
 * `sub.dispose`.
 */

/** Every signal the bus carries, and what each one delivers. */
export interface EventPayloads {
  /**
   * The session changed: `true` when a sign-in succeeded, `false` on sign-out.
   *
   * `false` is what the session teardown hangs off — `session-reset` for the
   * stores, `engine-reset` for the 3D engine. The bus is what lets those two
   * subscribe without `authStore` importing either of them; the engine half
   * especially, since the engine's module scope builds a WebGL renderer.
   */
  login: boolean;
  /** The Preview button was pressed; the editor should flush its buffer. */
  previewButtonClicked: void;
  /** The editor flushed its buffer; the pipeline should rebuild the scene. */
  updatedGeometryValue: void;
  /** The selection changed; the canvas should redraw for the new object. */
  previewSelectedObject: void;
  /** New source was loaded into the editor; it should be beautified. */
  changeCodeEditorCode: void;
  /** Something may have changed a VizRep; the engine should re-check. */
  checkForVizRepUpdate: void;
  /** As above, but limited to what depends on one attribute instance. */
  checkForVizRepUpdateByAttributeInstance: AttributeInstance;
  /** Show the attribute controls for the object currently drawn. */
  updateAttributeGui: void;
  /** Tear those controls down. */
  removeAttributeGui: void;
  /** The save chord was pressed inside the 3D canvas. */
  ctrlPlusSPressed: void;
  /** The engine switched to a different scene tab. */
  tabChanged: void;
}

export type EventName = keyof EventPayloads;

export interface Subscription {
  dispose(): void;
}

/** Erased callback type; `subscribe` and `publish` restore the payload type. */
type Callback = (payload: never) => void;

class EventBus {
  private listeners = new Map<EventName, Set<Callback>>();

  subscribe<E extends EventName>(
    event: E,
    callback: (payload: EventPayloads[E]) => void,
  ): Subscription {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set<Callback>();
      this.listeners.set(event, set);
    }
    set.add(callback as unknown as Callback);
    return {
      dispose: () => {
        this.listeners.get(event)?.delete(callback as unknown as Callback);
      },
    };
  }

  publish<E extends EventName>(
    event: E,
    ...payload: EventPayloads[E] extends void ? [] : [EventPayloads[E]]
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Dispatch over a snapshot, so a handler that subscribes or unsubscribes
    // while it runs does not disturb this round.
    for (const callback of [...set]) {
      (callback as (payload: unknown) => void)(payload[0]);
    }
  }
}

export const eventBus = new EventBus();
