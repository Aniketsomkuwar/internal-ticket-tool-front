'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export function CopyButton({ textToCopy, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className={className ?? 'h-7 text-xs px-2.5 font-mono flex items-center gap-1'}
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-400" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3 text-fg-subtle" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
