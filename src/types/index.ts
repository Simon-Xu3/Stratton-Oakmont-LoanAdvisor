export type ApplicationStatus =
  | 'pending'
  | 'verification_passed'
  | 'additional_documents_required'
  | 'manual_review_required';

export type DocumentType = 'application_form' | 'payslip' | 'bank_statement';

export type VerificationCheckStatus =
  | 'passed'
  | 'additional_documents_required'
  | 'manual_review_required';

export interface LoanDocument {
  id: number;
  applicationId: number;
  documentType: DocumentType;
  fileName: string;
  extractedData: Record<string, unknown> | null;
  createdAt: string;
}

export interface BankTransaction {
  id: number;
  applicationId: number;
  transactionDate: string;
  description: string | null;
  amount: number;
  category: string;
  createdAt: string;
}

export interface VerificationResult {
  id?: number;
  applicationId?: number;
  checkName: string;
  result: VerificationCheckStatus;
  details: string;
  createdAt?: string;
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
  verificationResults: VerificationResult[];
  bankTransactions: BankTransaction[];
}

export interface CreateApplicationInput {
  applicantName: string;
  declaredMonthlyIncome: number;
  employerName: string;
  requestedLoanAmount: number;
  address?: string;
}

export interface DocumentInput {
  fileName: string;
  extractedData: Record<string, unknown>;
}

export type DocumentInputs = Partial<Record<DocumentType, DocumentInput>>;

export interface VerificationSummary {
  applicationId: number;
  status: ApplicationStatus;
  results: VerificationResult[];
}

export interface RelatedPolicy {
  id: string;
  title: string;
  version: string;
  source: string;
  content: string;
  appliesTo: { checkName: string; results: string[]; includeDetailsContaining?: string; excludeDetailsContaining?: string }[];
  actions?: string[];
  documents?: string[];
}

export interface CitedGuidance {
  text: string;
  policyIds: string[];
  checkNames: string[];
}

export interface PolicyExplanation {
  applicationId: number;
  status: ApplicationStatus;
  relatedPolicies: RelatedPolicy[];
  guidanceSource: 'ai' | 'unavailable';
  warning: string | null;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'not_assessed';
  explanation: string;
  recommendedActions: CitedGuidance[];
  requiredDocuments: CitedGuidance[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
