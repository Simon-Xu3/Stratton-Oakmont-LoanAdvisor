export type ApplicationStatus =
  | 'pending'
  | 'verification_passed'
  | 'additional_documents_required'
  | 'manual_review_required';

export interface LoanDocument {
  id: number;
  applicationId: number;
  documentType: string;
  fileName: string;
  storageKey: string | null;
  extractedData: Record<string, unknown> | null;
  createdAt: string;
}

export interface LoanApplication {
  id: number;
  applicantName: string;
  declaredMonthlyIncome: number;
  employerName: string;
  requestedLoanAmount: number;
  address: string | null;
  status: ApplicationStatus;
  createdAt: string;
  documents: LoanDocument[];
}

export interface CreateApplicationInput {
  applicantName: string;
  declaredMonthlyIncome: number;
  employerName: string;
  requestedLoanAmount: number;
  address?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
