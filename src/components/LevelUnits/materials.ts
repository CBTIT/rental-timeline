import * as THREE from "three";
import { generateGradient } from "../../utils/colorGradient";

export type UnitMaterialSet = {
  outline: THREE.LineBasicMaterial;
  text: THREE.MeshStandardMaterial;
  base: THREE.MeshStandardMaterial;
  selected: THREE.MeshStandardMaterial;
  leased: THREE.MeshStandardMaterial;
  overlayBase: THREE.MeshStandardMaterial;
  overlayLeased: THREE.MeshStandardMaterial;
  affordable: THREE.MeshStandardMaterial;
  combinedBase3D: THREE.MeshStandardMaterial;
  bucketMaterials: THREE.MeshStandardMaterial[];
  bucketOverlayMaterials: THREE.MeshStandardMaterial[];
};

export function createUnitMaterials(
  selectedLeaseColor: string,
  bucketCount: number = 5,
  minLightness: number = 0.3,
): UnitMaterialSet {
  const outline = new THREE.LineBasicMaterial({
    color: "#111111",
    transparent: true,
    opacity: 0.55,
    depthTest: true,
    depthWrite: false,
  });

  const text = new THREE.MeshStandardMaterial({
    color: "#111111",
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: true,
  });

  const base = new THREE.MeshStandardMaterial({
    color: "#f0efeb",
    depthWrite: true,
    depthTest: true,
  });
  const combinedBase3D = new THREE.MeshStandardMaterial({
    color: "#f0efeb",
    transparent: true,
    opacity: 0.28, // Increased from 0.12 for better architectural context in combined mode
    depthWrite: false,
    depthTest: true,
  });

  const selected = new THREE.MeshStandardMaterial({
    color: "#ffdf24",
    depthWrite: true,
    depthTest: true,
  });

  const leased = new THREE.MeshStandardMaterial({
    color: selectedLeaseColor,
    depthWrite: true,
    depthTest: true,
  });

  const overlayBase = new THREE.MeshStandardMaterial({
    color: "#f0efeb",
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
  });

  const overlayLeased = new THREE.MeshStandardMaterial({
    color: selectedLeaseColor,
    transparent: true,
    opacity: 0.25,
    depthTest: true,
    depthWrite: false, // Allow proper transparency stacking in combined mode
  });

  const affordable = new THREE.MeshStandardMaterial({
    color: "#a7bed3",
    depthWrite: true,
    depthTest: true,
  });

  // Generate gradient bucket materials
  const gradientColors = generateGradient(
    selectedLeaseColor,
    bucketCount,
    minLightness,
  );
  const bucketMaterials = gradientColors.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color: color,
        depthWrite: true,
        depthTest: true,
      }),
  );

  const bucketOverlayMaterials = gradientColors.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        depthTest: true,
        depthWrite: true,
      }),
  );

  return {
    outline,
    text,
    base,
    selected,
    leased,
    overlayBase,
    overlayLeased,
    affordable,
    combinedBase3D,
    bucketMaterials,
    bucketOverlayMaterials,
  };
}

export function disposeUnitMaterials(materials: UnitMaterialSet) {
  materials.outline.dispose();
  materials.text.dispose();
  materials.base.dispose();
  materials.selected.dispose();
  materials.leased.dispose();
  materials.overlayBase.dispose();
  materials.overlayLeased.dispose();
  materials.affordable.dispose();
  materials.bucketMaterials.forEach((m) => m.dispose());
  materials.bucketOverlayMaterials.forEach((m) => m.dispose());
}
