# Rental Timeline — Lease Visualizer

Interactive 3D/2D leasing timeline for a multi-floor apartment building. Scrub a date slider to watch units color up as they're leased, switch floors, filter by rent/unit type, and view distribution charts.

**Project:** Fenway Kilmarnock

---

## Tech Stack

| | |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| 3D rendering | Three.js via @react-three/fiber + @react-three/drei |
| Geometry | Rhino `.3dm` files parsed at runtime via rhino3dm |
| Data | Static JSON (`lease_data.json`, `floor_unitCount.json`) |

---

## Logic Flow

### 1. Data load
On mount, `App.tsx` fetches `public/data/lease_data.json` — a flat object `Record<unitId, LeaseRow>`. It scans all `leaseStartDate` values to find the earliest and latest, establishing the timeline range.

### 2. Timeline → current date
A slider drives `currentDay` (integer offset from the first lease date). This maps to `currentDate` via `dateFromDayIndex`. At each position, a unit is considered **leased** if `leaseStartDate <= currentDate`.

### 3. Geometry
`LevelUnits` loads `public/floor_units/allUnits.3dm` (all unit meshes, module-level cache) and `public/unit_texts/level_N.3dm` (text labels per floor, cached per level). It traverses the Three.js scene graph, resolves each mesh name to a `unitId`, and applies a material based on the unit's lease state.

### 4. Coloring
Three modes:

| Mode | Logic |
|---|---|
| **Lease Date** | Gradient buckets (3–7, user-adjustable) — earlier leases get warmer colors |
| **Unit Type** | Per-category color: Studio / 1B / 2B / 3B / Affordable |
| **Concession** | Color per `freeMonths` value |

Materials are created by `createUnitMaterials()` and disposed when inputs change to avoid GPU leaks.

### 5. Filtering
Active filters (unit type, rent $/SF, concession) are ANDed. A leased unit only gets its lease color if it passes all filters — otherwise it renders as unleased. Filter tags appear in the UI and can be cleared individually.

### 6. Views

| `mode` | Description |
|---|---|
| `levels` | Single floor (L1–L8), level picker in HUD |
| `combined` | Full building stacked in 3D |
| `table` | Flat data table |

`viewContext` toggles between `3D` (perspective + orbit) and `2D` (orthographic top-down).

---

## Component Map

```
App.tsx                     root state, Canvas, desktop layout
├── MobileControls          all mobile UI: header, donut charts, bottom controls, modals
├── HUD                     desktop sidebar: color picker, level selector, unit detail, timeline
├── LevelUnits              Three.js scene — loads geometry, applies materials per lease state
│   ├── leaseUtils.ts       getUnitVisualState, getUnitMaterial
│   └── materials.ts        material factory + GPU disposal
├── DataCharts/             desktop chart panels (rent $/SF, unit type, floor, concession)
├── BaseMap                 satellite base map
├── CamerasAndControls      perspective/orthographic cameras + orbit controls
├── FloorPlanView           floor plan image overlay when a unit is selected
├── ModeSelection           top nav: mode tabs, theme toggle, filter tags
└── DataTable               table view

utils/
├── dateUtils.ts            parseLeaseDate, daysBetween, dateFromDayIndex
├── leaseBuckets.ts         getBucketIndex — maps lease date → color bucket
├── unitFilters.ts          UnitFilters type, unitMatchesFilters, rentPsfFilterLabel
├── unitTypeCategory.ts     classifyUnitTypeCategory → Studio / 1B / 2B / 3B
└── colorGradient.ts        generateGradient — interpolates N colors from a base hex
```

---

## Running Locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
npm run preview   # preview the build
```

---

## Updating Lease Data

Replace `public/data/lease_data.json`. Keys are unit IDs — the first digit must be the floor number (`"101"` = floor 1). Shape must match `LeaseRow` in `src/types/lease.ts`:

```ts
type LeaseRow = {
  unitType: string;
  description: string;
  unitArea: number;
  leaseStartDate: string;   // "YYYY-MM-DD" or "M/D/YYYY"
  leaseEndDate: string;
  leaseTerm: number;
  rent: number;
  psf: number;
  freeMonths: number;
  netRent: number;
  leasingAssociate: string;
  affordable: boolean;
};
```

`public/data/floor_unitCount.json` holds total inventory per floor — used for KPI calculations. Update it if the unit mix changes.
