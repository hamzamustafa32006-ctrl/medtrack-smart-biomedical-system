import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

type EquipmentFilterProps = {
  onResults: (data: { total: number; items: any[] }) => void;
  initialStatus?: string;
  withFacility?: boolean;
  autoFetch?: boolean;
};

const MAINTENANCE_STATUSES = [
  { label: "All Equipment", value: "all" },
  { label: "🔴 Overdue", value: "overdue" },
  { label: "⚠️ Due Soon (7 days)", value: "upcoming" },
  { label: "✅ Recently Serviced", value: "resolved" },
  { label: "🚨 Critical Priority", value: "critical" },
];

const EQUIPMENT_STATUSES = [
  { label: "All Status", value: "" },
  { label: "Active", value: "Active" },
  { label: "Pending Inspection", value: "Pending Inspection" },
  { label: "Under Maintenance", value: "Under Maintenance" },
  { label: "Decommissioned", value: "Decommissioned" },
];

const SORT_OPTIONS = [
  { label: "Name", value: "name" },
  { label: "Next Due Date", value: "nextDueDate" },
  { label: "Days Overdue", value: "daysOverdue" },
  { label: "Equipment ID", value: "equipmentId" },
];

export default function EquipmentFilter({
  onResults,
  initialStatus = "all",
  withFacility = false,
  autoFetch = true,
}: EquipmentFilterProps) {
  const [maintenanceStatus, setMaintenanceStatus] = useState(initialStatus);
  const [equipmentStatus, setEquipmentStatus] = useState("");
  const [search, setSearch] = useState("");
  const [facility, setFacility] = useState<string>("");
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState("nextDueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Debounce search input (300ms)
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string, callback: () => void) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, 300);
    };
  }, []);

  // Fetch facilities if needed
  useEffect(() => {
    if (!withFacility) return;
    
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((data) => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => setFacilities([]));
  }, [withFacility]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Use the /api/equipment/status endpoint for maintenance filtering
      if (maintenanceStatus !== "all") {
        params.append("status", maintenanceStatus);
      }
      
      if (search.trim()) {
        params.append("q", search.trim());
      }
      
      if (equipmentStatus) {
        params.append("equipmentStatus", equipmentStatus);
      }
      
      if (withFacility && facility) {
        params.append("facility", facility);
      }
      
      params.append("limit", String(limit));
      params.append("offset", String(offset));
      params.append("sort", sort);
      params.append("dir", sortDir);

      const endpoint = maintenanceStatus !== "all" || search.trim()
        ? `/api/equipment/status?${params.toString()}`
        : `/api/equipment?${params.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      
      // Handle both formats (array or {total, items})
      if (Array.isArray(data)) {
        onResults({ total: data.length, items: data });
      } else {
        onResults(data);
      }
    } catch (e) {
      console.error("Failed to fetch equipment:", e);
      onResults({ total: 0, items: [] });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on filter changes (except search which is debounced)
  useEffect(() => {
    if (!autoFetch) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenanceStatus, equipmentStatus, facility, limit, offset, sort, sortDir]);

  // Debounced search
  useEffect(() => {
    if (!autoFetch) return;
    debouncedSearch(search, fetchData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleReset = () => {
    setMaintenanceStatus("all");
    setEquipmentStatus("");
    setSearch("");
    setFacility("");
    setOffset(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Maintenance Status Filter */}
        <Select value={maintenanceStatus} onValueChange={(value) => {
          setOffset(0);
          setMaintenanceStatus(value);
        }}>
          <SelectTrigger className="w-[200px]" data-testid="select-maintenance-status">
            <SelectValue placeholder="Maintenance Status" />
          </SelectTrigger>
          <SelectContent>
            {MAINTENANCE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Equipment Status Filter */}
        <Select value={equipmentStatus} onValueChange={(value) => {
          setOffset(0);
          setEquipmentStatus(value);
        }}>
          <SelectTrigger className="w-[180px]" data-testid="select-equipment-status">
            <SelectValue placeholder="Equipment Status" />
          </SelectTrigger>
          <SelectContent>
            {EQUIPMENT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Facility Filter (optional) */}
        {withFacility && (
          <Select value={facility} onValueChange={(value) => {
            setOffset(0);
            setFacility(value);
          }}>
            <SelectTrigger className="w-[180px]" data-testid="select-facility">
              <SelectValue placeholder="All Facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Facilities</SelectItem>
              {facilities.map((fac) => (
                <SelectItem key={fac.id} value={fac.id}>
                  {fac.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search name, ID, serial, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Sort Options */}
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Direction */}
        <Select value={sortDir} onValueChange={(value: "asc" | "desc") => setSortDir(value)}>
          <SelectTrigger className="w-[120px]" data-testid="select-sort-dir">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="default"
          data-testid="button-refresh"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Refresh"
          )}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          data-testid="button-reset"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
