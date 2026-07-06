import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import { engine, resize, globalObject, lineUpdateService } from "@/engine";
import { instanceUtility } from "@/resources/services/instance-utility";

// Port of the old three-canvas `checkForLineToUpdate()`: keep the open scene's
// relation line glued to its endpoints on each steady-render tick.
async function checkForLineToUpdate() {
  // Mirror the animator's guard so we don't log "no sceneInstance found" every
  // second before a preview has been run.
  if (globalObject.tabContext.length === 0) return;
  const sceneInstance = await instanceUtility.getTabContextSceneInstance();
  if (sceneInstance && sceneInstance.relationclasses_instances.length > 0) {
    const uuid = sceneInstance.relationclasses_instances[0].uuid;
    const threeScene = await instanceUtility.getTabContextThreeInstance();
    const line = threeScene.getObjectByProperty("uuid", uuid);
    if (line) await lineUpdateService.setPos(line as Line2);
  }
}

// Ports `views/three-canvas/three-canvas.{ts,html}`. The old client found the
// canvas container via `document.getElementById('container')` and a polling
// interval; in React we pass the container element straight into engine.mount()
// (plan §273/§314). The engine is mounted ONCE (ref + empty-dep useEffect);
// engine.mount/unmount are idempotent so StrictMode's double-invoke is safe.
// A ResizeObserver keeps the renderer + cameras in sync with the container size.
//
// The AR button (engine.createARButton()) is intentionally omitted here
// (decision D5): AR is a vizrep-only extra and an "AR NOT SUPPORTED" overlay
// inside a form is noise.
export default function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let observer: ResizeObserver | undefined;

    engine.mount(el).then(() => {
      if (disposed) return;
      // Match the renderer/cameras to the actual container size, then keep them
      // synced (the ResizeObserver replaces the old window 'resize' listener).
      resize.resize();
      observer = new ResizeObserver(() => resize.resize());
      observer.observe(el);
    });

    // Steady-render safety net — a faithful port of the old three-canvas
    // `attached()` ("set steady rendering at least every second"). The animator
    // only draws a frame when globalObject.render === true, but the vizrep
    // *update* path (graphic-context updateVizRepClass/Port/RelClass, invoked on
    // every attribute-window edit via vizrepUpdateChecker.checkForVizRepUpdate)
    // mutates the meshes in place WITHOUT ever setting that flag. Without this
    // tick those edits never reach the canvas — i.e. changing an attribute value
    // is not reflected in the preview. It also keeps the relation line
    // positioned. (The P8 port dropped this, wrongly assuming the ResizeObserver
    // covered it.)
    const steadyRender = setInterval(() => {
      globalObject.render = true;
      void checkForLineToUpdate();
    }, 1000);

    return () => {
      disposed = true;
      clearInterval(steadyRender);
      observer?.disconnect();
      engine.unmount();
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      className="three_canvas"
      id="container"
      sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "#1e1e1e", overflow: "hidden" }}
    />
  );
}
