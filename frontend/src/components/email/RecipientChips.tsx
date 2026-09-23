import React from 'react';
import { X } from 'lucide-react';

export interface RecipientChipsProps {
  recipients: string[];
  onRemove: (index: number) => void;
  maxVisible?: number;
}

export const RecipientChips: React.FC<RecipientChipsProps> = ({
  recipients,
  onRemove,
  maxVisible = 15,
}) => {
  if (recipients.length === 0) return null;

  const visible = recipients.slice(0, maxVisible);
  const remaining = recipients.length - maxVisible;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Detected Recipients ({recipients.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
        {visible.map((email, idx) => (
          <span
            key={`${email}-${idx}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 shadow-2xs"
          >
            <span className="truncate max-w-[200px]">{email}</span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 bg-slate-200/70 rounded-md text-xs text-slate-600 font-medium">
            +{remaining} more
          </span>
        )}
      </div>
    </div>
  );
};
