# Analytics Dashboard - Dependencies

## Required NPM Packages

The analytics dashboard requires the following additional dependencies to be installed:

### Charts (Recharts)
```bash
npm install recharts
```

**Purpose**: Interactive and responsive charts for data visualization.

**Features**:
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distribution
- Area charts for cumulative data
- Built-in responsive containers
- Customizable tooltips and legends

### Date Utilities (date-fns)
```bash
npm install date-fns
```

**Purpose**: Date manipulation and formatting.

**Features**:
- Date range calculations
- Format dates for display
- Time zone handling
- Lightweight alternative to moment.js

### Excel Export (xlsx)
```bash
npm install xlsx
```

**Purpose**: Export analytics data to Excel format.

**Features**:
- Create Excel workbooks
- Multiple sheets support
- Cell formatting
- Compatible with Excel, LibreOffice, etc.

### Chart Export (html2canvas)
```bash
npm install html2canvas
```

**Purpose**: Capture charts as PNG images.

**Features**:
- Convert DOM elements to canvas
- Export charts as images
- High-quality screenshots

### PDF Generation (jspdf & jspdf-autotable)
```bash
npm install jspdf jspdf-autotable
```

**Purpose**: Generate PDF reports with charts and tables.

**Features**:
- Create PDF documents
- Add tables with auto-table
- Include images and charts
- Multi-page support

## Installation Command

Run this single command to install all required dependencies:

```bash
npm install recharts date-fns xlsx html2canvas jspdf jspdf-autotable
```

## Verification

After installation, verify the packages are in your `package.json`:

```json
{
  "dependencies": {
    "recharts": "^2.x.x",
    "date-fns": "^3.x.x",
    "xlsx": "^0.18.x",
    "html2canvas": "^1.4.x",
    "jspdf": "^2.x.x",
    "jspdf-autotable": "^3.x.x"
  }
}
```

## Usage in Code

### Recharts
```javascript
import { LineChart, Line, BarChart, Bar, PieChart, Pie } from 'recharts';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
```

### date-fns
```javascript
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
```

### xlsx
```javascript
import * as XLSX from 'xlsx';
```

### html2canvas
```javascript
import html2canvas from 'html2canvas';
```

### jsPDF
```javascript
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
```

## Notes

- **Recharts** is the recommended charting library for React (simpler than Chart.js for React)
- **date-fns** is modular and tree-shakeable (smaller bundle size)
- **xlsx** works in all modern browsers
- **html2canvas** may have limitations with complex CSS (test thoroughly)
- **jspdf** supports both client-side and server-side PDF generation

## Alternative Options

If you prefer different libraries:

- **Charts**: Chart.js + react-chartjs-2 (already used in bulk assignment system)
- **Dates**: dayjs (even smaller than date-fns)
- **PDF**: pdfmake (alternative to jsPDF)

## Performance Considerations

- Recharts uses SVG (scalable but can be slow with large datasets)
- For very large datasets (>1000 points), consider:
  - Data sampling
  - Virtualization
  - Canvas-based charts (Chart.js)
- html2canvas can be slow for complex layouts
- Consider lazy loading chart components
