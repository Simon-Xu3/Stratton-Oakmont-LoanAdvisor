import { ArrowRight, BadgeCheck, FileSearch, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { label: 'Capture application details', icon: FileSearch },
  { label: 'Check applicant information', icon: BadgeCheck },
  { label: 'Prepare for review', icon: Landmark }
];

export function Home() {
  return (
    <main className="bg-paper">
      <section className="border-b border-line bg-slate-100">
        <div className="mx-auto grid min-h-[420px] w-full max-w-7xl items-end gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
          <div className="border-l-[10px] border-gold pl-7">
            <p className="text-sm font-bold uppercase text-black">Loan operations</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-none text-black sm:text-6xl">
              Document verification for credit intake
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-normal leading-8 text-steel">
              A focused workspace for capturing borrower information and preparing loan files for
              document completeness, income consistency, and manual review.
            </p>
            <Link
              className="mt-8 inline-flex h-12 items-center gap-3 border-b-4 border-gold bg-black px-5 text-base font-bold text-white transition hover:bg-zinc-800"
              to="/upload"
            >
              Start verification
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="bg-black p-7 text-white">
            <p className="text-sm font-bold uppercase text-white">Verification workflow</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white">From intake to review</h2>
            <div className="mt-6 grid gap-5">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <div className="border-l-2 border-gold pl-5" key={step.label}>
                    <Icon className="mb-2 size-5 text-gold" aria-hidden="true" />
                    <span className="text-xl font-bold leading-tight text-white">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="border-l-[10px] border-gold pl-7">
          <h2 className="text-5xl font-bold leading-none text-black">Built for loan pre-screening</h2>
          <p className="mt-7 max-w-5xl text-xl leading-8 text-steel">
            The system helps reviewers capture a loan request, preserve the application record, and
            prepare the file for document checks, income verification, policy evidence, and
            escalation when a manual decision is needed.
          </p>
        </div>
      </section>
    </main>
  );
}
