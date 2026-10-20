/**
 * The studio workspace (Fabric 2D canvas, Three.js 3D view) is its own chunk. `loadStudioWorkspace` is shared by the
 * page's dynamic() and the prefetch on project cards (`usePrefetchStudio`): calling it early warms the same chunk.
 */
export const loadStudioWorkspace = () => import("./StudioWorkspace").then((module) => module.StudioWorkspace);
