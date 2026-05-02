import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location } from '@/types/assets';
import { Shimmer } from '@/components/ui/shimmer';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface LocationTableProps {
  loading: boolean;
  locations: Location[];
  expandedLocations: Set<string>;
  toggleExpanded: (locationId: string) => void;
  openEdit: (location: Location) => void;
  setDeleting: (location: Location | null) => void;
  setIsOpen: (open: boolean) => void;
  setEditing: (location: Location | null) => void;
  setForm: (form: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
  }) => void;
  setInitialForm: (form: {
    name: string;
    floor_unit: string;
    building: string;
    room_areas: { roomID?: string; room_name: string }[];
    department_id: string;
    description: string;
  }) => void;
}

const LocationTable = ({
  loading,
  locations,
  expandedLocations,
  toggleExpanded,
  openEdit,
  setDeleting,
  setIsOpen,
  setEditing,
  setForm,
  setInitialForm,
}: LocationTableProps) => {
  const { hasPermission } = useUserPermissions();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="p-5">
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 border-b flex items-center space-x-4 p-4"
            >
              <Shimmer className="h-6 w-32" />
              <Shimmer className="h-6 w-20" />
              <Shimmer className="h-6 w-48" />
              <Shimmer className="h-6 w-64" />
              <Shimmer className="h-6 w-32" />
              <div className="flex space-x-2 ml-auto">
                <Shimmer className="h-8 w-8 rounded" />
                <Shimmer className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="py-20 text-center">
          <MapPin className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
          <p className="mb-8 text-xl text-muted-foreground">No locations yet</p>
          <Button
            size="lg"
            onClick={() => {
              setEditing(null);
              setForm({
                name: '',
                floor_unit: '',
                building: '',
                room_areas: [],
                department_id: '',
                description: '',
              });
              setInitialForm({
                name: '',
                floor_unit: '',
                building: '',
                room_areas: [],
                department_id: '',
                description: '',
              });
              setIsOpen(true);
            }}
            disabled={!hasPermission('Locations', 'create')}
            className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="mr-3 h-6 w-6" /> Add Your First Location
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop/Tablet Table View */}
          {!isMobile && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/70 transition-colors">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-bold text-foreground">
                    Location Name
                  </TableHead>
                  <TableHead className="font-bold text-foreground">
                    Building
                  </TableHead>
                  <TableHead className="font-bold text-foreground hidden md:table-cell">
                    Floor/Unit
                  </TableHead>
                  <TableHead className="font-bold text-foreground hidden lg:table-cell">
                    Department
                  </TableHead>
                  <TableHead className="font-bold text-foreground hidden lg:table-cell">
                    Room/Area
                  </TableHead>
                  <TableHead className="font-bold text-foreground hidden xl:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location, index) => {
                  const isExpanded = expandedLocations.has(location.locationID);
                  const hasRooms = location.room_areas.length > 0;

                  return (
                    <React.Fragment key={location.locationID}>
                      <TableRow
                        key={location.locationID}
                        className={cn(
                          'h-20 border-b transition-all hover:bg-muted/60 cursor-pointer',
                          index % 2 === 0 && 'bg-muted/20'
                        )}
                        onClick={() =>
                          hasRooms && toggleExpanded(location.locationID)
                        }
                      >
                        <TableCell className="w-10">
                          {hasRooms && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-muted"
                              onClick={e => {
                                e.stopPropagation();
                                toggleExpanded(location.locationID);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground/90 text-base">
                          {location.name}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={location.building}
                          >
                            {location.building}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs hidden md:table-cell">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={location.floor_unit}
                          >
                            {location.floor_unit}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs hidden lg:table-cell">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={location.department?.name}
                          >
                            {location.department?.name || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs hidden lg:table-cell">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={location.room_areas
                              .filter(r => r && r.room_name)
                              .map(r => r.room_name)
                              .join(', ')}
                          >
                            {location.room_areas.length > 0
                              ? location.room_areas
                                  .filter(r => r && r.room_name)
                                  .map(r => r.room_name)
                                  .join(', ')
                              : '—'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs hidden xl:table-cell">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={location.description}
                          >
                            {location.description || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!hasPermission('Locations', 'edit')}
                              onClick={e => {
                                e.stopPropagation();
                                openEdit(location);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!hasPermission('Locations', 'delete')}
                              onClick={e => {
                                e.stopPropagation();
                                setDeleting(location);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded &&
                        hasRooms &&
                        location.room_areas
                          .filter(r => r && r.room_name)
                          .map((room, roomIndex) => (
                            <TableRow
                              key={`expanded-${location.locationID}-room-${room.roomID || roomIndex}`}
                              className="bg-muted/10 border-b"
                            >
                              <TableCell></TableCell>
                              <TableCell colSpan={6} className="pl-12 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  <span className="text-sm font-medium text-foreground">
                                    {room.room_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <div className="space-y-4">
              {locations.map((location, index) => {
                const isExpanded = expandedLocations.has(location.locationID);
                const hasRooms = location.room_areas.length > 0;

                return (
                  <div
                    key={location.locationID}
                    className={cn(
                      'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow',
                      index % 2 === 0 && 'bg-muted/20'
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {hasRooms && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-muted"
                                onClick={() =>
                                  toggleExpanded(location.locationID)
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <h3 className="font-semibold text-foreground/90 text-base">
                              {location.name}
                            </h3>
                          </div>
                          <p className="text-muted-foreground text-sm ml-8">
                            {location.building}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!hasPermission('Locations', 'edit')}
                            onClick={() => openEdit(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!hasPermission('Locations', 'delete')}
                            onClick={() => setDeleting(location)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">
                            Floor/Unit:
                          </span>
                          <div className="mt-1 text-muted-foreground">
                            {location.floor_unit}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">
                            Department:
                          </span>
                          <div className="mt-1 text-muted-foreground">
                            {location.department?.name || '—'}
                          </div>
                        </div>
                      </div>

                      {(location.room_areas.length > 0 ||
                        location.description) && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="space-y-2 text-sm">
                            {location.room_areas.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-500">
                                  Rooms/Areas:
                                </span>
                                <div className="mt-1 text-muted-foreground">
                                  {location.room_areas
                                    .filter(r => r && r.room_name)
                                    .map(r => r.room_name)
                                    .join(', ')}
                                </div>
                              </div>
                            )}
                            {location.description && (
                              <div>
                                <span className="font-medium text-gray-500">
                                  Description:
                                </span>
                                <div className="mt-1 text-muted-foreground">
                                  {location.description}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {isExpanded && hasRooms && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="space-y-2">
                            {location.room_areas
                              .filter(r => r && r.room_name)
                              .map((room, roomIndex) => (
                                <div
                                  key={`mobile-expanded-${location.locationID}-room-${room.roomID || roomIndex}`}
                                  className="flex items-center gap-2 ml-4"
                                >
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  <span className="text-sm font-medium text-foreground">
                                    {room.room_name}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocationTable;
