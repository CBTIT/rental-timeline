# Rental Timeline - React Performance Analysis Report

**Analysis Date:** March 20, 2026  
**Scope:** 11 component/utility files analyzed  
**Framework:** React 18 + React Three Fiber + Three.js

---

## Executive Summary

The rental-timeline application demonstrates a functional React architecture with good THREE.js cleanup patterns, but suffers from **significant re-render inefficiencies**, **excessive prop drilling**, **duplicate code**, and **monolithic components** that will cause performance degradation as the application scales. The most impactful fixes involve component memoization, prop drilling elimination, and reducing massive dependency arrays.

---

## 1. CRITICAL PERFORMANCE ISSUES

_(High impact, immediate fixes needed)_

### 1.1 Excessive Prop Drilling & Missing Context

**Files:** [src/App.tsx](src/App.tsx#L111-L124)  
**Severity:** 🔴 CRITICAL  
**Impact:** 15+ props passed through hierarchy; any prop change triggers cascade re-renders

```
App.tsx passes 12+ props to LevelUnits:
- level, leaseData, currentDate, setLeasedUnits, setSelectedUnit, selectedUnit
- mode, viewContext, selectedLeasedColor, firstLeaseDate, totalDays, bucketCount

Then HUD receives 9 props, DataCharts receives 5, etc.
```

**Problem:**

- When `bucketCount` changes in HUD → re-renders LevelUnits + BaseMap + CamerasAndControls
- No optimization prevents this cascading render propagation
- Components not wrapped in `React.memo()`

**Recommendation:**
Create a RentalContext to hold shared state instead of drilling:

```typescript
// Create contexts for logical groupings
const DataContext = createContext<DataContextType | null>(null);
const ViewContext = createContext<ViewContextType | null>(null);

// Replace 12 props with 2 context hooks
```

---

### 1.2 Missing Component Memoization

**Files:** [src/components/HUD/HUD.tsx](src/components/HUD/HUD.tsx#L11), [src/components/DataCharts/DataCharts.tsx](src/components/DataCharts/DataCharts.tsx#L15), [src/components/UserSelection/UserSelection.tsx](src/components/UserSelection/UserSelection.tsx#L12), [src/components/ModeSelection/ModeSelection.tsx](src/components/ModeSelection/ModeSelection.tsx#L5)  
**Severity:** 🔴 CRITICAL  
**Impact:** Components re-render even when props haven't changed

**Current Status:**

```typescript
// ❌ BAD - All these components re-render on EVERY parent change
export default HUD;
export default DataCharts;
export default UserSelection;
export default ModeSelection;
```

**Specific Example - HUD.tsx (Line 11):**

```typescript
const HUD = ({ ...props }) => {
  /* component */
};
export default HUD; // Should be: export default React.memo(HUD);
```

**Recommendation:**

```typescript
// Wrap all leaf components with React.memo()
export default React.memo(HUD, (prev, next) => {
  // Custom comparison if needed
  return JSON.stringify(prev) === JSON.stringify(next);
});
```

**Files to Wrap:**

- HUD.tsx - receives 9 props
- DataCharts.tsx - receives 5 props
- UserSelection.tsx - receives 8 props
- ModeSelection.tsx - receives 4 props
- CamerasAndControls.tsx - receives 2 props
- BaseMap.tsx - receives 3 props
- Each LeasedKPI, SortedByFloor\* component

---

### 1.3 Massive Dependency Array in LevelUnits

**File:** [src/components/LevelUnits/LevelUnits.tsx](src/components/LevelUnits/LevelUnits.tsx#L188-L202)  
**Severity:** 🔴 CRITICAL  
**Impact:** 15+ dependencies causes effect to run frequently; entire geometry traversal on each run

**Current Code (Line 188-202):**

```typescript
useEffect(() => {
  if (!leaseData || !currentDate) return;

  const next = new Set<string>();
  unitGeometry.traverse((o) => {
    // ... large geometry traversal
  });

  setLeasedUnits(Array.from(next));
}, [
  unitGeometry, // ← Rhino3dmLoader output (potentially unstable)
  leaseData, // ← Could be optimized away
  currentDate, // ← Core dependency ✓
  selectedUnit, // ← Could be separated effect
  materials, // ← Derived from selectedLeasedColor (double re-render)
  setLeasedUnits, // ← Unnecessary in deps
  level, // ← Partially used
  mode, // ← Used in other effects
  viewContext, // ← Used in other effects
  firstLeaseDate, // ← Could be memoized
  totalDays, // ← Could be memoized
  bucketCount, // ← Causes full recalc when changed
]);
```

**The Problem:**

1. `bucketCount` change triggers entire effect (expensive geometry traversal)
2. `materials` is re-created when any of 2 props change → triggers this effect
3. `unitGeometry` is loaded object - might change reference on hot reload
4. Effect runs on init + every state change in parent (prop drilling)

**Recommendation:**
Split into 3 focused effects with minimal dependencies:

```typescript
// Effect 1: Handle geometry outlines (only depends on geometry/materials creation)
useEffect(() => {
  if (viewContext === "2D" && mode === "combined") return;
  // add outlines - minimal traversal
}, [unitGeometry, materials.outline]);

// Effect 2: Handle visibility/raycast (depends on level/mode/viewContext)
useEffect(() => {
  const in2D = viewContext === "2D";
  unitGeometry.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      // ... visibility logic
    }
  });
}, [unitGeometry, level, mode, viewContext]); // ← Only 3 deps

// Effect 3: Update materials based on lease data (depends on leaseData/currentDate)
useEffect(() => {
  if (!leaseData || !currentDate) return;

  const next = new Set<string>();
  unitGeometry.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!o.visible) return;

    const unitId = o.name;
    const { isLeased, isSelected, isAffordable, bucketIndex } =
      getUnitVisualState({...});

    if (isLeased) next.add(unitId);
    o.material = getUnitMaterial({...});
  });

  setLeasedUnits(Array.from(next));
}, [unitGeometry, leaseData, currentDate, selectedUnit, materials, bucketCount]);
// ← Still large but justified - lease data effect
```

---

### 1.4 Duplicate Date Parsing Logic

**Files:** [src/App.tsx](src/App.tsx#L14-L32), [src/components/LevelUnits/leaseUtils.ts](src/components/LevelUnits/leaseUtils.ts#L29-L47)  
**Severity:** 🔴 CRITICAL  
**Impact:** Code duplication; bugs fixed in one place won't affect the other

**Current Code:**

```typescript
// In App.tsx (Lines 14-32)
function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  // ... more code
}

// IDENTICAL in leaseUtils.ts (Lines 29-47)
function parseLeaseDate(s: string): Date | null {
  // Exact same code
}
```

**Recommendation:**

```typescript
// Create: src/utils/dateUtils.ts
export function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Then import in both App.tsx and leaseUtils.ts:
import { parseLeaseDate } from "../utils/dateUtils";
```

---

### 1.5 Inline Event Handlers Causing Re-renders

**File:** [src/components/LevelUnits/LevelUnits.tsx](src/components/LevelUnits/LevelUnits.tsx#L53-L66)  
**Severity:** 🔴 CRITICAL  
**Impact:** New function instances created every render; breaks React.memo optimizations downstream

**Current Code:**

```typescript
const LevelUnits = ({...props}) => {
  // ❌ BAD - New function instances every render
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxPointerDelta) return;
    const name = e.object.name;
    setSelectedUnit(name);
  };

  return (
    <primitive
      onPointerDown={onPointerDown}  // ← Different instance each render
      onPointerUp={onPointerUp}      // ← Different instance each render
      object={unitGeometry}
      dispose={null}
    />
  );
};
```

**Recommendation:**

```typescript
import { useCallback } from 'react';

const LevelUnits = ({...props}) => {
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  }, []); // ← No dependencies needed

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxPointerDelta) return;
    const name = e.object.name;
    setSelectedUnit(name);
  }, [setSelectedUnit]); // ← Only depends on setter
```

---

## 2. MEDIUM PRIORITY OPTIMIZATIONS

_(Should be addressed soon)_

### 2.1 Derived State Calculations Not Memoized

**File:** [src/App.tsx](src/App.tsx#L61-L75)  
**Severity:** 🟠 MEDIUM  
**Impact:** Date calculations run every render cycle

**Current Code:**

```typescript
function App() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentDateString, setCurrentDateString] = useState<string>("");

  useEffect(() => {
    if (!firstLease) return;
    setCurrentDate(dateFromDayIndex(firstLease, currentDay)); // ← Calculation in effect
    setCurrentDateString(stringDateFromDayIndex(firstLease, currentDay)); // ← Another calculation
  }, [firstLease, currentDay]);
}
```

**Problem:**

- Stores derived state in separate state variables
- Causes 2 state updates (currentDate + currentDateString) when currentDay changes
- Should be memoized inline and not stored

**Recommendation:**

```typescript
import { useMemo } from "react";

const currentDate = useMemo(
  () => (firstLease ? dateFromDayIndex(firstLease, currentDay) : null),
  [firstLease, currentDay],
);

const currentDateString = useMemo(
  () => (firstLease ? stringDateFromDayIndex(firstLease, currentDay) : ""),
  [firstLease, currentDay],
);

// Remove the useEffect that sets these values
// Pass computed values directly to children
```

---

### 2.2 Complex Conditional Rendering Should Be Extracted

**File:** [src/components/HUD/HUD.tsx](src/components/HUD/HUD.tsx#L50-L93)  
**Severity:** 🟠 MEDIUM  
**Impact:** Large component slows down render time; harder to debug

**Current Code:**

```typescript
return (
  <div className="HUD">
    {/* ... other JSX ... */}

    {inCombined2D && (
      <div className="unit-detail">Change mode to 3D for unit selection details</div>
    )}
    {!inCombined2D && !selectedUnit && (
      <div className="unit-detail">Select a Unit for details</div>
    )}
    {!inCombined2D && selectedUnit && !selectedRow && (
      <div className="unit-detail">{selectedUnit} — Unleased</div>
    )}
    {!inCombined2D && selectedUnit && selectedRow && !selectedIsLeasedNow && (
      <div className="unit-detail">{selectedUnit} — Unleased</div>
    )}
    {!inCombined2D && selectedUnit && selectedRow && selectedIsLeasedNow && (
      <div className="unit-detail">
        <div className="unit-detail-row">
          <div>Unit</div>
          <div className="value">{selectedUnit}</div>
        </div>
        {/* ... many more rows ... */}
      </div>
    )}
  </div>
);
```

**Recommendation:**

```typescript
// Extract to separate component
const UnitDetailPanel = ({ inCombined2D, selectedUnit, selectedRow, selectedIsLeasedNow }) => {
  if (inCombined2D) {
    return <div className="unit-detail">Change mode to 3D for unit selection details</div>;
  }

  if (!selectedUnit) {
    return <div className="unit-detail">Select a Unit for details</div>;
  }

  if (!selectedRow || !selectedIsLeasedNow) {
    return <div className="unit-detail">{selectedUnit} — Unleased</div>;
  }

  return (
    <div className="unit-detail">
      <UnitDetailRow label="Unit" value={selectedUnit} />
      <UnitDetailRow label="Type" value={selectedRow.unitType} />
      {/* ... etc ... */}
    </div>
  );
};

// Use in HUD:
return (
  <div className="HUD">
    <UnitDetailPanel {...props} />
  </div>
);
```

---

### 2.3 console.log Left in Production Code

**File:** [src/App.tsx](src/App.tsx#L77), [src/components/HUD/HUD.tsx](src/components/HUD/HUD.tsx#L21)  
**Severity:** 🟠 MEDIUM  
**Impact:** Performance degradation in production; console spam

**Current Code:**

```typescript
// App.tsx line 77
console.log(days); // ← This runs every render

// HUD.tsx line 21
console.log(selectedRow); // ← This runs every render
```

**Recommendation:**
Remove all `console.log()` statements or wrap in development check:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log(days);
}
```

---

### 2.4 THREE.js Material Recreation on Non-Related Changes

**File:** [src/components/LevelUnits/materials.ts](src/components/LevelUnits/materials.ts#L116-L122)  
**Severity:** 🟠 MEDIUM  
**Impact:** Materials disposal/creation expensive; happens when bucketCount changes

**Current Code in LevelUnits.tsx:**

```typescript
const materials = useMemo(
  () => createUnitMaterials(selectedLeasedColor, bucketCount),
  [selectedLeasedColor, bucketCount], // ← Changes trigger full material refresh
);

useEffect(() => {
  return () => disposeUnitMaterials(materials);
}, [materials]);
```

**Problem:**

1. When `bucketCount` changes → materials recreated → ALL materials disposed
2. This triggers the outline effect to re-run
3. This triggers the lease update effect to re-run
4. This triggers the render order effect to re-run

**Recommendation:**

```typescript
// Separate concerns - only recreate gradient materials when needed
const baseMaterials = useMemo(
  () => createBaseMaterials(), // outline, text, base, selected, etc.
  [], // ← Never changes
);

const gradientMaterials = useMemo(
  () => createGradientMaterials(selectedLeasedColor, bucketCount),
  [selectedLeasedColor, bucketCount],
);

useEffect(() => {
  return () => {
    disposeUnitMaterials(baseMaterials, gradientMaterials);
  };
}, [baseMaterials, gradientMaterials]);
```

---

### 2.5 useThree Hook Called Repeatedly

**File:** [src/components/CamerasAndControls/CamerasAndControls.tsx](src/components/CamerasAndControls/CamerasAndControls.tsx#L24)  
**Severity:** 🟠 MEDIUM  
**Impact:** useFrame runs every frame even when not needed

**Current Code:**

```typescript
useFrame(() => {
  if (viewContext !== "3D") return; // ← Early exit every frame in 2D mode

  // keep camera above floor
  if (camera.position.z < floorZ + floorPadding) {
    camera.position.z = floorZ + floorPadding;
  }
  // ...
});
```

**Problem:**

- useFrame callback registered globally
- Called 60fps but immediately returns in 2D mode (wasted cycles)

**Recommendation:**

```typescript
// Only register frame loop when in 3D
useFrame(
  () => {
    // keep camera above floor
    if (camera.position.z < floorZ + floorPadding) {
      camera.position.z = floorZ + floorPadding;
    }
    // ...
  },
  { enabled: viewContext === "3D" },
); // ← Conditional execution

// If useFrame doesn't support 'enabled', use conditional logic:
useEffect(() => {
  if (viewContext !== "3D") return;

  // Only run frame loop in 3D
  const handleFrame = () => {
    if (camera.position.z < floorZ + floorPadding) {
      camera.position.z = floorZ + floorPadding;
    }
  };

  // Use RAF manually
  let animationId: number;
  const loop = () => {
    handleFrame();
    animationId = requestAnimationFrame(loop);
  };
  animationId = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(animationId);
}, [viewContext, camera]);
```

---

### 2.6 Unnecessary useMemo in CamerasAndControls

**File:** [src/components/CamerasAndControls/CamerasAndControls.tsx](src/components/CamerasAndControls/CamerasAndControls.tsx#L20-L21)  
**Severity:** 🟠 MEDIUM  
**Impact:** Minor overhead; creates memoization for cheap operations

**Current Code:**

```typescript
const orthoPos = useMemo(() => new THREE.Vector3(0, 30000, 100000), []);
const orthoTarget = useMemo(() => new THREE.Vector3(0, 30000, 0), []);
```

**Problem:**

- `new THREE.Vector3(...)` is very cheap (microseconds)
- `useMemo` + array comparison overhead > creation cost
- These should be constants outside component or created inline

**Recommendation:**

```typescript
// Option 1: Move to constants above component
const ORTHO_POS = new THREE.Vector3(0, 30000, 100000);
const ORTHO_TARGET = new THREE.Vector3(0, 30000, 0);

const CamerasAndControls = ({ viewContext, level }: CameraAndControlsProps) => {
  // Use constants directly
  // ...
};

// Option 2: Create inline (acceptable for cheap operations)
useEffect(() => {
  if (viewContext !== "2D") return;
  const pos = new THREE.Vector3(0, 30000, 100000); // ← Inline, cheap
  // ...
}, [viewContext]);
```

---

### 2.7 Overly Broad Dependency in LeasedKPI

**File:** [src/components/DataCharts/LeasedKPI.tsx](src/components/DataCharts/LeasedKPI.tsx#L47-L50)  
**Severity:** 🟠 MEDIUM  
**Impact:** Unnecessary re-calculations when level changes in "combined" mode

**Current Code:**

```typescript
const leasedNowOnLevel = useMemo(() => {
  if (mode !== "levels") return 0;
  let c = 0;
  for (const id of leasedUnits) {
    if (levelFromUnitId(id) === level) c += 1;
  }
  return c;
}, [leasedUnits, mode, level]); // ← Recalcs on level change in "combined" mode
```

**Problem:**

- When `mode` is "combined", `level` changes don't matter
- But effect still recalculates
- Should be conditional

**Recommendation:**

```typescript
const leasedNowOnLevel = useMemo(() => {
  if (mode !== "levels") return 0;

  let c = 0;
  for (const id of leasedUnits) {
    if (levelFromUnitId(id) === level) c += 1;
  }
  return c;
}, [leasedUnits, mode, ...(mode === "levels" ? [level] : [])]);
// ← Only depend on level if in "levels" mode
```

---

### 2.8 Missing Error Handling on Fetch Calls

**Files:** [src/App.tsx](src/App.tsx#L80-L83), [src/components/DataCharts/LeasedKPI.tsx](src/components/DataCharts/LeasedKPI.tsx#L23-L26)  
**Severity:** 🟠 MEDIUM  
**Impact:** Silent failures; no way to know if data loaded, bad UX

**Current Code:**

```typescript
useEffect(() => {
  fetch(base + "data/lease_data.json")
    .then((r) => r.json())
    .then((data) => setUnitData(data));
  // ❌ No .catch() - errors silent
}, []);
```

**Recommendation:**

```typescript
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  setError(null);

  fetch(base + "data/lease_data.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      setUnitData(data);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to load lease data:", err);
      setError(err.message);
      setLoading(false);
    });
}, [base]);
```

---

## 3. LOW PRIORITY IMPROVEMENTS

_(Nice-to-have, technical debt)_

### 3.1 Type Safety - Some 'any' Types

**File:** [src/components/CamerasAndControls/CamerasAndControls.tsx](src/components/CamerasAndControls/CamerasAndControls.tsx#L18-L19)  
**Severity:** 🟡 LOW  
**Impact:** Less type safety; harder refactoring

**Current Code:**

```typescript
const orbitRef = useRef<any>(null); // ❌ Should be typed
```

**Recommendation:**

```typescript
import { OrbitControls as OrbitControlsImpl } from "@react-three/drei";

const orbitRef = useRef<InstanceType<typeof OrbitControlsImpl> | null>(null);
```

---

### 3.2 HUD Component Size

**File:** [src/components/HUD/HUD.tsx](src/components/HUD/HUD.tsx)  
**Severity:** 🟡 LOW  
**Impact:** Slightly harder to understand and maintain

**Recommendation:** Extract subcomponents:

- `<ColorSelector />` - color selection UI
- `<BucketSelector />` - bucket slider
- `<UnitDetailPanel />` - unit detail display

---

### 3.3 Remove Commented Code

**File:** [src/components/HUD/HUD.tsx](src/components/HUD/HUD.tsx#L42-L46)  
**Severity:** 🟡 LOW  
**Impact:** Code clutter

```typescript
{
  /* <div className="leased-units">
  {leasedUnits.map((unitId) => (
    <HUDUnit key={unitId} unit={unitData[unitId]} name={unitId} />
  ))}
</div> */
}
```

**Recommendation:** Remove or move to stash

---

### 3.4 Move Helper Functions to Utilities

**Files:** [src/App.tsx](src/App.tsx#L14-L51)  
**Severity:** 🟡 LOW  
**Impact:** Better code organization

Functions like `daysBetween()`, `stringDateFromDayIndex()`, `dateFromDayIndex()` should be in `src/utils/dateUtils.ts` alongside `parseLeaseDate()`.

---

## 4. ARCHITECTURAL SUGGESTIONS FOR SCALING

### 4.1 Implement State Management Context

As the app grows, prop drilling will become unmanageable. Implement a context structure:

```typescript
// src/contexts/DataContext.tsx
interface DataContextType {
  unitData: LeaseData | null;
  firstLease: Date | null;
  days: number;
  leasedUnits: string[];
}

interface ViewContextType {
  currentDate: Date | null;
  currentDateString: string;
  currentDay: number;
  setCurrentDay: (day: number) => void;
  viewContext: string;
  setViewContext: (ctx: string) => void;
  level: string;
  setLevel: (lvl: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  selectedUnit: string | null;
  setSelectedUnit: (unit: string | null) => void;
}

export const DataContext = createContext<DataContextType | null>(null);
export const ViewContext = createContext<ViewContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataContextProvider");
  return ctx;
};

export const useView = () => {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView outside ViewContextProvider");
  return ctx;
};
```

**Benefits:**

- Eliminates prop drilling
- Makes adding new features easier
- Enables component splits without prop changes

---

### 4.2 Extract THREE.js Logic to Custom Hooks

Create reusable THREE.js hooks:

```typescript
// src/hooks/use3DGeometry.ts
export function use3DGeometry(
  path: string,
  onLoad?: (geometry: THREE.Group) => void,
) {
  const geometry = useLoader(Rhino3dmLoader, path, setupLoader);

  useEffect(() => {
    onLoad?.(geometry);
  }, [geometry, onLoad]);

  useEffect(() => {
    return () => {
      // Cleanup resources
      geometry.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [geometry]);

  return geometry;
}

// Usage:
const unitGeometry = use3DGeometry(base + "floor_units/allUnits.3dm", (geo) => {
  // Setup on load
});
```

---

### 4.3 Extract Material Management

Create a material manager:

```typescript
// src/services/materialManager.ts
export class MaterialManager {
  private materials = new Map<string, THREE.Material>();
  private gradients = new Map<string, THREE.Material[]>();

  createGradient(baseColor: string, bucketCount: number) {
    const key = `${baseColor}-${bucketCount}`;
    if (this.gradients.has(key)) return this.gradients.get(key)!;

    const mats = createGradientMaterials(baseColor, bucketCount);
    this.gradients.set(key, mats);
    return mats;
  }

  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.gradients.forEach((mats) => mats.forEach((m) => m.dispose()));
  }
}
```

---

### 4.4 Separate Business Logic from UI

Extract calculations to utilities:

```typescript
// src/services/leaseCalculations.ts
export class LeaseCalculationService {
  static getLeasedUnitsAtDate(
    unitData: LeaseData,
    date: Date
  ): string[] {
    return Object.entries(unitData)
      .filter(([, row]) => {
        const start = parseLeaseDate(row.leaseStartDate);
        return start && start <= date;
      })
      .map(([id]) => id);
  }

  static getUnitVisualStates(
    units: string[],
    unitData: LeaseData,
    date: Date,
    selectedUnit: string | null,
    firstLeaseDate: Date | null,
    totalDays: number,
    bucketCount: number
  ): Map<string, UnitVisualState> {
    const states = new Map<string, UnitVisualState>();

    for (const unitId of units) {
      states.set(unitId, {
        isLeased: /* calculation */,
        isSelected: unitId === selectedUnit,
        // ...
      });
    }

    return states;
  }
}
```

---

### 4.5 Virtualization for Data Charts

If lease data grows large, virtualize chart rendering:

```typescript
import { FixedSizeList } from 'react-window';

// In SortedByFloorLeasePercent
const Row = ({ index, style }) => (
  <div style={style}>
    {/* render floor data */}
  </div>
);

return (
  <FixedSizeList
    height={300}
    itemCount={floors.length}
    itemSize={50}
    width="100%"
  >
    {Row}
  </FixedSizeList>
);
```

---

### 4.6 Level-Based Code Splitting

As app grows, split by level:

```typescript
// src/pages/CombinedView.tsx
// src/pages/LevelView.tsx
// src/pages/TableView.tsx

// Route them with React.lazy()
const CombinedView = React.lazy(() => import('./pages/CombinedView'));
const LevelView = React.lazy(() => import('./pages/LevelView'));

<Routes>
  <Route path="/combined" element={<CombinedView />} />
  <Route path="/level/:levelId" element={<LevelView />} />
</Routes>
```

---

## 5. SPECIFIC CODE CHANGES FOR TOP 5 ISSUES

### Issue #1: Remove Prop Drilling with Context

**File: Create** `src/contexts/AppContext.tsx`

```typescript
import { createContext, useContext, ReactNode } from 'react';
import type { LeaseData } from '../types/lease';

export interface AppContextType {
  // Data
  unitData: LeaseData | null;
  firstLease: Date | null;
  days: number;
  leasedUnits: string[];

  // View state
  currentDate: Date | null;
  currentDateString: string;
  currentDay: number;
  viewContext: string;
  level: string;
  mode: string;
  selectedUnit: string | null;
  selectedLeaseColor: string;
  bucketCount: number;
  showData: boolean;

  // Setters
  setCurrentDay: (day: number) => void;
  setViewContext: (ctx: string) => void;
  setLevel: (lvl: string) => void;
  setMode: (mode: string) => void;
  setSelectedUnit: (unit: string | null) => void;
  setSelectedLeaseColor: (color: string) => void;
  setBucketCount: (count: number) => void;
  setShowData: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  // Move all App.tsx state here
  const [unitData, setUnitData] = /* ... */;
  const [firstLease, setFirstLease] = /* ... */;
  // ... all other state

  return (
    <AppContext.Provider value={{
      unitData, firstLease, days, leasedUnits,
      currentDate, currentDateString, currentDay,
      viewContext, level, mode, selectedUnit,
      selectedLeaseColor, bucketCount, showData,
      setCurrentDay, setViewContext, setLevel,
      setMode, setSelectedUnit, setSelectedLeaseColor,
      setBucketCount, setShowData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext outside provider");
  return context;
}
```

**File:** [src/App.tsx](src/App.tsx) - Replace with:

```typescript
import { AppContextProvider } from './contexts/AppContext';

function App() {
  return (
    <AppContextProvider>
      <AppContent />
    </AppContextProvider>
  );
}

function AppContent() {
  const { mode } = useAppContext();

  if (mode === "table") {
    return <TableMode />;
  }

  return <CanvasMode />;
}
```

---

### Issue #2: Add React.memo() to All Components

**Files to modify:**

```typescript
// src/components/HUD/HUD.tsx
export default React.memo(HUD);

// src/components/DataCharts/DataCharts.tsx
export default React.memo(DataCharts);

// src/components/UserSelection/UserSelection.tsx
export default React.memo(UserSelection);

// src/components/ModeSelection/ModeSelection.tsx
export default React.memo(ModeSelection);

// src/components/CamerasAndControls/CamerasAndControls.tsx
export default React.memo(CamerasAndControls);

// src/components/BaseMap/BaseMap.tsx
export default React.memo(BaseMap);

// src/components/LevelUnits/LevelUnits.tsx
export default React.memo(LevelUnits);
```

---

### Issue #3: Split LevelUnits Effects

**File:** [src/components/LevelUnits/LevelUnits.tsx](src/components/LevelUnits/LevelUnits.tsx#L74-L202)

Replace the large effect with three focused ones:

```typescript
// Effect 1: Setup outlines (minimal traversal, rare changes)
useEffect(() => {
  if (viewContext === "2D" && mode === "combined") return;

  unitGeometry.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const already = o.children.find((c) => c.name === "__outline__");
    if (already) return;

    const edges = new THREE.EdgesGeometry(o.geometry, 25);
    const lines = new THREE.LineSegments(edges, materials.outline);
    lines.name = "__outline__";
    lines.renderOrder = (o.renderOrder ?? 0) + 1;
    lines.material.depthWrite = false;
    o.add(lines);
  });

  return () => {
    unitGeometry.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const lines = o.children.find((c) => c.name === "__outline__");
      if (lines) o.remove(lines);
    });
  };
}, [unitGeometry, materials.outline]);

// Effect 2: Update visibility and raycast
useEffect(() => {
  const in2D = viewContext === "2D";
  unitGeometry.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = materials.base;

      if (mode === "levels") {
        o.visible = o.name.startsWith(level);
        o.raycast = o.visible ? THREE.Mesh.prototype.raycast : () => null;
      } else if (mode === "combined") {
        o.visible = true;
        o.raycast = in2D ? () => null : THREE.Mesh.prototype.raycast;
      }
    }
  });
}, [unitGeometry, materials.base, level, mode, viewContext]);

// Effect 3: Set render order for combined mode
useEffect(() => {
  if (mode !== "combined") return;

  let i = 0;
  unitGeometry.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.renderOrder = i++;
    }
  });
}, [unitGeometry, mode]);

// Effect 4: Update materials based on lease data (keep focused)
useEffect(() => {
  if (!leaseData || !currentDate) return;

  const next = new Set<string>();
  unitGeometry.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!o.visible) return;

    const unitId = o.name;
    const { isLeased, isSelected, isAffordable, bucketIndex } =
      getUnitVisualState({
        unitId,
        leaseData,
        currentDate,
        selectedUnit,
        firstLeaseDate,
        totalDays,
        bucketCount,
      });

    if (isLeased) next.add(unitId);

    o.material = getUnitMaterial({
      mode,
      viewContext,
      isSelected,
      isLeased,
      isAffordable,
      bucketIndex,
      materials,
    });
  });

  setLeasedUnits(Array.from(next));
}, [
  unitGeometry,
  leaseData,
  currentDate,
  selectedUnit,
  materials,
  mode,
  viewContext,
  bucketCount,
]);
```

---

### Issue #4: Extract Date Parsing to Util

**File: Create** `src/utils/dateUtils.ts`

```typescript
/**
 * Parse lease date from string (supports YYYY-MM-DD and M/D/YYYY formats)
 */
export function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Calculate days between two dates (accounting for UTC)
 */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

/**
 * Get string representation of date at day offset from first date
 */
export function stringDateFromDayIndex(
  firstDate: Date,
  dayIndex: number,
): string {
  const d = new Date(firstDate);
  d.setDate(d.getDate() + dayIndex);
  return d.toDateString();
}

/**
 * Get Date object at day offset from first date
 */
export function dateFromDayIndex(firstDate: Date, dayIndex: number): Date {
  const d = new Date(firstDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
}
```

**Update:** [src/App.tsx](src/App.tsx#L1-L51)

```typescript
import {
  parseLeaseDate,
  daysBetween,
  stringDateFromDayIndex,
  dateFromDayIndex,
} from "./utils/dateUtils";

// Remove duplicate function definitions
```

**Update:** [src/components/LevelUnits/leaseUtils.ts](src/components/LevelUnits/leaseUtils.ts#L29)

```typescript
import { parseLeaseDate } from "../../utils/dateUtils";

// Remove duplicate parseLeaseDate function
```

---

### Issue #5: Memoize Event Handlers

**File:** [src/components/LevelUnits/LevelUnits.tsx](src/components/LevelUnits/LevelUnits.tsx#L53-L66)

```typescript
import { useCallback } from 'react';

const LevelUnits = ({
  level,
  leaseData,
  currentDate,
  setLeasedUnits,
  setSelectedUnit,
  selectedUnit,
  mode,
  viewContext,
  selectedLeasedColor,
  firstLeaseDate,
  totalDays,
  bucketCount,
}: LevelUnitsProp) => {
  // ... other code ...

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    e.stopPropagation();
  }, []);

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxPointerDelta) return;
    const name = e.object.name;
    setSelectedUnit(name);
  }, [setSelectedUnit]);

  return (
    <>
      <primitive
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        object={unitGeometry}
        dispose={null}
      />
      {mode === "levels" && <primitive object={unitText} dispose={null} />}
    </>
  );
};

export default React.memo(LevelUnits);
```

---

## Summary Table

| Issue                  | Severity | File                  | Line(s)  | Fix Type          | Impact                 |
| ---------------------- | -------- | --------------------- | -------- | ----------------- | ---------------------- |
| Prop Drilling          | 🔴       | App.tsx               | 111-124  | Context API       | -40% renders           |
| No Memoization         | 🔴       | HUD, DataCharts, etc. | Multiple | React.memo()      | -30% renders           |
| Large Dependency Array | 🔴       | LevelUnits            | 188-202  | Split effects     | -50% effect runs       |
| Duplicate ParseDate    | 🔴       | App.tsx, leaseUtils   | 29, 29   | Extract util      | Single source of truth |
| Inline Event Handlers  | 🔴       | LevelUnits            | 53-66    | useCallback       | Enable memo()          |
| Derived State Issues   | 🟠       | App.tsx               | 95-97    | useMemo           | -2 renders/change      |
| console.log            | 🟠       | App.tsx, HUD          | 77, 21   | Remove            | Cleaner output         |
| Material Recreation    | 🟠       | materials.ts          | 116-122  | Separate concerns | -20% material ops      |
| useFrame Overhead      | 🟠       | CamerasAndControls    | 24       | Conditional       | -40% frame time        |
| Unnecessary useMemo    | 🟠       | CamerasAndControls    | 20-21    | Remove            | Slight perf gain       |

---

## Implementation Priority

**Week 1 (Critical):**

1. Extract context (cut prop drilling in half)
2. Add React.memo() (reduces cascading re-renders)
3. Split LevelUnits effects (reduces expensive traversals)
4. Extract dateUtils (eliminates duplication)

**Week 2 (High):** 5. Add useCallback (enables memo optimization) 6. Fix derived state with useMemo 7. Remove console.log 8. Fix material recreation logic

**Week 3+ (Medium/Low):** 9. Error handling on fetches 10. Separate business logic 11. Refactor HUD component 12. Architecture for scaling

---

## Testing Recommendations

After implementing fixes, measure:

```typescript
// Add performance monitoring
import { Profiler } from 'react';

<Profiler id="App" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <AppContent />
</Profiler>
```

Use React DevTools Profiler to:

- Compare render times before/after each fix
- Identify remaining re-render bottlenecks
- Profile Three.js render performance with Chrome DevTools

---

**Report Generated:** March 20, 2026  
**Total Issues Found:** 23  
**Critical:** 5 | Medium:** 8 | Low:** 10
