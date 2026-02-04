# Floorplan Rental Timeline (2.5D Viewer)

An interactive web app that visualizes apartment/unit occupancy over time. Users scrub a timeline slider to see which units are rented at a given date, and rented units “reveal” their 2.5D / 3D geometry in the viewer. Users can also click units to view details.

## Features

- Timeline slider (scrub / play) to visualize occupancy over time
- 2.5D / 3D top-down viewer (orthographic camera) with pan/zoom (and optional orbit)
- Units update state based on selected date:
  - Available (base geometry only)
  - Rented (unit interior / furniture geometry becomes visible)
- Click a unit to view details (lease dates, unit type, sqft, etc.)
- Multi-floor support (planned) (maybe)

## Tech Stack

- React + Vite
- three.js + React Three Fiber
- @react-three/drei (controls + helpers)
- glTF/GLB assets exported from Rhino/Grasshopper (or other DCC)

## Getting Started

### Prerequisites

- Node.js (LTS recommended)

### Install & Run

```bash
npm install
npm run dev
```
