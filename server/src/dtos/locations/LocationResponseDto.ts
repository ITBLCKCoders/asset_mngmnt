export interface LocationResponseDto {
  locationID: string;
  name: string;
  floor_unit: string | null;
  building: string | null;
  description: string | null;
  department_id: string | null;
  department_name: string | null;
  room_areas: LocationRoomResponseDto[];
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface LocationRoomResponseDto {
  roomID: string;
  room_name: string;
  location_id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface LocationListResponseDto {
  locations: LocationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
