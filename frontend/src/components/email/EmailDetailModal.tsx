import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Email } from '../../types';
import { ExternalLink, Clock, Calendar } from 'lucide-react';

export interface EmailDetailModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, isOpen, onClose }) => {
  if (!email) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Details" maxWidth="lg">
      <div className="space-y-4 text-sm">
        {/* Header Metadata */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <Badge status={email.status} />
          {email.etherealMessageUrl && (
            <a
              href={email.etherealMessageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-md transition-colors"
            >
              <span>View in Ethereal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Sender & Recipient */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">To (Recipient)</span>
            <span className="font-medium text-slate-800 break-all">{email.recipient}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">From (Sender)</span>
            <span className="font-medium text-slate-800 break-all">
              {email.sender?.displayName ? `${email.sender.displayName} <${email.sender.email}>` : 'Default Sender'}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Scheduled: {new Date(email.scheduledAt).toLocaleString()}</span>
          </div>
          {email.sentAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sent: {new Date(email.sentAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Failure reason if any */}
        {email.failureReason && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            <span className="font-semibold block mb-0.5">Failure Reason:</span>
            {email.failureReason}
          </div>
        )}

        {/* Subject */}
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Subject
          </span>
          <p className="text-slate-800 font-medium text-sm p-2.5 bg-slate-50 rounded-lg">
            {email.subject}
          </p>
        </div>

        {/* Body */}
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Message Content
          </span>
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-slate-700 whitespace-pre-wrap font-sans text-xs max-h-60 overflow-y-auto leading-relaxed">
            {email.body}
          </div>
        </div>
      </div>
    </Modal>
  );
};
