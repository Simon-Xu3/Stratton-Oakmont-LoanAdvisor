import { query } from './database.js';

const REQUIRED_DOCUMENTS = ['application_form', 'payslip', 'bank_statement'];

function result(checkName, status, details) {
  return { checkName, result: status, details };
}

function cleanName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function cleanEmployer(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b(ltd|limited|inc|company|corp|pte|private)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function incomeCheck(checkName, declaredIncome, actualIncome, label) {
  if (!Number.isFinite(actualIncome)) {
    return result(checkName, 'additional_documents_required', `${label} income is missing.`);
  }

  const gap = Math.abs(declaredIncome - actualIncome) / declaredIncome;

  if (gap > 0.15) {
    return result(
      checkName,
      'manual_review_required',
      `${label} income ${money(actualIncome)} is more than 15% away from declared income.`
    );
  }

  if (gap > 0.1) {
    return result(
      checkName,
      'additional_documents_required',
      `${label} income ${money(actualIncome)} is more than 10% away from declared income.`
    );
  }

  return result(checkName, 'passed', `${label} income is close enough to declared income.`);
}

function finalStatus(checks) {
  if (checks.some((check) => check.result === 'manual_review_required')) {
    return 'manual_review_required';
  }

  if (checks.some((check) => check.result === 'additional_documents_required')) {
    return 'additional_documents_required';
  }

  return 'verification_passed';
}

function recentSalaryCheck(salaryMonthCount) {
  if (salaryMonthCount >= 3) {
    return result('salary_stability', 'passed', 'There are salary records in at least 3 months.');
  }

  return result(
    'salary_stability',
    'additional_documents_required',
    'Less than 3 months of salary records were found.'
  );
}

async function saveChecks(applicationId, checks, status) {
  await query('DELETE FROM verification_results WHERE application_id = $1', [applicationId]);

  for (const check of checks) {
    await query(
      `
        INSERT INTO verification_results (
          application_id,
          check_name,
          result,
          details
        )
        VALUES ($1, $2, $3, $4)
      `,
      [applicationId, check.checkName, check.result, check.details]
    );
  }

  await query('UPDATE applications SET status = $1 WHERE id = $2', [status, applicationId]);
}

export async function verifyApplication(applicationId) {
  const applicationResult = await query('SELECT * FROM applications WHERE id = $1', [applicationId]);

  if (applicationResult.rowCount === 0) {
    const error = new Error('Application was not found.');
    error.statusCode = 404;
    error.code = 'APPLICATION_NOT_FOUND';
    throw error;
  }

  const application = applicationResult.rows[0];
  const declaredIncome = Number(application.declared_monthly_income);

  const documentResult = await query(
    'SELECT document_type, extracted_data FROM documents WHERE application_id = $1',
    [applicationId]
  );
  const documents = new Map(
    documentResult.rows.map((row) => [row.document_type, row.extracted_data])
  );
  const payslip = documents.get('payslip');
  const missingDocuments = REQUIRED_DOCUMENTS.filter((type) => !documents.has(type));

  const salaryResult = await query(
    `
      SELECT
        AVG(amount) AS average_salary,
        COUNT(DISTINCT DATE_TRUNC('month', transaction_date)) AS salary_months
      FROM bank_transactions
      WHERE application_id = $1
        AND category = 'salary'
    `,
    [applicationId]
  );
  const averageSalary =
    salaryResult.rows[0].average_salary === null
      ? NaN
      : Number(salaryResult.rows[0].average_salary);
  const salaryMonthCount = Number(salaryResult.rows[0].salary_months);

  const checks = [
    missingDocuments.length === 0
      ? result('document_completeness', 'passed', 'All required documents were uploaded.')
      : result(
          'document_completeness',
          'additional_documents_required',
          `Missing: ${missingDocuments.join(', ')}.`
        )
  ];

  if (!payslip) {
    checks.push(
      result('name_match', 'additional_documents_required', 'Payslip is missing.'),
      result('employer_match', 'additional_documents_required', 'Payslip is missing.'),
      result('payslip_income_match', 'additional_documents_required', 'Payslip is missing.')
    );
  } else {
    checks.push(
      cleanName(application.applicant_name) === cleanName(payslip.employeeName)
        ? result('name_match', 'passed', 'Applicant name matches payslip name.')
        : result('name_match', 'manual_review_required', 'Applicant name does not match payslip.'),
      cleanEmployer(application.employer_name) === cleanEmployer(payslip.employerName)
        ? result('employer_match', 'passed', 'Employer matches payslip employer.')
        : result('employer_match', 'manual_review_required', 'Employer does not match payslip.'),
      incomeCheck(
        'payslip_income_match',
        declaredIncome,
        Number(payslip.monthlyIncome),
        'Payslip'
      )
    );
  }

  checks.push(
    incomeCheck('bank_income_match', declaredIncome, averageSalary, 'Bank statement average'),
    recentSalaryCheck(salaryMonthCount)
  );

  const status = finalStatus(checks);
  await saveChecks(applicationId, checks, status);

  return { applicationId, status, results: checks };
}
