// Import shared types instead of defining local ones
export * from '../../../shared/types';

// Re-export specific types for convenience
export type {
  AssetResponseDto,
  AssetChildDto,
  AssetListResponseDto,
  AssetDocumentDto,
  AssetAssignmentDto,
  AccountabilityFormDto,
  CreateAssetDto,
  UpdateAssetDto,
  ApiResponse,
  ValidationError,
  ActiveCompany,
} from '../../../shared/types';
