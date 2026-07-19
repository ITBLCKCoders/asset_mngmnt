// src/data/mockAssets.ts

import { type AccountabilityForm } from '@/pages/assets/accountability/accountabilityForm';

export type AssetStatus = string;
export type AssetCondition =
  | 'Excellent'
  | 'Good'
  | 'Needs Repair'
  | 'Damaged'
  | 'Obsolete';

export interface AssetDocument {
  documentID: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export interface AssetChild {
  assetId: string;
  assetName: string;
  specDescription: string;
}

export interface AssetAssignment {
  assignmentID: string;
  user: {
    id: string;
    name: string;
    email: string;
    employeeNumber?: string | null;
    position?: string | null;
  };
  department: string | null;
  location: string | null;
  assignedDate: string;
  actualReturnDate?: string | null;
  status: string;
  assignedBy?: string | null;
  assignmentNotes?: string | null;
}

export interface AssetCurrentAssignment {
  user: {
    id: string;
    name: string;
    email: string;
    employeeNumber?: string | null;
    position?: string | null;
  };
  department: string;
  location: string;
  assignedDate: string;
  status: string;
}

export interface AssetBuilderHistory {
  itemID: string;
  builderName: string;
  builderID: string;
  addedDate: string;
  addedBy: string;
}

export interface Asset {
  id: string;
  assetID?: string; // Database ID for matching with builders
  name: string;
  company_id?: string;
  company_logo?: string;
  image: string;
  description: string;
  category: string;
  categoryId?: string;
  type: string;
  typeId?: string;
  serialNo: string;
  modelNo: string;
  brand: string;
  status: AssetStatus;
  transferred_out?: boolean;
  transferred_to_company_name?: string | null;
  assignedTo: string;
  department: string;
  location: string;
  purchaseDate: Date | null;
  purchasePrice: number;
  supplier: string;
  warranty: string | null;
  warranty_months: number | null;
  documents: AssetDocument[];
  maintenanceSchedule: string;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  condition: AssetCondition;
  usefulLifeYears: number;
  salvageValue: number;
  depreciationMethod: string;
  annualDepreciation: number;
  depreciationStartDate: Date | null;
  company: string;
  building: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  specifications?: AssetChild[];
  currentAssignment?: AssetAssignment;
  assignmentHistory?: AssetAssignment[];
  builderHistory?: AssetBuilderHistory[];
  accountabilityForm?: AccountabilityForm | null;
  isAssetBuilder?: boolean;
  builderStatus?: string;
  children?: Asset[];
  expanded?: boolean;
  isOldUnit?: boolean;
  is_old_unit?: boolean;
}

export const mockAssets: Asset[] = [
  {
    id: 'AST-001',
    assetID: 'mock-uuid-1',
    name: 'MacBook Pro 16"',
    image: '',
    description: 'Senior dev laptop',
    category: 'Electronics',
    type: 'Laptop',
    serialNo: 'C02Z1234XYZ',
    modelNo: 'A2991',
    brand: 'Apple',
    status: 'Assigned',
    assignedTo: 'John Doe',
    department: 'Engineering',
    location: 'HQ - Floor 3',
    purchaseDate: new Date('2024-01-15') as Date | null,
    purchasePrice: 3499,
    supplier: 'Apple Store',
    warranty: '2026-01-15',
    warranty_months: 24,
    documents: [
      {
        documentID: 'doc-1',
        fileName: 'Invoice.pdf',
        fileUrl: '',
        fileSize: 1024000,
        fileType: 'application/pdf',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        documentID: 'doc-2',
        fileName: 'Warranty.pdf',
        fileUrl: '',
        fileSize: 2048000,
        fileType: 'application/pdf',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ],
    maintenanceSchedule: 'Annual',
    lastMaintenanceDate: new Date('2025-01-10'),
    nextMaintenanceDate: new Date('2026-01-10'),
    condition: 'Good',
    usefulLifeYears: 5,
    salvageValue: 500,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 699,
    depreciationStartDate: new Date('2024-01-15'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2024-01-20T10:30:00'),
    createdBy: 'admin@company.com',
    updatedAt: new Date('2025-04-05T14:22:00'),
    updatedBy: 'john.doe@company.com',
  },
  {
    id: 'AST-002',
    name: 'Standing Desk',
    image: '',
    description: 'Electric height-adjustable desk',
    category: 'Furniture',
    type: 'Desk',
    serialNo: 'DK-2024-789',
    modelNo: 'V2-Commercial',
    brand: 'Uplift',
    status: 'Assigned',
    assignedTo: 'Jane Smith',
    department: 'Design',
    location: 'HQ - Floor 2',
    purchaseDate: new Date('2023-11-20'),
    purchasePrice: 899,
    supplier: 'Uplift Desk',
    warranty: '2030-11-20',
    warranty_months: 84,
    documents: [
      {
        documentID: 'doc-3',
        fileName: 'Assembly.pdf',
        fileUrl: '',
        fileSize: 1536000,
        fileType: 'application/pdf',
        createdAt: '2023-11-20T09:00:00Z',
      },
    ],
    maintenanceSchedule: 'Semi-Annual',
    lastMaintenanceDate: new Date('2025-03-01'),
    nextMaintenanceDate: new Date('2025-09-01'),
    condition: 'Excellent',
    usefulLifeYears: 10,
    salvageValue: 200,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 79,
    depreciationStartDate: new Date('2023-11-20'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2023-11-25T09:15:00'),
    createdBy: 'procurement@company.com',
    updatedAt: new Date('2025-03-10T11:10:00'),
    updatedBy: 'jane.smith@company.com',
  },
  {
    id: 'AST-003',
    name: 'Dell XPS 15',
    image: '',
    description: 'Backup development machine',
    category: 'Electronics',
    type: 'Laptop',
    serialNo: 'DX15-2022-001',
    modelNo: '9520',
    brand: 'Dell',
    status: 'Available',
    assignedTo: '',
    department: '',
    location: 'Storage Room A',
    purchaseDate: new Date('2022-06-10'),
    purchasePrice: 2199,
    supplier: 'Dell',
    warranty: null,
    warranty_months: null,
    documents: [
      {
        documentID: 'doc-4',
        fileName: 'Receipt.pdf',
        fileUrl: '',
        fileSize: 512000,
        fileType: 'application/pdf',
        createdAt: '2022-06-10T14:00:00Z',
      },
    ],
    maintenanceSchedule: 'Annual',
    lastMaintenanceDate: new Date('2024-06-15'),
    nextMaintenanceDate: new Date('2025-06-15'),
    condition: 'Good',
    usefulLifeYears: 6,
    salvageValue: 300,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 383,
    depreciationStartDate: new Date('2022-06-10'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2022-06-15T14:00:00'),
    createdBy: 'it@company.com',
    updatedAt: new Date('2024-12-01T09:30:00'),
    updatedBy: 'it@company.com',
  },
  {
    id: 'AST-004',
    name: 'Conference Projector',
    image: '',
    description: 'Main meeting room projector',
    category: 'Electronics',
    type: 'Projector',
    serialNo: 'PJ-2020-112',
    modelNo: 'EB-X41',
    brand: 'Epson',
    status: 'In Maintenance',
    assignedTo: 'Meeting Room A',
    department: 'Facilities',
    location: 'HQ - Room A',
    purchaseDate: new Date('2020-03-12'),
    purchasePrice: 649,
    supplier: 'Epson',
    warranty: null,
    warranty_months: null,
    documents: [
      {
        documentID: 'doc-5',
        fileName: 'Repair_Form.pdf',
        fileUrl: '',
        fileSize: 768000,
        fileType: 'application/pdf',
        createdAt: '2025-03-20T16:00:00Z',
      },
      {
        documentID: 'doc-6',
        fileName: 'Lamp_Log.xlsx',
        fileUrl: '',
        fileSize: 2048000,
        fileType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        createdAt: '2025-03-20T16:00:00Z',
      },
    ],
    maintenanceSchedule: 'Quarterly',
    lastMaintenanceDate: new Date('2025-03-20'),
    nextMaintenanceDate: new Date('2025-06-20'),
    condition: 'Needs Repair',
    usefulLifeYears: 7,
    salvageValue: 100,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 78,
    depreciationStartDate: new Date('2020-03-12'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2020-03-15T11:20:00'),
    createdBy: 'facilities@company.com',
    updatedAt: new Date('2025-04-01T16:45:00'),
    updatedBy: 'tech.support@company.com',
  },
  {
    id: 'AST-005',
    name: 'Herman Miller Aeron Chair',
    image: '',
    description: 'Premium ergonomic chair',
    category: 'Furniture',
    type: 'Chair',
    serialNo: 'CHR-2023-045',
    modelNo: 'Aeron',
    brand: 'Herman Miller',
    status: 'Assigned',
    assignedTo: 'Sarah Chen',
    department: 'Product',
    location: 'HQ - Floor 4',
    purchaseDate: new Date('2023-08-10'),
    purchasePrice: 1499,
    supplier: 'Herman Miller',
    warranty: '2035-08-10',
    warranty_months: 144,
    documents: [
      {
        documentID: 'doc-7',
        fileName: '12Year_Warranty.pdf',
        fileUrl: '',
        fileSize: 1024000,
        fileType: 'application/pdf',
        createdAt: '2023-08-10T13:00:00Z',
      },
    ],
    maintenanceSchedule: 'Annual',
    lastMaintenanceDate: new Date('2024-08-10'),
    nextMaintenanceDate: new Date('2025-08-10'),
    condition: 'Excellent',
    usefulLifeYears: 12,
    salvageValue: 300,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 125,
    depreciationStartDate: new Date('2023-08-10'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2023-08-12T13:10:00'),
    createdBy: 'hr@company.com',
    updatedAt: new Date('2023-08-12T13:10:00'),
    updatedBy: 'hr@company.com',
  },
  {
    id: 'AST-006',
    name: 'iPad Pro 12.9"',
    image: '',
    description: 'Design & presentation tablet',
    category: 'Electronics',
    type: 'Tablet',
    serialNo: 'IPD-2024-003',
    modelNo: 'A2377',
    brand: 'Apple',
    status: 'Assigned',
    assignedTo: 'Mike Wu',
    department: 'Design',
    location: 'HQ - Floor 2',
    purchaseDate: new Date('2024-05-20'),
    purchasePrice: 1299,
    supplier: 'Apple',
    warranty: '2026-05-20',
    warranty_months: 24,
    documents: [
      {
        documentID: 'doc-8',
        fileName: 'AppleCare.pdf',
        fileUrl: '',
        fileSize: 512000,
        fileType: 'application/pdf',
        createdAt: '2024-05-20T10:00:00Z',
      },
    ],
    maintenanceSchedule: 'Semi-Annual',
    lastMaintenanceDate: new Date('2024-11-20'),
    nextMaintenanceDate: new Date('2025-05-20'),
    condition: 'Excellent',
    usefulLifeYears: 4,
    salvageValue: 200,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 450,
    depreciationStartDate: new Date('2024-05-20'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2024-05-22T10:00:00'),
    createdBy: 'design@company.com',
    updatedAt: new Date('2025-02-15T15:30:00'),
    updatedBy: 'mike.wu@company.com',
  },
  {
    id: 'AST-007',
    name: 'Legacy Windows XP PC',
    image: '',
    description: 'For legacy software only',
    category: 'Electronics',
    type: 'Desktop',
    serialNo: 'WINXP-2010-001',
    modelNo: 'N/A',
    brand: 'Custom',
    status: 'Available',
    assignedTo: '',
    department: '',
    location: 'Basement Storage',
    purchaseDate: new Date('2010-04-01'),
    purchasePrice: 1200,
    supplier: 'Custom Built',
    warranty: null,
    warranty_months: null,
    documents: [
      {
        documentID: 'doc-9',
        fileName: 'Decommission.pdf',
        fileUrl: '',
        fileSize: 256000,
        fileType: 'application/pdf',
        createdAt: '2024-01-10T11:00:00Z',
      },
    ],
    maintenanceSchedule: 'None',
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
    condition: 'Obsolete',
    usefulLifeYears: 5,
    salvageValue: 200,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 240,
    depreciationStartDate: new Date('2010-04-01'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2010-04-05T09:00:00'),
    createdBy: 'legacy@company.com',
    updatedAt: new Date('2024-01-10T11:11:00'),
    updatedBy: 'it@company.com',
  },
  {
    id: 'AST-008',
    name: 'Samsung 27" Monitor',
    image: '',
    description: 'Cracked screen - disposal pending',
    category: 'Electronics',
    type: 'Monitor',
    serialNo: 'MON-2019-334',
    modelNo: 'S27R502',
    brand: 'Samsung',
    status: 'Available',
    assignedTo: '',
    department: '',
    location: 'Disposal Area',
    purchaseDate: new Date('2019-07-18'),
    purchasePrice: 299,
    supplier: 'Samsung',
    warranty: null,
    warranty_months: null,
    documents: [
      {
        documentID: 'doc-10',
        fileName: 'Damage_Report.pdf',
        fileUrl: '',
        fileSize: 384000,
        fileType: 'application/pdf',
        createdAt: '2025-01-05T10:00:00Z',
      },
    ],
    maintenanceSchedule: 'None',
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
    condition: 'Damaged',
    usefulLifeYears: 6,
    salvageValue: 50,
    depreciationMethod: 'Straight Line',
    annualDepreciation: 41,
    depreciationStartDate: new Date('2019-07-18'),
    company: 'TechCorp',
    building: 'HQ Building',
    createdAt: new Date('2019-07-20T14:30:00'),
    createdBy: 'it@company.com',
    updatedAt: new Date('2025-01-05T10:20:00'),
    updatedBy: 'facilities@company.com',
  },
];
