# Bulk Assignment System - Dependencies

## Required NPM Packages

The bulk assignment system requires the following additional dependencies to be installed:

### Drag-and-Drop (DND Kit)
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Purpose**: Provides drag-and-drop functionality for assigning students to referents.

**Packages**:
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - Utility functions

### Charts (Chart.js)
```bash
npm install chart.js react-chartjs-2
```

**Purpose**: Workload visualization with bar and pie charts.

**Packages**:
- `chart.js` - Chart rendering library
- `react-chartjs-2` - React wrapper for Chart.js

### PDF Export (jsPDF)
```bash
npm install jspdf jspdf-autotable
```

**Purpose**: Export assignment reports to PDF format.

**Packages**:
- `jspdf` - PDF generation library
- `jspdf-autotable` - Table plugin for jsPDF

## Installation Command

Run this single command to install all required dependencies:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities chart.js react-chartjs-2 jspdf jspdf-autotable
```

## Verification

After installation, verify the packages are in your `package.json`:

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.x.x",
    "@dnd-kit/sortable": "^8.x.x",
    "@dnd-kit/utilities": "^3.x.x",
    "chart.js": "^4.x.x",
    "react-chartjs-2": "^5.x.x",
    "jspdf": "^2.x.x",
    "jspdf-autotable": "^3.x.x"
  }
}
```

## Usage in Code

### DND Kit
```javascript
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
```

### Chart.js
```javascript
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js';
```

### jsPDF
```javascript
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
```

## Notes

- All packages are actively maintained and widely used
- DND Kit is the recommended drag-and-drop library for React (modern alternative to react-dnd)
- Chart.js v4+ requires manual registration of components
- jsPDF works in all modern browsers
