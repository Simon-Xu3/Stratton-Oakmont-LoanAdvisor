import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getApplication, getPolicyExplanation, runVerification } from '../api/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PolicyCard } from '../components/PolicyCard';
import { VerificationCard } from '../components/VerificationCard';
import type { LoanApplication, PolicyExplanation } from '../types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function riskTone(riskLevel: PolicyExplanation['riskLevel']) {
  if (riskLevel === 'high') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (riskLevel === 'medium') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function averageSalary(application: LoanApplication) {
  const salaries = application.bankTransactions.filter((item) => item.category === 'salary');

  if (salaries.length === 0) {
    return null;
  }

  return salaries.reduce((total, item) => total + item.amount, 0) / salaries.length;
}

export function Result() {
  const { id } = useParams();
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [policyExplanation, setPolicyExplanation] = useState<PolicyExplanation | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadApplication() {
    const applicationId = Number(id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      setError('Application ID is invalid.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setPolicyExplanation(null);
    setPolicyError(null);

    try {
      const data = await getApplication(applicationId);
      setApplication(data);

      try {
        setPolicyExplanation(await getPolicyExplanation(applicationId));
      } catch (policyLoadError) {
        setPolicyExplanation(null);
        setPolicyError(
          policyLoadError instanceof Error
            ? policyLoadError.message
            : 'Unable to generate policy explanation.'
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load application.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadApplication();
  }, [id]);

  async function verifyAgain() {
    if (!application) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await runVerification(application.id);
      await loadApplication();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to run verification.');
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-paper">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-base font-bold text-gold hover:text-bronze"
              to="/upload"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              New application
            </Link>
            <h1 className="mt-4 text-5xl font-bold leading-none text-black">AI review result</h1>
          </div>
          <button
            className="inline-flex h-12 min-w-32 items-center justify-center gap-2 border border-line bg-white px-4 text-base font-bold text-black transition hover:border-gold hover:text-bronze disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            onClick={verifyAgain}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Re-run review
          </button>
        </div>

        {isLoading ? <LoadingSpinner label="Loading AI review" /> : null}

        {!isLoading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && application ? (
          <>
            <section className="border border-line bg-white p-7">
              <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="border-l-[8px] border-gold pl-6">
                  <p className="flex items-center gap-2 text-sm font-bold uppercase text-black">
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Application #{application.id}
                  </p>
                  <h2 className="mt-3 text-4xl font-bold leading-tight text-black">
                    {application.applicantName}
                  </h2>
                </div>
                <span className="inline-flex min-h-9 items-center border border-line bg-slate-50 px-4 text-sm font-bold text-bronze">
                  {formatLabel(application.status)}
                </span>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <VerificationCard title="Employer" value={application.employerName} />
                <VerificationCard
                  title="Declared monthly income"
                  value={formatCurrency(application.declaredMonthlyIncome)}
                />
                <VerificationCard
                  title="Requested loan amount"
                  value={formatCurrency(application.requestedLoanAmount)}
                />
                <VerificationCard title="Created" value={formatDate(application.createdAt)} />
                <VerificationCard title="Address" value={application.address || 'Not provided'} />
                <VerificationCard
                  title="Documents"
                  value={`${application.documents.length} saved document(s)`}
                />
                <VerificationCard
                  title="Average bank salary"
                  value={
                    averageSalary(application) === null
                      ? 'Not available'
                      : formatCurrency(averageSalary(application) ?? 0)
                  }
                />
              </div>
            </section>

            <section className="border border-line bg-white p-7">
              <div className="border-l-[8px] border-gold pl-6">
                <p className="text-sm font-bold uppercase text-black">Rule-based checks</p>
              </div>

              {application.verificationResults.length === 0 ? (
                <div className="mt-6 border border-line bg-slate-50 px-4 py-3 text-sm font-bold text-steel">
                  No verification results yet.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {application.verificationResults.map((check) => (
                    <article className="border border-line bg-slate-50 px-4 py-3" key={check.id ?? check.checkName}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <strong className="text-base text-black">{formatLabel(check.checkName)}</strong>
                        <span className="text-sm font-bold text-bronze">
                          {formatLabel(check.result)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-steel">{check.details}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="border border-line bg-white p-7">
              <div className="border-l-[8px] border-gold pl-6">
                <p className="text-sm font-bold uppercase text-black">Review guidance</p>
              </div>

              {policyExplanation ? (
                <>
                  <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className={`border px-4 py-3 ${riskTone(policyExplanation.riskLevel)}`}>
                      <p className="text-xs font-bold uppercase">Risk level</p>
                      <p className="mt-1 text-xl font-bold capitalize">
                        {policyExplanation.riskLevel}
                      </p>
                    </div>
                    <div className="border border-line bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase text-steel">Risk summary</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-steel">
                        {policyExplanation.summary}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 border border-line bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-steel">
                    {policyExplanation.explanation}
                  </p>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="border border-line bg-slate-50 px-4 py-3">
                      <h3 className="text-xs font-bold uppercase text-steel">Recommended next actions</h3>
                      {policyExplanation.recommendedActions.length === 0 ? (
                        <p className="mt-2 text-sm font-semibold text-steel">No actions returned.</p>
                      ) : (
                        <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-steel">
                          {policyExplanation.recommendedActions.map((action) => (
                            <li key={action}>{action}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="border border-line bg-slate-50 px-4 py-3">
                      <h3 className="text-xs font-bold uppercase text-steel">Requested documents</h3>
                      {policyExplanation.requiredDocuments.length === 0 ? (
                        <p className="mt-2 text-sm font-semibold text-steel">No extra documents returned.</p>
                      ) : (
                        <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-steel">
                          {policyExplanation.requiredDocuments.map((document) => (
                            <li key={document}>{document}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {policyExplanation.relatedPolicies.length === 0 ? (
                    <div className="mt-4 border border-line bg-slate-50 px-4 py-3 text-sm font-bold text-steel">
                      No policy context was matched for AI review.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {policyExplanation.relatedPolicies.map((policy) => (
                        <PolicyCard
                          key={policy.id}
                          title={`${policy.id} · ${policy.title}`}
                          body={policy.content}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-6 border border-line bg-slate-50 px-4 py-3 text-sm font-bold text-steel">
                  {policyError ?? 'AI review guidance is not available yet.'}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
