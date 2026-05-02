import { z } from 'zod';

export const CreateLocationDtoSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(255),
  floorUnit: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export type CreateLocationDto = z.infer<typeof CreateLocationDtoSchema>;

export const UpdateLocationDtoSchema = CreateLocationDtoSchema.partial().extend(
  {
    locationId: z.string().min(1, 'Location ID is required'),
  }
);

export type UpdateLocationDto = z.infer<typeof UpdateLocationDtoSchema>;

export const CreateLocationRoomDtoSchema = z.object({
  roomName: z.string().min(1, 'Room name is required').max(255),
  locationId: z.string().min(1, 'Location ID is required'),
});

export type CreateLocationRoomDto = z.infer<typeof CreateLocationRoomDtoSchema>;

export const UpdateLocationRoomDtoSchema =
  CreateLocationRoomDtoSchema.partial().extend({
    roomId: z.string().min(1, 'Room ID is required'),
  });

export type UpdateLocationRoomDto = z.infer<typeof UpdateLocationRoomDtoSchema>;
