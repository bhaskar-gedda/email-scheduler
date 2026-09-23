import React, { useState } from 'react';
import { Email } from '../../types';
import { Badge } from '../common/Badge';
import { EmailDetailModal } from './EmailDetailModal';
import { ExternalLink, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

export interface EmailTableProps {
  emails: Email[];
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  type: 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  loading,
  error,
  onRefresh,
  type,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="space-y-1 w-full">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3.5 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-200 rounded w-20" />
              <div className="h-6 bg-slate-200 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-800">Failed to load emails</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
        {onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
          <Inbox className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-800">
            No {type === 'scheduled' ? 'scheduled' : 'sent'} emails found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {type === 'scheduled'
              ? 'Schedule a campaign by clicking the "+ Compose" button in the sidebar.'
              : 'Emails will appear here once they have been delivered by the background worker.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">{type === 'scheduled' ? 'Scheduled At' : 'Sent At'}</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emails.map((email) => (
                <tr
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {email.recipient.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[200px]">{email.recipient}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="truncate block max-w-[240px] text-slate-700">
                      {email.subject}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {type === 'scheduled'
                      ? new Date(email.scheduledAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : email.sentAt
                      ? new Date(email.sentAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <Badge status={email.status} />
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {email.etherealMessageUrl && (
                        <a
                          href={email.etherealMessageUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Ethereal Preview"
                          className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline ml-1"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EmailDetailModal
        email={selectedEmail}
        isOpen={Boolean(selectedEmail)}
        onClose={() => setSelectedEmail(null)}
      />
    </>
  );
};
