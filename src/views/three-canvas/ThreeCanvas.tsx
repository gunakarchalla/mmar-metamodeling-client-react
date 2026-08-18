import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import { engine, resize, globalObject, lineUpdateService } from "@/engine";
import { instanceUtility } from "@/resources/services/instance-utility";
import { logger } from "@/resources/services/logger";
import { describeError } from "@/resources/util/describe-error";

/** Keep the open scene's relation line glued to the objects it connects. */
async function checkForLineToUpdate() {
  // Guard as the animator does, so nothing is logged every second before a
  // preview has been run at all.
  if (globalObject.tabContext.length === 0) return;
  const sceneInstance = await instanceUtility.getTabContextSceneInstance();
  if (sceneInstance && sceneInstance.relationclasses_instances.length > 0) {
    const uuid = sceneInstance.relationclasses_instances[0].uuid;
    const threeScene = await instanceUtility.getTabContextThreeInstance();
    const line = threeScene.getObjectByProperty("uuid", uuid);
    if (line) await lineUpdateService.setPos(line as Line2);
  }
}

/**
 * The live 3D preview: an element for the engine to render into, and the
 * lifecycle that keeps the singleton renderer attached to it.
 *
 * This component mounts and unmounts on every object, type and tab switch, which
 * is what the two guards below are for:
 *
 *   1. The cleanup waits for an in-flight `engine.mount()` before detaching —
 *      otherwise startup finishes after the unmount and leaves a render loop
 *      running against a canvas nobody can see.
 *   2. A cleanup that lands after a newer mount has taken over must not detach
 *      that newer mount's canvas, which is what the mount token identifies.
 *
 * A resize observer keeps the renderer and cameras matched to the element's
 * size. The AR entry point the engine offers is deliberately not surfaced here:
 * an "AR NOT SUPPORTED" overlay in the middle of a form is noise.
 */
export default function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let observer: ResizeObserver | undefined;

    const mounted = engine
      .mount(el)
      .then((token) => {
        if (disposed) return token;
        // Match the renderer and cameras to the element, then keep them matched.
        resize.resize();
        observer = new ResizeObserver(() => resize.resize());
        observer.observe(el);
        return token;
      })
      .catch((err: unknown) => {
        // A failed start-up — no WebGL context, say — should be a log line, not
        // an unhandled rejection that takes the whole General tab down.
        logger.log(`3D preview could not start: ${describeError(err)}`, "error");
        return undefined;
      });

    // Draw at least once a second regardless of what asked for it.
    //
    // The animator only draws when something sets the render flag, but the
    // VizRep *update* path — the one that runs when an attribute value changes —
    // mutates the meshes in place without ever setting it. Without this tick
    // those edits would never reach the canvas. It also keeps the relation line
    // positioned.
    const steadyRender = setInterval(() => {
      globalObject.render = true;
      // This fires forever, so a rejection here — the tab context pointing at a
      // scene torn down mid-tick, say — must neither become an unhandled
      // rejection nor fill the log with one entry per second.
      void checkForLineToUpdate().catch(() => {});
    }, 1000);

    return () => {
      disposed = true;
      clearInterval(steadyRender);
      observer?.disconnect();
      // Detach only once the mount has settled, and only if this mount still
      // owns the engine — the token check lives inside `unmount`.
      void mounted.then((token) => engine.unmount(token));
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      className="three_canvas"
      id="container"
      sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "#ffffff", overflow: "hidden" }}
    />
  );
}
