import { renderState } from "./Renderer";

/** The way the view faces, in radians: the camera's yaw, or 0 before there is a camera (a test with no level loaded). */
export function viewYaw(): number {
  const c = renderState.camera as { rotation?: { y: number } } | null;
  return c && c.rotation ? c.rotation.y : 0;
}
