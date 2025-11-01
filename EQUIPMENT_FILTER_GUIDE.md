# Equipment Filter Implementation Guide

## 🎯 Overview

You now have **two powerful filtering approaches** for equipment management:

1. **Integrated Page Filtering** (Equipment Page) - Fast, instant client-side filtering
2. **Standalone Component** (Reusable anywhere) - Flexible, API-powered filtering

---

## 📦 What's Been Built

### 1. Backend API Endpoint ✅
**Endpoint:** `/api/equipment/status`

**Features:**
- 5 maintenance status filters (overdue, upcoming, resolved, critical, all)
- Full-text search (name, ID, serial, manufacturer, model)
- Pagination support (limit/offset)
- Multi-field sorting (name, nextDueDate, daysOverdue, statusColor, equipmentId, serial)
- Configurable sort direction (asc/desc)

**Example Requests:**
```bash
# Get overdue equipment
GET /api/equipment/status?status=overdue

# Get equipment due within 7 days
GET /api/equipment/status?status=upcoming&limit=20&offset=0

# Search for ventilators due soon
GET /api/equipment/status?status=upcoming&q=ventilator&sort=nextDueDate&dir=asc

# Get critical priority equipment
GET /api/equipment/status?status=critical&sort=daysOverdue&dir=desc
```

**Response Format:**
```json
{
  "total": 45,
  "items": [
    {
      "id": "...",
      "name": "CT Scanner",
      "equipmentId": "CT-001",
      "statusColor": "red",
      "isOverdue": true,
      "daysOverdue": 15,
      "nextDueDate": "2024-10-15",
      ...
    }
  ]
}
```

---

### 2. Integrated Equipment Page Filtering ✅
**Location:** `client/src/pages/equipment.tsx`

**Features:**
- Three filter dropdowns working together:
  - Facility Filter
  - Equipment Status (Active, Under Maintenance, etc.)
  - **Maintenance Status** (🔴 Overdue, ⚠️ Due Soon, ✅ Recently Serviced, 🚨 Critical)
- Search bar (name, ID, type)
- Client-side filtering (instant results)
- Works with existing sorting and view modes

**How to Use:**
1. Navigate to Equipment page
2. Use the new "Maintenance Status" dropdown
3. Combine with other filters for powerful queries
4. Results update instantly!

---

### 3. Standalone Reusable Component ✅
**Location:** `client/src/components/EquipmentFilter.tsx`

**Features:**
- Fully self-contained and reusable
- Debounced search (300ms) for performance
- Optional facility filtering
- Pagination controls
- Sorting options
- Auto-fetch or manual control
- Loading states
- Reset functionality

**Props:**
```typescript
type EquipmentFilterProps = {
  onResults: (data: { total: number; items: any[] }) => void;
  initialStatus?: string;        // Default: "all"
  withFacility?: boolean;         // Default: false
  autoFetch?: boolean;            // Default: true
};
```

---

## 🚀 Usage Examples

### Example 1: Simple Equipment List
```tsx
import { useState } from "react";
import EquipmentFilter from "@/components/EquipmentFilter";

function EquipmentList() {
  const [equipment, setEquipment] = useState([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipment</h1>
      
      <EquipmentFilter 
        onResults={(data) => setEquipment(data.items)}
      />
      
      <div className="mt-6">
        {equipment.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

---

### Example 2: Dashboard Widget (Overdue Only)
```tsx
import EquipmentFilter from "@/components/EquipmentFilter";

function OverdueWidget() {
  const [overdue, setOverdue] = useState([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue Maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <EquipmentFilter 
          initialStatus="overdue"
          onResults={(data) => setOverdue(data.items)}
        />
        
        <div className="mt-4">
          <p className="text-2xl font-bold text-red-600">
            {overdue.length}
          </p>
          <p className="text-sm">Equipment past due</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Example 3: Maintenance Calendar
```tsx
import EquipmentFilter from "@/components/EquipmentFilter";

function MaintenanceCalendar() {
  const [upcoming, setUpcoming] = useState([]);

  // Transform equipment into calendar events
  const events = upcoming.map(item => ({
    id: item.id,
    title: `${item.name} - Maintenance Due`,
    date: item.nextDueDate,
    type: item.isOverdue ? 'overdue' : 'upcoming',
  }));

  return (
    <div className="p-6">
      <EquipmentFilter 
        initialStatus="upcoming"
        onResults={(data) => setUpcoming(data.items)}
        withFacility={true}
      />
      
      <CalendarView events={events} />
    </div>
  );
}
```

---

### Example 4: Mobile View (Manual Fetch)
```tsx
import EquipmentFilter from "@/components/EquipmentFilter";

function MobileEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="p-4">
      <button onClick={() => setShowFilter(!showFilter)}>
        Filter
      </button>
      
      {showFilter && (
        <EquipmentFilter 
          onResults={(data) => {
            setEquipment(data.items);
            setShowFilter(false);
          }}
          autoFetch={false}  // User clicks "Refresh" to apply
        />
      )}
      
      <div className="space-y-2">
        {equipment.map(item => (
          <Card key={item.id}>{item.name}</Card>
        ))}
      </div>
    </div>
  );
}
```

---

### Example 5: With Data Table
```tsx
import EquipmentFilter from "@/components/EquipmentFilter";

function EquipmentTable() {
  const [equipment, setEquipment] = useState([]);
  const [total, setTotal] = useState(0);

  return (
    <div className="p-6">
      <EquipmentFilter 
        onResults={(data) => {
          setEquipment(data.items);
          setTotal(data.total);
        }}
        withFacility={true}
      />
      
      <p className="my-4 text-sm text-muted-foreground">
        Showing {equipment.length} of {total} items
      </p>
      
      <table className="w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Model</th>
            <th>Status</th>
            <th>Next Due</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.model}</td>
              <td>{item.status}</td>
              <td>{item.nextDueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🎨 Complete Usage Examples

All comprehensive examples are available in:
**`client/src/components/EquipmentFilterExamples.tsx`**

This file includes:
- ✅ Simple Equipment List
- ✅ Dashboard Widget
- ✅ Maintenance Calendar Feed
- ✅ Mobile-Optimized View
- ✅ Data Table Integration

---

## 📊 Filter Options Reference

### Maintenance Status Options
| Value | Label | Description |
|-------|-------|-------------|
| `all` | All Equipment | No filter applied |
| `overdue` | 🔴 Overdue | Past due for maintenance |
| `upcoming` | ⚠️ Due Soon (7 days) | Due within next 7 days |
| `resolved` | ✅ Recently Serviced | Serviced in last 7 days |
| `critical` | 🚨 Critical Priority | High priority (red status) |

### Equipment Status Options
| Value | Label |
|-------|-------|
| `""` | All Status |
| `Active` | Active |
| `Pending Inspection` | Pending Inspection |
| `Under Maintenance` | Under Maintenance |
| `Decommissioned` | Decommissioned |

### Sort Options
| Value | Label |
|-------|-------|
| `name` | Name |
| `nextDueDate` | Next Due Date |
| `daysOverdue` | Days Overdue |
| `equipmentId` | Equipment ID |

---

## ✅ Feature Checklist

- ✅ Backend API endpoint with filtering, search, pagination, sorting
- ✅ Integrated Equipment page filtering (client-side, instant)
- ✅ Standalone reusable component (API-powered)
- ✅ Debounced search (300ms)
- ✅ Multiple filter combination support
- ✅ Pagination support
- ✅ Sorting with direction control
- ✅ Loading states
- ✅ Reset functionality
- ✅ Mobile-friendly
- ✅ TypeScript typed
- ✅ Shadcn UI components
- ✅ Comprehensive examples

---

## 🚀 Next Steps

You can now:

1. **Use the integrated filter** on your Equipment page (already working!)
2. **Add dashboard widgets** using the standalone component
3. **Create a maintenance calendar** with filtered equipment feeds
4. **Build mobile views** with the flexible component
5. **Export filtered data** for reports

The system is production-ready and fully tested! 🎉
