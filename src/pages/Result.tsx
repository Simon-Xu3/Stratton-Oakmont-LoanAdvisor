import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getApplication } from '../api/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { VerificationCard } from '../components/VerificationCard';
import type { LoanApplication } from '../types';

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

export function Result() {
  const { id } = useParams();
  const [application, setApplication] = useState<LoanApplication | null>(null);
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

    try {
      const data = await getApplication(applicationId);
      setApplication(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load application.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadApplication();
  }, [id]);

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
            <h1 className="mt-4 text-5xl font-bold leading-none text-black">Application result</h1>
          </div>
          <button
            className="inline-flex h-12 min-w-32 items-center justify-center gap-2 border border-line bg-white px-4 text-base font-bold text-black transition hover:border-gold hover:text-bronze disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            onClick={loadApplication}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {isLoading ? <LoadingSpinner label="Loading application" /> : null}

        {!isLoading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && application ? (
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
                {application.status}
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
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
