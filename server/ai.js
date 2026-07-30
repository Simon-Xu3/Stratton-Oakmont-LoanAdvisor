function makeAiError(code, message, statusCode = 503) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

const policies = [
  {
    id: 'DOC-001',
    title: 'Required Documents Policy',
    tags: ['document_completeness', 'additional_documents_required'],
    content:
      'Applications must include an application form, a payslip, and a bank statement before final review.'
  },
  {
    id: 'ID-001',
    title: 'Applicant Identity Match Policy',
    tags: ['name_match'],
    content:
      'If the applicant name in supporting documents does not match the application, the file should be reviewed manually.'
  },
  {
    id: 'EMP-001',
    title: 'Employer Match Policy',
    tags: ['employer_match'],
    content:
      'Employer names from the application and payslip should refer to the same employer before income is accepted.'
  },
  {
    id: 'INC-001',
    title: 'Income Verification Policy',
    tags: ['payslip_income_match', 'bank_income_match', 'additional_documents_required'],
    content:
      'Income differences above 10% may require additional documents, and differences above 15% should be escalated.'
  },
  {
    id: 'REV-001',
    title: 'Manual Review Policy',
    tags: ['manual_review_required', 'salary_stability'],
    content:
      'Files with material identity, employer, income, or salary stability concerns should be sent to manual review.'
  }
];

function findRelatedPolicies(checks) {
  const tags = new Set(checks.flatMap((check) => [check.checkName, check.result]));

  return policies.filter((policy) => policy.tags.some((tag) => tags.has(tag)));
}

function getOutputText(responseData) {
  if (typeof responseData.output_text === 'string') {
    return responseData.output_text.trim();
  }

  const textParts = responseData.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text.trim());

  return textParts?.join('\n').trim() ?? '';
}

function parseJsonOutput(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw makeAiError('AI_INVALID_JSON', 'OpenAI did not return valid JSON policy analysis.');
  }
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw makeAiError('AI_INVALID_ANALYSIS', `OpenAI response is missing ${fieldName}.`);
  }

  return value.trim();
}

function requireStringList(value, fieldName) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw makeAiError('AI_INVALID_ANALYSIS', `OpenAI response has an invalid ${fieldName} list.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeAnalysis(value) {
  if (!value || typeof value !== 'object') {
    throw makeAiError('AI_INVALID_ANALYSIS', 'OpenAI response must be a JSON object.');
  }

  if (!['low', 'medium', 'high'].includes(value.riskLevel)) {
    throw makeAiError('AI_INVALID_ANALYSIS', 'OpenAI response has an invalid riskLevel.');
  }

  return {
    summary: requireString(value.summary, 'summary'),
    riskLevel: value.riskLevel,
    explanation: requireString(value.explanation, 'explanation'),
    recommendedActions: requireStringList(value.recommendedActions, 'recommendedActions'),
    requiredDocuments: requireStringList(value.requiredDocuments, 'requiredDocuments')
  };
}

const policyAnalysisFormat = {
  type: 'json_schema',
  name: 'loan_policy_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'riskLevel', 'explanation', 'recommendedActions', 'requiredDocuments'],
    properties: {
      summary: {
        type: 'string',
        description: 'A one-sentence risk summary for the reviewer.'
      },
      riskLevel: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Overall review risk based only on supplied checks and policies.'
      },
      explanation: {
        type: 'string',
        description: 'A short explanation of why the rule result makes sense under the policies.'
      },
      recommendedActions: {
        type: 'array',
        description: 'Concrete next actions for a human loan reviewer.',
        items: {
          type: 'string'
        }
      },
      requiredDocuments: {
        type: 'array',
        description: 'Documents the applicant should provide next, or an empty array if none.',
        items: {
          type: 'string'
        }
      }
    }
  }
};

async function generatePolicyAnalysis({ application, checks, policies }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw makeAiError(
      'AI_NOT_CONFIGURED',
      'OPENAI_API_KEY is required to generate policy analysis.'
    );
  }

  let response;

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        instructions:
          'You are a bank loan review assistant. Use only the supplied checks and policies. Do not approve or reject the loan. Return concise English text for the application UI. recommendedActions and requiredDocuments must be practical and specific. explanation must be under 120 words.',
        text: {
          format: policyAnalysisFormat
        },
        input: JSON.stringify(
          {
            application: {
              id: application.id,
              applicantName: application.applicantName,
              declaredMonthlyIncome: application.declaredMonthlyIncome,
              employerName: application.employerName,
              requestedLoanAmount: application.requestedLoanAmount,
              status: application.status
            },
            verificationChecks: checks,
            relatedPolicies: policies
          },
          null,
          2
        )
      })
    });
  } catch (error) {
    throw makeAiError(
      'AI_NETWORK_ERROR',
      `Unable to connect to OpenAI API: ${error.cause?.code ?? error.message}`
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const openAiError = errorData?.error;

    throw makeAiError(
      openAiError?.code ?? 'AI_REQUEST_FAILED',
      openAiError?.message ?? `OpenAI request failed with status ${response.status}.`
    );
  }

  const text = getOutputText(await response.json());

  if (!text) {
    throw makeAiError('AI_EMPTY_RESPONSE', 'OpenAI returned an empty policy analysis.');
  }

  return normalizeAnalysis(parseJsonOutput(text));
}

export async function explainApplicationPolicies(application) {
  const relatedPolicies = findRelatedPolicies(application.verificationResults);
  const analysis = await generatePolicyAnalysis({
    application,
    checks: application.verificationResults,
    policies: relatedPolicies
  });

  return {
    applicationId: application.id,
    status: application.status,
    relatedPolicies,
    ...analysis
  };
}
