import { Router } from 'express';
import { ZodError, z } from 'zod';
import { query } from './database.js';

const router = Router();

const createApplicationSchema = z
  .object({
    applicantName: z.string().trim().min(1).max(100),
    declaredMonthlyIncome: z.coerce.number().positive(),
    employerName: z.string().trim().min(1).max(150),
    requestedLoanAmount: z.coerce.number().positive(),
    address: z.string().trim().max(1000).optional().nullable()
  })
  .strict();

const applicationIdSchema = z.coerce.number().int().positive();

export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendData(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    data,
    error: null
  });
}

function mapApplication(row, documents = []) {
  return {
    id: row.id,
    applicantName: row.applicant_name,
    declaredMonthlyIncome: Number(row.declared_monthly_income),
    employerName: row.employer_name,
    requestedLoanAmount: Number(row.requested_loan_amount),
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    documents
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    documentType: row.document_type,
    fileName: row.file_name,
    storageKey: row.storage_key,
    extractedData: row.extracted_data,
    createdAt: row.created_at
  };
}

router.get(
  '/health',
  asyncRoute(async (req, res) => {
    await query('SELECT 1');
    return sendData(res, { status: 'ok' });
  })
);

router.post(
  '/applications',
  asyncRoute(async (req, res) => {
    const input = createApplicationSchema.parse(req.body);
    const result = await query(
      `
        INSERT INTO applications (
          applicant_name,
          declared_monthly_income,
          employer_name,
          requested_loan_amount,
          address
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          applicant_name,
          declared_monthly_income,
          employer_name,
          requested_loan_amount,
          address,
          status,
          created_at
      `,
      [
        input.applicantName,
        input.declaredMonthlyIncome,
        input.employerName,
        input.requestedLoanAmount,
        input.address ?? null
      ]
    );

    return sendData(res, mapApplication(result.rows[0]), 201);
  })
);

router.get(
  '/applications/:id',
  asyncRoute(async (req, res) => {
    const applicationId = applicationIdSchema.parse(req.params.id);
    const applicationResult = await query(
      `
        SELECT
          id,
          applicant_name,
          declared_monthly_income,
          employer_name,
          requested_loan_amount,
          address,
          status,
          created_at
        FROM applications
        WHERE id = $1
      `,
      [applicationId]
    );

    if (applicationResult.rowCount === 0) {
      throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
    }

    const documentsResult = await query(
      `
        SELECT
          id,
          application_id,
          document_type,
          file_name,
          storage_key,
          extracted_data,
          created_at
        FROM documents
        WHERE application_id = $1
        ORDER BY created_at ASC
      `,
      [applicationId]
    );

    return sendData(
      res,
      mapApplication(applicationResult.rows[0], documentsResult.rows.map(mapDocument))
    );
  })
);

export function formatRouteError(error) {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: error.issues.map((issue) => issue.message).join('; ')
    };
  }

  return {
    statusCode: error.statusCode ?? 500,
    code: error.code ?? 'INTERNAL_SERVER_ERROR',
    message: error.message ?? 'Unexpected server error.'
  };
}

export default router;
