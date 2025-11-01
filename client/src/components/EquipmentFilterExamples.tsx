/**
 * Usage Examples for EquipmentFilter Component
 * 
 * This file demonstrates how to use the standalone EquipmentFilter component
 * in different parts of your application.
 */

import { useState } from "react";
import EquipmentFilter from "./EquipmentFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================
// Example 1: Simple Equipment List Page
// ============================================
export function SimpleEquipmentListExample() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipment Management</h1>
      
      <EquipmentFilter 
        onResults={(data) => {
          setEquipment(data.items);
          setTotal(data.total);
        }}
      />
      
      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-4">
          Showing {equipment.length} of {total} items
        </p>
        
        <div className="space-y-2">
          {equipment.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Model: {item.model}</div>
                  <div>Serial: {item.serial}</div>
                  <div>Status: {item.status}</div>
                  <div>Next Due: {item.nextDueDate || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Example 2: Dashboard Widget
// ============================================
export function DashboardWidgetExample() {
  const [overdueEquipment, setOverdueEquipment] = useState<any[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue Maintenance</CardTitle>
      </CardHeader>
      <CardContent>
        <EquipmentFilter 
          initialStatus="overdue"
          onResults={(data) => setOverdueEquipment(data.items)}
          autoFetch={true}
        />
        
        <div className="mt-4">
          <p className="text-2xl font-bold text-red-600">
            {overdueEquipment.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Equipment past due
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Example 3: Maintenance Calendar Feed
// ============================================
export function MaintenanceCalendarExample() {
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);

  // Transform equipment data into calendar events
  const calendarEvents = upcomingMaintenance.map((item) => ({
    id: item.id,
    title: `${item.name} - Maintenance Due`,
    date: item.nextDueDate,
    type: item.isOverdue ? 'overdue' : 'upcoming',
    equipment: item,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Maintenance Calendar</h1>
      
      <EquipmentFilter 
        initialStatus="upcoming"
        onResults={(data) => setUpcomingMaintenance(data.items)}
        withFacility={true}
      />
      
      <div className="mt-6">
        <div className="grid gap-4">
          {calendarEvents.map((event) => (
            <Card key={event.id} className={event.type === 'overdue' ? 'border-red-500' : ''}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(event.date).toLocaleDateString()}
                    </p>
                  </div>
                  {event.type === 'overdue' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      OVERDUE
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Example 4: Mobile-Optimized View
// ============================================
export function MobileEquipmentViewExample() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Equipment</h1>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
        >
          Filter
        </button>
      </div>
      
      {isFilterOpen && (
        <div className="mb-4">
          <EquipmentFilter 
            onResults={(data) => {
              setEquipment(data.items);
              setIsFilterOpen(false);
            }}
            autoFetch={false}
          />
        </div>
      )}
      
      <div className="space-y-3">
        {equipment.map((item) => (
          <Card key={item.id}>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2">{item.name}</h3>
              <div className="text-sm space-y-1">
                <p>ID: {item.equipmentId}</p>
                <p>Status: {item.status}</p>
                {item.isOverdue && (
                  <p className="text-red-600 font-semibold">⚠️ Overdue</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Example 5: Combined with Data Table
// ============================================
export function EquipmentTableExample() {
  const [equipment, setEquipment] = useState<any[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipment Table</h1>
      
      <EquipmentFilter 
        onResults={(data) => setEquipment(data.items)}
        withFacility={true}
      />
      
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium">Model</th>
              <th className="p-3 text-left font-medium">Serial</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Next Due</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/50">
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.model || 'N/A'}</td>
                <td className="p-3">{item.serial || 'N/A'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.status === 'Active' 
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'Under Maintenance'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3">
                  {item.nextDueDate 
                    ? new Date(item.nextDueDate).toLocaleDateString()
                    : 'N/A'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
