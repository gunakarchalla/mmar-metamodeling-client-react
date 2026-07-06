import type { AttributeInstance } from "@gds/models/instance/Instance_attributes.structure";

/**
 * Tiny typed event emitter replacing the Aurelia EventAggregator. It deliberately
 * exposes `.subscribe(event, cb)` / `.publish(event, payload)` with the same
 * names/shape as EventAggregator so the engine ports (P3-P5) and views barely
 * change. `.subscribe` returns a disposable `{ dispose() }` (mirroring
 * EventAggregator) so React effects can unsubscribe in their cleanup.
 *
 * Channels in use (see plan.md §6):
 *   login                                  -> boolean  (login success)
 *   previewButtonClicked                   -> void
 *   changeCodeEditorCode                   -> void     (beautify + setValue)
 *   updatedGeometryValue                   -> void
 *   checkForVizRepUpdate                   -> void
 *   checkForVizRepUpdateByAttributeInstance-> AttributeInstance
 *   updateAttributeGui                     -> void
 *   removeAttributeGui                     -> void
 *   ctrlPlusSPressed                       -> void
 *   tabChanged                             -> void     (not in plan §6; published by
 *                                                       instance-utility / the tab bar
 *                                                       when the active tab changes —
 *                                                       kept for port fidelity)
 */
export interface EventPayloads {
  login: boolean;
  previewButtonClicked: void;
  changeCodeEditorCode: void;
  updatedGeometryValue: void;
  checkForVizRepUpdate: void;
  checkForVizRepUpdateByAttributeInstance: AttributeInstance;
  updateAttributeGui: void;
  removeAttributeGui: void;
  ctrlPlusSPressed: void;
  tabChanged: void;
}

export type EventName = keyof EventPayloads;

export interface Subscription {
  dispose(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (payload: any) => void;

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
    set.add(callback as Callback);
    return {
      dispose: () => {
        this.listeners.get(event)?.delete(callback as Callback);
      },
    };
  }

  publish<E extends EventName>(
    event: E,
    ...payload: EventPayloads[E] extends void ? [] : [EventPayloads[E]]
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // copy to a snapshot so a handler that (un)subscribes mid-dispatch is safe
    for (const cb of [...set]) {
      cb(payload[0]);
    }
  }
}

export const eventBus = new EventBus();
