import { FileUp } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  disabled?: boolean;
}

export function FileUpload({ label, accept, disabled = false }: FileUploadProps) {
  return (
    <label className="block border border-dashed border-line bg-white px-4 py-3 text-sm">
      <span className="flex items-center gap-2 font-bold text-black">
        <FileUp className="size-4 text-gold" aria-hidden="true" />
        {label}
      </span>
      <input className="mt-3 w-full text-sm" type="file" accept={accept} disabled={disabled} />
    </label>
  );
}
