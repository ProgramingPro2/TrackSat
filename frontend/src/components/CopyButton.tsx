import { useState } from 'react';
import { copyToClipboard } from '../utils/format';

interface CopyButtonProps {
  label: string;
  text: string;
  className?: string;
}

export function CopyButton({ label, text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 ${className}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
