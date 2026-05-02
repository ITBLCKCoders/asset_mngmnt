import { z } from 'zod';

/** Body may be empty; legacy clients may still send digitalSignature — ignored server-side. */
export const DeptHeadApproveBorrowRequestDtoSchema = z
  .object({
    digitalSignature: z.string().optional(),
  })
  .passthrough();

export type DeptHeadApproveBorrowRequestDto = z.infer<
  typeof DeptHeadApproveBorrowRequestDtoSchema
>;
