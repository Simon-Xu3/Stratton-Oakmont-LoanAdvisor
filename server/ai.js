import { readFileSync } from 'node:fs';

function makeAiError(code, message, statusCode = 503) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

const policies = JSON.parse(readFileSync(new URL('./policies.json', import.meta.url), 'utf8'));

function supportsCheck(policy, check) {
  return policy.appliesTo.some(
    (scope) => scope.checkName === check.checkName && scope.results.includes(check.result) &&
      (!scope.includeDetailsContaining || check.details?.includes(scope.includeDetailsContaining)) &&
      (!scope.excludeDetailsContaining || !check.details?.includes(scope.excludeDetailsContaining))
  );
}

export function findRelatedPolicies(checks) {
  const actionableChecks = checks.filter((check) => check.result !== 'passed');
  if (actionableChecks.length === 0) {
    // A clean review needs a small amount of context, not the entire corpus.
    return policies.filter((policy) => ['DOC-005', 'INC-007', 'SAL-002'].includes(policy.id))
      .filter((policy) => checks.some((check) => supportsCheck(policy, check)));
  }

  return policies.filter((policy) => actionableChecks.some((check) => supportsCheck(policy, check)));
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

function normalizeAnalysis(value) {
  if (!value || typeof value !== 'object') {
    throw makeAiError('AI_INVALID_ANALYSIS', 'OpenAI response must be a JSON object.');
  }

  return { explanation: requireString(value.explanation, 'explanation') };
}

const policyAnalysisFormat = {
  type: 'json_schema',
  name: 'loan_policy_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['explanation'],
    properties: {
      explanation: {
        type: 'string',
        description: 'Explain only the supplied check results using the supplied sample policies. Do not add actions, document requirements, or new facts.'
      }
    }
  }
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RETRY_DELAY_MS = 1200;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const analysisCache = new Map();

function policyGuidance(checks, relatedPolicies, field) {
  return relatedPolicies.flatMap((policy) => {
    const checkNames = [...new Set(checks.filter((check) => supportsCheck(policy, check))
      .map((check) => check.checkName))];
    return (policy[field] ?? []).map((text) => ({
      text,
      policyIds: [policy.id],
      checkNames
    }));
  });
}

function ruleSummary(status, checks) {
  if (checks.length === 0) return 'Verification has not run yet.';
  const flagged = checks.filter((check) => check.result !== 'passed');
  if (flagged.length === 0) return 'The configured verification checks passed.';
  const names = flagged.map((check) => check.checkName.replaceAll('_', ' ')).join(', ');
  return status === 'manual_review_required'
    ? `Human review is required for: ${names}.`
    : `Additional evidence is needed for: ${names}.`;
}

async function requestPolicyAnalysis(apiKey, payload) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw makeAiError('AI_TIMEOUT', 'The AI request timed out.');
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw makeAiError('AI_NETWORK_ERROR', 'The AI service could not be reached.');
    }

    if (response.ok) return response;

    if (attempt === 0 && RETRYABLE_STATUS.has(response.status)) {
      const retryAfter = Number(response.headers?.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000 : 250 + Math.floor(Math.random() * 200);
      if (delay <= MAX_RETRY_DELAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }

    const code = response.status === 429 ? 'AI_RATE_LIMITED'
      : response.status === 401 || response.status === 403 ? 'AI_ACCESS_ERROR'
        : 'AI_REQUEST_FAILED';
    throw makeAiError(code, `AI service returned status ${response.status}.`);
  }
}

async function generatePolicyAnalysis({ checks, policies }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw makeAiError(
      'AI_NOT_CONFIGURED',
      'OPENAI_API_KEY is required to generate policy analysis.'
    );
  }

  const response = await requestPolicyAnalysis(apiKey, {
    model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
    instructions:
      'Explain the supplied rule checks using only the supplied sample policy clauses. Return one concise English paragraph under 120 words. Do not approve or reject the loan. Do not invent facts, recommend actions, or request documents; the application provides those from policy data.',
    text: { format: policyAnalysisFormat },
    input: JSON.stringify({
      verificationChecks: checks.map(({ checkName, result, details }) => ({ checkName, result, details })),
      relatedPolicies: policies.map(({ id, title, content }) => ({ id, title, content }))
    })
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch {
    throw makeAiError('AI_INVALID_RESPONSE', 'AI service returned an unreadable response.');
  }
  const text = getOutputText(responseData);

  if (!text) {
    throw makeAiError('AI_EMPTY_RESPONSE', 'OpenAI returned an empty policy analysis.');
  }

  return normalizeAnalysis(parseJsonOutput(text));
}

async function cachedPolicyAnalysis(checks, policies) {
  if (!process.env.OPENAI_API_KEY) return generatePolicyAnalysis({ checks, policies });
  const key = JSON.stringify({
    model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
    checks: checks.map(({ checkName, result, details }) => ({ checkName, result, details })),
    policies: policies.map(({ id, version }) => ({ id, version }))
  });
  const cached = analysisCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = generatePolicyAnalysis({ checks, policies });
  analysisCache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  if (analysisCache.size > MAX_CACHE_ENTRIES) {
    analysisCache.delete(analysisCache.keys().next().value);
  }
  try {
    return await promise;
  } catch (error) {
    analysisCache.delete(key);
    throw error;
  }
}

export async function explainApplicationPolicies(application) {
  const checks = application.verificationResults;
  const relatedPolicies = findRelatedPolicies(checks);
  const recommendedActions = policyGuidance(checks, relatedPolicies, 'actions');
  const requiredDocuments = policyGuidance(checks, relatedPolicies, 'documents');
  let explanation = checks.length === 0
    ? 'Run verification to generate policy guidance.'
    : 'Review the verification checks against the matched sample policies below.';
  let guidanceSource = 'ai';
  let warning = null;
  if (relatedPolicies.length === 0) {
    guidanceSource = 'unavailable';
    warning = checks.length === 0
      ? 'Verification has not run yet.'
      : 'No matching sample policy was found. Review the checks manually.';
  } else {
    try {
      ({ explanation } = await cachedPolicyAnalysis(checks, relatedPolicies));
    } catch (error) {
      guidanceSource = 'unavailable';
      warning = error.code === 'AI_NOT_CONFIGURED' ? 'AI guidance is not configured on this server.'
        : error.code === 'AI_ACCESS_ERROR' ? 'AI guidance could not authenticate. Check API access.'
          : error.code === 'AI_RATE_LIMITED' ? 'AI guidance is rate limited. Try again later.'
            : 'AI guidance is temporarily unavailable. Review the checks and policies below.';
      console.warn('[policy guidance]', error.code ?? 'AI_UNKNOWN_ERROR', error.message);
    }
  }

  return {
    applicationId: application.id,
    status: application.status,
    riskLevel: checks.length === 0 || application.status === 'pending' ? 'not_assessed'
      : application.status === 'manual_review_required' ? 'high'
      : application.status === 'additional_documents_required' ? 'medium' : 'low',
    relatedPolicies,
    guidanceSource,
    warning,
    summary: ruleSummary(application.status, checks),
    explanation,
    recommendedActions,
    requiredDocuments
  };
}
