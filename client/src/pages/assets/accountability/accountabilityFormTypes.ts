export interface AccountabilityForm {
  id: string;
  formNumber: string;
  assets: {
    id: string;
    code: string;
    name: string;
    category: string;
    categoryDepartment?: string;
    type: string;
    serialNo: string;
    modelNo?: string;
    brand?: string;
    specifications?: unknown[];
  }[];
  assignmentIds?: string[];
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employeeNumber?: string;
    position?: string;
    company?: { id: string; name: string };
    department?: { id: string; name: string };
    companyLogoUrl?: string | null;
  };
  assignment: {
    id: string;
    assigned_date: string;
    expected_return_date?: string;
    assignment_notes?: string;
    assigned_by?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  };
  issuer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
    floor_unit: string;
    building: string;
  };
  status:
    | 'Pending'
    | 'Signed'
    | 'Completed'
    | 'Revoked'
    | 'Disabled'
    | 'Declined';
  declineReason?: string | null;
  created_at: string;
  updated_at?: string;
  signed_at?: string;
  issuerSignature?: string;
  itCopySignature?: string;
  receivedCopy201FileSignature?: string | null;
  receivedCopy201FileSignedAt?: string | null;
  receivedCopy201FileSignedById?: string | null;
  receivedCopy201FileSignedByName?: string | null;
  acknowledgments?: {
    digitalSignature?: string;
    [key: string]: unknown;
  };
  formOrigin?: 'processor_return';
}
