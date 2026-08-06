import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  FileCheck2,
  MapPin,
  UserRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createApplicationWithDocuments } from '../api/api';
import { FileUpload } from '../components/FileUpload';
import type { CreateApplicationInput, DocumentType } from '../types';

const initialForm: CreateApplicationInput = {
  applicantName: 'Alex Tan',
  declaredMonthlyIncome: 8000,
  employerName: 'ABC Technologies Pte Ltd',
  requestedLoanAmount: 50000,
  address: '10 Example Street, Singapore'
};

const uploadFields: Array<{ type: DocumentType; label: string; accept: string }> = [
  { type: 'application_form', label: 'Application form JSON', accept: '.json,application/json' },
  { type: 'payslip', label: 'Payslip JSON', accept: '.json,application/json' },
  { type: 'bank_statement', label: 'Bank statement CSV', accept: '.csv,text/csv' }
];

const emptyFiles: Record<DocumentType, File | null> = {
  application_form: null,
  payslip: null,
  bank_statement: null
};

export function Upload() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateApplicationInput>(initialForm);
  const [files, setFiles] = useState(emptyFiles);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CreateApplicationInput>(
    field: K,
    value: CreateApplicationInput[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateFile(type: DocumentType, file: File | null) {
    setFiles((current) => ({
      ...current,
      [type]: file
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const application = await createApplicationWithDocuments(form, files);
      navigate(`/result/${application.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create application.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-paper">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
        <form className="border border-line bg-white p-7" onSubmit={handleSubmit}>
          <div className="border-l-[10px] border-gold pl-7">
            <p className="text-sm font-bold uppercase text-black">AI assisted review intake</p>
            <h1 className="mt-3 text-5xl font-bold leading-none text-black">Create review file</h1>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                <UserRound className="size-4 text-gold" aria-hidden="true" />
                Applicant name
              </span>
              <input
                className="h-12 w-full border border-line bg-white px-3 text-base text-black outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                value={form.applicantName}
                maxLength={100}
                required
                onChange={(event) => updateField('applicantName', event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                <Building2 className="size-4 text-gold" aria-hidden="true" />
                Employer
              </span>
              <input
                className="h-12 w-full border border-line bg-white px-3 text-base text-black outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                value={form.employerName}
                maxLength={150}
                required
                onChange={(event) => updateField('employerName', event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                <CircleDollarSign className="size-4 text-gold" aria-hidden="true" />
                Declared monthly income
              </span>
              <input
                className="h-12 w-full border border-line bg-white px-3 text-base text-black outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                type="number"
                min={1}
                step={1}
                value={form.declaredMonthlyIncome}
                required
                onChange={(event) => updateField('declaredMonthlyIncome', Number(event.target.value))}
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                <CircleDollarSign className="size-4 text-gold" aria-hidden="true" />
                Requested loan amount
              </span>
              <input
                className="h-12 w-full border border-line bg-white px-3 text-base text-black outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                type="number"
                min={1}
                step={1}
                value={form.requestedLoanAmount}
                required
                onChange={(event) => updateField('requestedLoanAmount', Number(event.target.value))}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-black">
                <MapPin className="size-4 text-gold" aria-hidden="true" />
                Address
              </span>
              <textarea
                className="min-h-28 w-full resize-y border border-line bg-white px-3 py-3 text-base text-black outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                value={form.address ?? ''}
                maxLength={1000}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </label>
          </div>

          <div className="mt-9 border-t border-line pt-7">
            <div className="border-l-[8px] border-gold pl-5">
              <p className="flex items-center gap-2 text-sm font-bold uppercase text-black">
                <FileCheck2 className="size-4 text-gold" aria-hidden="true" />
                Documents for AI review
              </p>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              {uploadFields.map((field) => (
                <FileUpload
                  key={field.type}
                  label={field.label}
                  accept={field.accept}
                  file={files[field.type]}
                  disabled={isSubmitting}
                  onFileChange={(file) => updateFile(field.type, file)}
                />
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 border-l-[6px] border-rose-600 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex justify-end">
            <button
              className="inline-flex h-12 min-w-48 items-center justify-center gap-3 border-b-4 border-gold bg-black px-5 text-base font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating' : 'Create AI review'}
              <ArrowRight className="size-4 text-gold" aria-hidden="true" />
            </button>
          </div>
        </form>

        <aside className="border border-line bg-white p-7 text-black">
          <div className="border-l-[6px] border-gold pl-5">
            <p className="text-xs font-bold uppercase text-black">AI review package</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-black">Ready for analysis</h2>
          </div>
          <dl className="mt-7 grid gap-4 text-base">
            <div className="border border-line bg-slate-50 px-4 py-3">
              <dt className="text-xs font-bold uppercase text-steel">Status</dt>
              <dd className="mt-1 font-bold text-gold">pending</dd>
            </div>
            <div className="border border-line bg-slate-50 px-4 py-3">
              <dt className="text-xs font-bold uppercase text-steel">Next step</dt>
              <dd className="mt-1 font-bold text-black">Rules, policy, and AI guidance</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
