import { CheckCircle2 } from 'lucide-react';

interface VerificationCardProps {
  title: string;
  value: string;
}

export function VerificationCard({ title, value }: VerificationCardProps) {
  return (
    <div className="border border-line bg-white px-5 py-4 shadow-[inset_5px_0_0_rgba(0,136,206,0.9)]">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-steel">
        <CheckCircle2 className="size-4 text-gold" aria-hidden="true" />
        {title}
      </div>
      <p className="mt-3 break-words text-lg font-bold leading-snug text-black">{value}</p>
    </div>
  );
}
