import { LoaderCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 border border-dashed border-line bg-white px-4 text-base font-bold text-steel">
      <LoaderCircle className="size-5 animate-spin text-gold" aria-hidden="true" />
      {label}
    </div>
  );
}
