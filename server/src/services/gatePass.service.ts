import { v4 as uuidv4 } from 'uuid';
import * as gatePassRepository from '../repositories/gatePass.repository.js';

/**
 * Gate pass service — orchestration layer between controllers and the repository layer
 */

export async function createGatePass(data: {
  assignmentId: string;
  assetId: string;
  userId: string;
  purpose: string;
  expectedReturnDate: string | null;
  destinationLocationId: string | null;
  destinationDepartmentId: string | null;
  condition: string;
  notes: string | null;
  createdBy: string;
}) {
  const gatePassId = uuidv4();
  await gatePassRepository.createGatePass({
    gatePassId,
    ...data,
  });
  return gatePassId;
}

export async function getGatePassById(gatePassId: string) {
  return gatePassRepository.getGatePassById(gatePassId);
}

export async function getAllGatePasses(filters?: {
  userId?: string;
  assetId?: string;
  status?: string;
  destinationDepartmentId?: string;
  destinationLocationId?: string;
}) {
  return gatePassRepository.getAllGatePasses(filters);
}

export async function updateGatePass(
  gatePassId: string,
  data: {
    purpose?: string;
    expectedReturnDate?: string | null;
    destinationLocationId?: string | null;
    destinationDepartmentId?: string | null;
    condition?: string;
    notes?: string | null;
    status?: string;
    processedBy?: string;
    actualReturnDate?: string | null;
  }
) {
  return gatePassRepository.updateGatePass(gatePassId, data);
}

export async function deleteGatePass(gatePassId: string) {
  return gatePassRepository.deleteGatePass(gatePassId);
}
