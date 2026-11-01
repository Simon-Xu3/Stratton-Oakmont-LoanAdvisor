import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { explainApplicationPolicies, findRelatedPolicies } from './ai.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

function check(checkName, result, details = '') {
  return { checkName, result, details };
}

test('retrieval selects policies for outcomes instead of returning the full corpus', () => {
  const checks = [
    check('document_completeness', 'passed'),
    check('name_match', 'passed'),
    check('employer_match', 'manual_review_required'),
    check('payslip_income_match', 'passed'),
    check('bank_income_match', 'passed'),
    check('salary_stability', 'passed')
  ];
  assert.deepEqual(findRelatedPolicies(checks).map((policy) => policy.id), ['EMP-001', 'REV-001']);
});

test('missing payslip does not retrieve an income-difference policy', () => {
  const checks = [
    check('document_completeness', 'additional_documents_required', 'Missing: payslip.'),
    check('payslip_income_match', 'additional_documents_required', 'Payslip is missing.')
  ];
  assert.deepEqual(findRelatedPolicies(checks).map((policy) => policy.id), ['DOC-001', 'DOC-003']);
});

test('expanded corpus distinguishes document and income scenarios', () => {
  const missingBank = [check('document_completeness', 'additional_documents_required', 'Missing: bank_statement.')];
  assert.deepEqual(findRelatedPolicies(missingBank).map((policy) => policy.id), ['DOC-001', 'DOC-004']);

  const incomeGap = [check('bank_income_match', 'manual_review_required', 'Bank statement average income $3500.00 is more than 15% away from declared income.')];
  assert.deepEqual(findRelatedPolicies(incomeGap).map((policy) => policy.id), ['INC-004', 'REV-002']);

  const clean = [
    check('document_completeness', 'passed'),
    check('bank_income_match', 'passed'),
    check('salary_stability', 'passed')
  ];
  assert.deepEqual(findRelatedPolicies(clean).map((policy) => policy.id), ['DOC-005', 'INC-007', 'SAL-002']);
});

test('an application without verification is not shown as low risk', async () => {
  const result = await explainApplicationPolicies({
    id: 10, status: 'pending', verificationResults: []
  });
  assert.equal(result.riskLevel, 'not_assessed');
  assert.equal(result.guidanceSource, 'unavailable');
  assert.match(result.summary, /not run/);
  assert.deepEqual(result.recommendedActions, []);
});

test('actions and documents come from policies, not model text', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  const application = {
    id: 1,
    applicantName: 'Demo Applicant',
    declaredMonthlyIncome: 5000,
    employerName: 'Demo Company',
    requestedLoanAmount: 10000,
    status: 'additional_documents_required',
    verificationResults: [check('salary_stability', 'additional_documents_required', 'Two salary months were found.')]
  };
  let input;
  globalThis.fetch = async (_url, options) => {
    input = JSON.parse(options.body).input;
    return { ok: true, json: async () => ({ output_text: JSON.stringify({
      explanation: 'Only two salary months are present.',
      recommendedActions: [{ text: 'Invented action.' }],
      requiredDocuments: [{ text: 'Invented document.' }]
    }) }) };
  };
  const result = await explainApplicationPolicies(application);
  assert.equal(result.riskLevel, 'medium');
  assert.equal(result.guidanceSource, 'ai');
  assert.deepEqual(result.relatedPolicies.map((policy) => policy.id), ['SAL-001']);
  assert.deepEqual(result.recommendedActions, []);
  assert.deepEqual(result.requiredDocuments, [{
    text: 'Additional salary history.', policyIds: ['SAL-001'], checkNames: ['salary_stability']
  }]);
  assert.doesNotMatch(input, /Demo Applicant|Demo Company|5000|10000|Invented/);
});

test('missing key preserves rule results and policy evidence without calling AI', async () => {
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = () => { throw new Error('AI must not be called'); };
  const application = {
    id: 2,
    status: 'manual_review_required',
    verificationResults: [check('employer_match', 'manual_review_required', 'Employer does not match payslip.')]
  };
  const result = await explainApplicationPolicies(application);
  assert.equal(result.status, 'manual_review_required');
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.guidanceSource, 'unavailable');
  assert.deepEqual(result.relatedPolicies.map((policy) => policy.id), ['EMP-001', 'REV-001']);
  assert.deepEqual(result.recommendedActions, [{
    text: 'Refer the identity or employer discrepancy to a human reviewer.',
    policyIds: ['REV-001'], checkNames: ['employer_match']
  }]);
  assert.deepEqual(result.requiredDocuments, []);
  assert.match(result.warning, /not configured/);
});

test('temporary rate limit retries once, then returns AI guidance', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 429, headers: { get: () => null } };
    return { ok: true, json: async () => ({ output_text: JSON.stringify({
      explanation: 'Only two months were found.'
    }) }) };
  };
  const result = await explainApplicationPolicies({
    id: 3, status: 'additional_documents_required',
    verificationResults: [check('salary_stability', 'additional_documents_required', 'Less than 3 months of salary records were found.')]
  });
  assert.equal(calls, 2);
  assert.equal(result.guidanceSource, 'ai');
  assert.equal(result.warning, null);
  assert.equal(result.requiredDocuments[0].text, 'Additional salary history.');
});

test('network failure returns policy context without exposing a request error', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error('ECONNREFUSED'); };
  const result = await explainApplicationPolicies({
    id: 4, status: 'manual_review_required',
    verificationResults: [check('employer_match', 'manual_review_required', 'Employer does not match payslip.')]
  });
  assert.equal(calls, 2);
  assert.equal(result.guidanceSource, 'unavailable');
  assert.doesNotMatch(result.warning, /ECONNREFUSED/);
  assert.deepEqual(result.relatedPolicies.map((policy) => policy.id), ['EMP-001', 'REV-001']);
  assert.equal(result.recommendedActions.length, 1);
});

test('invalid API access does not retry or hide the verification result', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: false, status: 401 }; };
  const result = await explainApplicationPolicies({
    id: 5, status: 'additional_documents_required',
    verificationResults: [check('salary_stability', 'additional_documents_required', 'Authentication test: short salary history.')]
  });
  assert.equal(calls, 1);
  assert.equal(result.guidanceSource, 'unavailable');
  assert.equal(result.status, 'additional_documents_required');
  assert.match(result.warning, /authenticate/);
  assert.equal(result.requiredDocuments[0].text, 'Additional salary history.');
});

test('repeated guidance requests reuse a successful explanation', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ output_text: '{"explanation":"The short salary history needs more evidence."}' }) };
  };
  const application = {
    id: 6, status: 'additional_documents_required',
    verificationResults: [check('salary_stability', 'additional_documents_required', 'Cache test: two salary months.')]
  };
  const [first, second] = await Promise.all([
    explainApplicationPolicies(application), explainApplicationPolicies(application)
  ]);
  const third = await explainApplicationPolicies(application);
  assert.equal(calls, 1);
  assert.equal(first.explanation, second.explanation);
  assert.equal(third.explanation, first.explanation);
});
