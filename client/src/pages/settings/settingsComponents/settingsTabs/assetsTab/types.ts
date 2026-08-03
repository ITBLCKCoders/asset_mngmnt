export interface Category {
  id: number;
  name: string;
  prefix: string;
  gl_code: string;
  department_id?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface Supplier {
  id: number;
  name: string;
  categoryId?: number;
  category_id?: number;
  contact?: string;
  email?: string;
}

export interface AssetType {
  id: number;
  name: string;
  categoryId?: number;
  category_id?: number;
  prefix: string;
}

export interface AssetBrand {
  id: number;
  name: string;
  typeId?: number;
  type_id?: number;
  prefix: string;
}

export interface IntangibleAssetType {
  id: number;
  name: string;
  prefix?: string;
  department_id?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface RiskLevel {
  id: number;
  name: string;
  color?: string;
}

export interface SmartIdFormat {
  company: 'code' | 'prefix' | 'none';
  category: 'prefix' | 'code' | 'none';
  type: 'prefix' | 'none';
  department: 'code' | 'prefix' | 'none';
  includeDate: boolean;
}

export interface ActiveCompany {
  id: number;
  code?: string;
  prefix?: string;
  is_main?: boolean;
}

export interface FormData {
  name: string;
  prefix?: string;
  gl_code?: string;
  categoryId?: string;
  typeId?: string;
  contact?: string;
  email?: string;
  departmentId?: string;
  color?: string;
}
