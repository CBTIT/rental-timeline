# Floorplan Rental Timeline (2.5D Viewer)

An interactive web app that visualizes apartment/unit occupancy over time. Users scrub a timeline slider to see which units are rented at a given date, and rented units “reveal” their 2.5D / 3D geometry in the viewer. Users can also click units to view details.

## Features

- Timeline slider to visualize occupancy over time
- 3D viewer using a perspective camera and 2D top-down viewer using an orthographic camera
- Units update state based on selected date:
  - Available (base color)
  - Rented (unit acquires highlight color)
- Click a unit to view details (lease dates, unit type, sqft, etc.)
- Multi-floor support 

## Tech Stack

- React + Vite
- three.js + React Three Fiber
- @react-three/drei (controls + helpers)
- 3dm assets exported from Rhino

## Getting Started

### Prerequisites

- Node.js (LTS recommended)

### Install & Run

```bash
npm install
npm run dev
```
