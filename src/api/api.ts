import axios, { AxiosError } from 'axios';
import type {
  ApiResponse,
  CreateApplicationInput,
  DocumentInput,
  DocumentInputs,
  DocumentType,
  LoanApplication,
  PolicyExplanation,
  VerificationSummary
} from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api'
});

function getRequestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    return axiosError.response?.data.error?.message ?? axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected request error.';
}

function unwrap<T>(response: ApiResponse<T>) {
  if (response.error || response.data === null) {
    throw new Error(response.error?.message ?? 'API returned no data.');
  }

  return response.data;
}

export async function createApplication(input: CreateApplicationInput) {
  try {
    const response = await client.post<ApiResponse<LoanApplication>>('/applications', input, {
      headers: { 'Content-Type': 'application/json' }
    });
    return unwrap(response.data);
  } catch (error) {
    throw new Error(getRequestError(error));
  }
}

function parseCsvText(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    return {
      transactionDate: row.transaction_date ?? row.transactionDate ?? row.date,
      description: row.description ?? '',
      amount: Number(row.amount),
      category: String(row.category ?? '').toLowerCase()
    };
  });
}

async function readDocument(documentType: DocumentType, file: File): Promise<DocumentInput> {
  const text = await file.text();
  const extractedData =
    documentType === 'bank_statement' ? { transactions: parseCsvText(text) } : JSON.parse(text);

  return {
    fileName: file.name,
    extractedData
  };
}

async function readDocuments(files: Record<DocumentType, File | null>): Promise<DocumentInputs> {
  const documents: DocumentInputs = {};

  for (const [documentType, file] of Object.entries(files) as Array<[DocumentType, File | null]>) {
    if (file) {
      documents[documentType] = await readDocument(documentType, file);
    }
  }

  return documents;
}

export async function createApplicationWithDocuments(
  input: CreateApplicationInput,
  files: Record<DocumentType, File | null>
) {
  try {
    const response = await client.post<ApiResponse<LoanApplication>>(
      '/applications/intake',
      {
        ...input,
        documents: await readDocuments(files)
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return unwrap(response.data);
  } catch (error) {
    throw new Error(getRequestError(error));
  }
}

export async function getApplication(applicationId: number) {
  try {
    const response = await client.get<ApiResponse<LoanApplication>>(`/applications/${applicationId}`);
    return unwrap(response.data);
  } catch (error) {
    throw new Error(getRequestError(error));
  }
}

export async function getPolicyExplanation(applicationId: number) {
  try {
    const response = await client.get<ApiResponse<PolicyExplanation>>(
      `/applications/${applicationId}/policy-explanation`
    );
    return unwrap(response.data);
  } catch (error) {
    throw new Error(getRequestError(error));
  }
}

export async function runVerification(applicationId: number) {
  try {
    const response = await client.post<ApiResponse<VerificationSummary>>(
      `/applications/${applicationId}/verify`
    );
    return unwrap(response.data);
  } catch (error) {
    throw new Error(getRequestError(error));
  }
}
