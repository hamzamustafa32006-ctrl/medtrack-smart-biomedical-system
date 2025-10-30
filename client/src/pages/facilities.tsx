import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Building2, MapPin, ChevronRight, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Facility, Location } from "@shared/schema";
import { insertFacilitySchema, insertLocationSchema, type InsertFacility, type InsertLocation } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function FacilitiesPage() {
  const { toast } = useToast();
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [expandedFacilities, setExpandedFacilities] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const { data: facilities, isLoading } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const facilityForm = useForm<z.infer<typeof insertFacilitySchema>>({
    resolver: zodResolver(insertFacilitySchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      contactPerson: "",
      phone: "",
    },
  });

  const locationForm = useForm<z.infer<typeof insertLocationSchema>>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      facilityId: "",
      name: "",
      floor: "",
      room: "",
      notes: "",
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: async (data: InsertFacility) => {
      return await apiRequest("POST", "/api/facilities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setFacilityDialogOpen(false);
      facilityForm.reset();
      toast({
        title: "Success",
        description: "Facility added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add facility",
        variant: "destructive",
      });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      return await apiRequest("POST", `/api/facilities/${data.facilityId}/locations`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", variables.facilityId, "locations"] });
      setLocationDialogOpen(false);
      locationForm.reset();
      toast({
        title: "Success",
        description: "Location added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive",
      });
    },
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/facilities/${id}`);
    },
    onSuccess: (_data, facilityId) => {
      // Invalidate all facility-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      // Also invalidate this specific facility's locations cache
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "locations"] });
      setDeleteConfirmOpen(false);
      setDeletingFacility(null);
      toast({
        title: "Success",
        description: "Facility deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete facility",
        variant: "destructive",
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: () => {
      // Invalidate all location queries to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setDeleteConfirmOpen(false);
      setDeletingLocation(null);
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  const openLocationDialog = (facility: Facility) => {
    setSelectedFacility(facility);
    locationForm.setValue("facilityId", facility.id);
    setLocationDialogOpen(true);
  };

  const toggleFacilityExpansion = (facilityId: string) => {
    setExpandedFacilities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(facilityId)) {
        newSet.delete(facilityId);
      } else {
        newSet.add(facilityId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Facilities</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Facilities</h2>
          <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-facility">
                <Plus className="w-4 h-4 mr-2" />
                Add Facility
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Facility</DialogTitle>
                <DialogDescription>
                  Add a new facility to organize your equipment
                </DialogDescription>
              </DialogHeader>
              <Form {...facilityForm}>
                <form onSubmit={facilityForm.handleSubmit((data) => createFacilityMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={facilityForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Hospital" {...field} data-testid="input-facility-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={facilityForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Code (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., MH-01" {...field} value={field.value || ""} data-testid="input-facility-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={facilityForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 123 Main St" {...field} value={field.value || ""} data-testid="input-facility-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={facilityForm.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe" {...field} value={field.value || ""} data-testid="input-facility-contact" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={facilityForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., +965-12345678" {...field} value={field.value || ""} data-testid="input-facility-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createFacilityMutation.isPending} data-testid="button-submit-facility">
                    {createFacilityMutation.isPending ? "Adding..." : "Add Facility"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !facilities || facilities.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No facilities yet</CardTitle>
              <CardDescription>Add your first facility to get started</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                isExpanded={expandedFacilities.has(facility.id)}
                onToggle={() => toggleFacilityExpansion(facility.id)}
                onAddLocation={() => openLocationDialog(facility)}
                onDelete={() => {
                  setDeletingFacility(facility);
                  setDeletingLocation(null);
                  setDeleteConfirmOpen(true);
                }}
                onDeleteLocation={(location) => {
                  setDeletingLocation(location);
                  setDeletingFacility(null);
                  setDeleteConfirmOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Add a location within {selectedFacility?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit((data) => createLocationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={locationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Radiology Department" {...field} data-testid="input-location-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={locationForm.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2" {...field} value={field.value || ""} data-testid="input-location-floor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={locationForm.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., B-12" {...field} value={field.value || ""} data-testid="input-location-room" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={locationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details" {...field} value={field.value || ""} data-testid="input-location-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createLocationMutation.isPending} data-testid="button-submit-location">
                {createLocationMutation.isPending ? "Adding..." : "Add Location"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingFacility ? (
                <>
                  This will permanently delete the facility "{deletingFacility.name}" and all its locations. 
                  This action cannot be undone.
                </>
              ) : deletingLocation ? (
                <>
                  This will permanently delete the location "{deletingLocation.name}". 
                  This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingFacility) {
                  deleteFacilityMutation.mutate(deletingFacility.id);
                } else if (deletingLocation) {
                  deleteLocationMutation.mutate(deletingLocation.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteFacilityMutation.isPending || deleteLocationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FacilityCard({
  facility,
  isExpanded,
  onToggle,
  onAddLocation,
  onDelete,
  onDeleteLocation,
}: {
  facility: Facility;
  isExpanded: boolean;
  onToggle: () => void;
  onAddLocation: () => void;
  onDelete: () => void;
  onDeleteLocation: (location: Location) => void;
}) {
  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/facilities", facility.id, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/facilities/${facility.id}/locations`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
    enabled: isExpanded,
  });

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg" data-testid={`text-facility-name-${facility.id}`}>{facility.name}</CardTitle>
                {facility.code && (
                  <Badge variant="outline" className="mt-1">
                    {facility.code}
                  </Badge>
                )}
                {facility.address && (
                  <CardDescription className="mt-2">{facility.address}</CardDescription>
                )}
                {(facility.contactPerson || facility.phone) && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {facility.contactPerson && <div>{facility.contactPerson}</div>}
                    {facility.phone && <div>{facility.phone}</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                data-testid={`button-delete-facility-${facility.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`button-toggle-facility-${facility.id}`}>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Locations</h3>
                <Button size="sm" variant="outline" onClick={onAddLocation} data-testid={`button-add-location-${facility.id}`}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Location
                </Button>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : !locations || locations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No locations yet
                </div>
              ) : (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                      data-testid={`location-${location.id}`}
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{location.name}</div>
                        {(location.floor || location.room) && (
                          <div className="text-sm text-muted-foreground">
                            {location.floor && `Floor ${location.floor}`}
                            {location.floor && location.room && " • "}
                            {location.room && `Room ${location.room}`}
                          </div>
                        )}
                        {location.notes && (
                          <div className="text-sm text-muted-foreground mt-1">{location.notes}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLocation(location);
                        }}
                        data-testid={`button-delete-location-${location.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
