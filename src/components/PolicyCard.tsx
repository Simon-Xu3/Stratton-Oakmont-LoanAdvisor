import { BookOpen } from 'lucide-react';

interface PolicyCardProps {
  title: string;
  body: string;
}

export function PolicyCard({ title, body }: PolicyCardProps) {
  return (
    <div className="rounded-md border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <BookOpen className="size-4 text-plum" aria-hidden="true" />
        {title}
      </div>
      <p className="mt-2 text-sm text-slate-700">{body}</p>
    </div>
  );
}
