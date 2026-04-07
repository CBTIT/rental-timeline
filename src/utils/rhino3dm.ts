import { Rhino3dmLoader } from "three-stdlib";

const RHINO3DM_LIB_PATH = "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/";

let sharedLoader: Rhino3dmLoader | null = null;

export function getSharedRhino3dmLoader(): Rhino3dmLoader {
  if (sharedLoader) return sharedLoader;
  const loader = new Rhino3dmLoader();
  loader.setLibraryPath(RHINO3DM_LIB_PATH);
  sharedLoader = loader;
  return loader;
}

export function getRhino3dmLibPath(): string {
  return RHINO3DM_LIB_PATH;
}

