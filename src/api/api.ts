import axios, { AxiosError } from 'axios';
import type { ApiResponse, CreateApplicationInput, LoanApplication } from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
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
    const response = await client.post<ApiResponse<LoanApplication>>('/applications', input);
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
