import { v4 as uuidv4 } from 'uuid';
import * as intangibleAssetsRepository from '../repositories/intangibleAssets.repository.js';

/**
 * Intangible assets service — orchestration layer between controllers and the repository layer
 */

export async function getAllIntangibleAssets(companyId: string) {
  return intangibleAssetsRepository.getAllIntangibleAssets(companyId);
}

export async function getIntangibleAssetById(id: string, companyId: string) {
  return intangibleAssetsRepository.getIntangibleAssetById(id, companyId);
}

export async function getActiveAssignmentsByUser(userId: string, companyId: string) {
  return intangibleAssetsRepository.getActiveAssignmentsByUser(userId, companyId);
}

export async function createIntangibleAsset(data: {
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  riskLevelId?: string | null;
  status: string;
  companyId: string;
  createdBy: string;
}) {
  const id = uuidv4();
  await intangibleAssetsRepository.createIntangibleAsset({
    name: data.name,
    description: data.description,
    remarks: data.remarks,
    type: data.type,
    riskLevelId: data.riskLevelId ?? null,
    status: data.status,
    companyId: data.companyId,
    createdBy: data.createdBy,
  });
  return id;
}

export async function createIntangibleAssetsBulk(
  assets: Array<{
    name: string;
    description: string | null;
    remarks: string | null;
    type: string;
    riskLevelId?: string | null;
    status: string;
  }>,
  companyId: string,
  createdBy: string
) {
  return intangibleAssetsRepository.createIntangibleAssetsBulk(
    assets,
    companyId,
    createdBy
  );
}

export async function updateIntangibleAsset(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    remarks?: string | null;
    type?: string;
    riskLevelId?: string | null;
    status?: string;
    companyId: string;
    updatedBy: string;
    assignedTo?: string | null;
    assignedDate?: string | null;
    assignmentId?: string | null;
  }
) {
  return intangibleAssetsRepository.updateIntangibleAsset(id, data);
}

export async function assignIntangibleAsset(data: {
  id: string;
  assignedTo: string;
  assignmentId: string;
  companyId: string;
  assignedBy?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  locationRoomId?: string | null;
}) {
  return intangibleAssetsRepository.assignIntangibleAsset(data);
}

export async function hasActiveAssignment(intangibleAssetId: string, userId: string) {
  return intangibleAssetsRepository.hasActiveAssignment(intangibleAssetId, userId);
}

export async function unassignIntangibleAsset(
  id: string,
  userId: string,
  companyId: string
) {
  return intangibleAssetsRepository.unassignIntangibleAsset(id, userId, companyId);
}
