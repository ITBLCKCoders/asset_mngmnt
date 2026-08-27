'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  User,
  Users,
  Warehouse,
  UserCheck,
  CheckCircle2,
  Building2,
  MapPin,
  Building,
} from 'lucide-react';

interface Department {
  departmentID: string;
  name: string;
  code: string;
}

interface Location {
  locationID: string;
  name: string;
  floor_unit: string;
  building: string;
  department_id?: string;
}

interface User {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  company: any;
}

interface AssignmentDetailsPanelProps {
  departments: Department[];
  locations: Location[];
  buildings: string[];
  users: User[];
  selectedBuilding: string;
  selectedDepartment: string;
  selectedLocation: string;
  selectedRoom: string;
  selectedUser: string;
  filteredLocations: Location[];
  availableRooms: string[];
  filteredUsers: User[];
  hasPermission: (module: string, action: string) => boolean;
  onBuildingChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onAssign: () => void;
  assigning: boolean;
  selectedAssets: string[];
  departmentSearchTerm?: string;
  onDepartmentSearchChange?: (value: string) => void;
  userSearchTerm?: string;
  onUserSearchChange?: (value: string) => void;
}

export function AssignmentDetailsPanel({
  departments,
  locations,
  buildings,
  users,
  selectedBuilding,
  selectedDepartment,
  selectedLocation,
  selectedRoom,
  selectedUser,
  filteredLocations,
  availableRooms,
  filteredUsers,
  hasPermission,
  onBuildingChange,
  onDepartmentChange,
  onLocationChange,
  onRoomChange,
  onUserChange,
  onAssign,
  assigning,
  selectedAssets,
  departmentSearchTerm = '',
  onDepartmentSearchChange,
  userSearchTerm = '',
  onUserSearchChange,
}: AssignmentDetailsPanelProps) {
  const searchFilteredUsers = (filteredUsers || []).filter(
    user =>
      !userSearchTerm ||
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <Card className="min-h-[500px] border-0 bg-white/80 shadow-xl backdrop-blur-sm xl:sticky xl:top-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-green-100 rounded-lg">
            <UserCheck className="h-5 w-5 text-green-600" />
          </div>
          Assignment Details
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Building Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            Building
          </Label>
          <Select
            value={selectedBuilding}
            onValueChange={onBuildingChange}
            disabled={
              !hasPermission('Asset Assignment', 'create') ||
              !hasPermission('Asset Assignment', 'edit')
            }
          >
            <SelectTrigger className="h-10 w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <SelectValue placeholder="Choose building">
                {selectedBuilding}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
              {buildings.length > 0 ? (
                buildings.map(building => (
                  <SelectItem
                    key={building}
                    value={building}
                    className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                  >
                    {building}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  No buildings available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Department Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Department
          </Label>
          <Select
            value={selectedDepartment}
            onValueChange={onDepartmentChange}
            disabled={
              !hasPermission('Asset Assignment', 'create') ||
              !hasPermission('Asset Assignment', 'edit')
            }
          >
            <SelectTrigger className="h-10 w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <SelectValue placeholder="Choose department">
                {selectedDepartment
                  ? departments?.find(
                      d => d.departmentID === selectedDepartment
                    )?.name
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
              {/* Search input */}
              <div className="px-2 py-2 border-b border-gray-200">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={departmentSearchTerm}
                    onKeyDown={e => e.stopPropagation()}
                    onChange={e => onDepartmentSearchChange?.(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Department list */}
              <div className="max-h-48 overflow-y-auto">
                {(departments || [])
                  .filter(
                    dept =>
                      dept.name
                        .toLowerCase()
                        .includes(departmentSearchTerm.toLowerCase()) ||
                      dept.code
                        .toLowerCase()
                        .includes(departmentSearchTerm.toLowerCase())
                  )
                  .map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{dept.name}</span>
                        <span className="text-sm text-gray-500">
                          ({dept.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                {(departments || []).filter(
                  dept =>
                    dept.name
                      .toLowerCase()
                      .includes(departmentSearchTerm.toLowerCase()) ||
                    dept.code
                      .toLowerCase()
                      .includes(departmentSearchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-6 text-sm text-gray-500 text-center">
                    No departments found
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-purple-500" />
            Location
          </Label>
          <Select
            value={selectedLocation}
            onValueChange={onLocationChange}
            disabled={
              !selectedBuilding ||
              !hasPermission('Asset Assignment', 'create') ||
              !hasPermission('Asset Assignment', 'edit')
            }
          >
            <SelectTrigger className="h-10 w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <SelectValue
                placeholder={
                  selectedBuilding
                    ? 'Choose location'
                    : 'Select a building first'
                }
              >
                {selectedLocation
                  ? locations?.find(l => l.locationID === selectedLocation)
                      ?.name
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
              {filteredLocations.length > 0 ? (
                filteredLocations.map(loc => (
                  <SelectItem
                    key={loc.locationID}
                    value={loc.locationID}
                    className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                  >
                    {loc.name} - {loc.floor_unit}, {loc.building}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  No locations available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Room/Area Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            Room / Area
          </Label>
          <Select
            value={selectedRoom}
            onValueChange={onRoomChange}
            disabled={
              !selectedLocation ||
              !hasPermission('Asset Assignment', 'create') ||
              !hasPermission('Asset Assignment', 'edit')
            }
          >
            <SelectTrigger className="h-10 w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <SelectValue
                placeholder={
                  selectedLocation
                    ? 'Choose room / area'
                    : 'Select a location first'
                }
              >
                {selectedRoom}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
              {availableRooms.length > 0 ? (
                availableRooms.map(room => (
                  <SelectItem
                    key={room}
                    value={room}
                    className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                  >
                    {room}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  No rooms available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* User Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="h-4 w-4 text-orange-500" />
            Assigned User
          </Label>
          <Select
            value={selectedUser}
            onValueChange={onUserChange}
            disabled={
              !selectedDepartment ||
              !hasPermission('Asset Assignment', 'create') ||
              !hasPermission('Asset Assignment', 'edit')
            }
          >
            <SelectTrigger className="h-10 w-full bg-white hover:bg-gray-200 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <SelectValue
                placeholder={
                  selectedDepartment
                    ? 'Choose user'
                    : 'Select a department first'
                }
              >
                {selectedUser
                  ? `${users?.find(u => u.userID === selectedUser)?.first_name} ${users?.find(u => u.userID === selectedUser)?.last_name}`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-white border border-gray-200 rounded-md shadow-md">
              <div className="px-2 py-2 border-b border-gray-200">
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onKeyDown={e => e.stopPropagation()}
                    onChange={e => onUserSearchChange?.(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {searchFilteredUsers.length > 0 ? (
                  searchFilteredUsers.map(user => (
                    <SelectItem
                      key={user.userID}
                      value={user.userID}
                      className="py-2 hover:bg-gray-200 focus:bg-gray-200"
                    >
                      {user.first_name} {user.last_name} - {user.email}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-6 text-sm text-gray-500 text-center">
                    No users found
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Assign Button */}
        <Button
          onClick={onAssign}
          disabled={
            assigning ||
            selectedAssets.length === 0 ||
            !selectedBuilding ||
            !selectedDepartment ||
            !selectedLocation ||
            !selectedRoom ||
            !selectedUser ||
            !hasPermission('Asset Assignment', 'create') ||
            !hasPermission('Asset Assignment', 'edit')
          }
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {assigning ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Assigning Assets...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Assign {selectedAssets.length} Asset
              {selectedAssets.length !== 1 ? 's' : ''}
            </div>
          )}
        </Button>

        {selectedAssets.length === 0 && (
          <p className="text-sm text-gray-500 text-center">
            Select assets above to enable assignment
          </p>
        )}
      </CardContent>
    </Card>
  );
}
