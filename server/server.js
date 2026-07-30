import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { explainApplicationPolicies } from './ai.js';
import { query } from './database.js';
import { verifyApplication } from './verification.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const documentTypes = ['application_form', 'payslip', 'bank_statement'];
const app = express();
const port = Number(process.env.PORT ?? 3000);

function apiError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

function getApplicationId(req) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw apiError(400, 'INVALID_APPLICATION_ID', 'Application ID is invalid.');
  }

  return id;
}

function getSubmittedDocuments(documents = {}) {
  return documentTypes.flatMap((documentType) => {
    const document = documents[documentType];

    if (!document) {
      return [];
    }

    if (!document.fileName || !document.extractedData) {
      throw apiError(400, 'INVALID_DOCUMENT', 'A valid document payload is required.');
    }

    return [{ documentType, fileName: document.fileName, extractedData: document.extractedData }];
  });
}

async function createApplication(input) {
  if (!input.applicantName || !input.employerName) {
    throw apiError(400, 'INVALID_APPLICATION', 'Applicant name and employer are required.');
  }

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
      RETURNING *
    `,
    [
      input.applicantName,
      Number(input.declaredMonthlyIncome),
      input.employerName,
      Number(input.requestedLoanAmount),
      input.address ?? null
    ]
  );

  return result.rows[0];
}

async function saveDocument(applicationId, documentType, fileName, extractedData) {
  await query(
    `
      INSERT INTO documents (
        application_id,
        document_type,
        file_name,
        extracted_data
      )
      VALUES ($1, $2, $3, $4)
    `,
    [applicationId, documentType, fileName, extractedData]
  );

  if (documentType !== 'bank_statement') {
    return;
  }

  for (const item of extractedData.transactions ?? []) {
    await query(
      `
        INSERT INTO bank_transactions (
          application_id,
          transaction_date,
          description,
          amount,
          category
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [applicationId, item.transactionDate, item.description, item.amount, item.category]
    );
  }
}

function mapApplication(row, documents = [], checks = [], transactions = []) {
  return {
    id: row.id,
    applicantName: row.applicant_name,
    declaredMonthlyIncome: Number(row.declared_monthly_income),
    employerName: row.employer_name,
    requestedLoanAmount: Number(row.requested_loan_amount),
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    documents,
    verificationResults: checks,
    bankTransactions: transactions
  };
}

async function getApplication(id) {
  const application = await query('SELECT * FROM applications WHERE id = $1', [id]);

  if (application.rowCount === 0) {
    throw apiError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }

  const documents = await query(
    'SELECT * FROM documents WHERE application_id = $1 ORDER BY id ASC',
    [id]
  );
  const checks = await query(
    'SELECT * FROM verification_results WHERE application_id = $1 ORDER BY id ASC',
    [id]
  );
  const transactions = await query(
    'SELECT * FROM bank_transactions WHERE application_id = $1 ORDER BY transaction_date DESC',
    [id]
  );

  return mapApplication(
    application.rows[0],
    documents.rows.map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      documentType: row.document_type,
      fileName: row.file_name,
      extractedData: row.extracted_data,
      createdAt: row.created_at
    })),
    checks.rows.map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      checkName: row.check_name,
      result: row.result,
      details: row.details,
      createdAt: row.created_at
    })),
    transactions.rows.map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      transactionDate: row.transaction_date,
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      createdAt: row.created_at
    }))
  );
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get(
  '/api/health',
  handle(async (req, res) => {
    await query('SELECT 1');
    res.status(200).json({ data: { status: 'ok' }, error: null });
  })
);

app.post(
  '/api/applications/intake',
  handle(async (req, res) => {
    const application = await createApplication(req.body);
    const submittedDocuments = getSubmittedDocuments(req.body.documents);

    for (const { documentType, fileName, extractedData } of submittedDocuments) {
      await saveDocument(application.id, documentType, fileName, extractedData);
    }

    await verifyApplication(application.id);
    res.status(201).json({ data: await getApplication(application.id), error: null });
  })
);

app.post(
  '/api/applications',
  handle(async (req, res) => {
    const application = await createApplication(req.body);
    res.status(201).json({ data: mapApplication(application), error: null });
  })
);

app.post(
  '/api/applications/:id/verify',
  handle(async (req, res) => {
    res.status(200).json({ data: await verifyApplication(getApplicationId(req)), error: null });
  })
);

app.get(
  '/api/applications/:id/policy-explanation',
  handle(async (req, res) => {
    const application = await getApplication(getApplicationId(req));
    res.status(200).json({ data: await explainApplicationPolicies(application), error: null });
  })
);

app.get(
  '/api/applications/:id',
  handle(async (req, res) => {
    res.status(200).json({ data: await getApplication(getApplicationId(req)), error: null });
  })
);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((req, res) => {
  return res.status(404).json({
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} was not found.`
    }
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Unexpected server error.'
      : error.message ?? 'Unexpected server error.';

  return res.status(statusCode).json({
    data: null,
    error: {
      code,
      message
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
