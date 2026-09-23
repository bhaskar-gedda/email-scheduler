import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { FileUploadArea } from '../components/email/FileUploadArea';
import { RecipientChips } from '../components/email/RecipientChips';
import { SenderModal } from '../components/settings/SenderModal';
import { sendersApi } from '../api/senders.api';
import { campaignsApi } from '../api/campaigns.api';
import { Sender } from '../types';
import { Plus, Send, Clock, AlertCircle } from 'lucide-react';

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onCampaignScheduled,
}) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>(() => {
    // Default to current time formatted for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // 1 min in future
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSenderModalOpen, setIsSenderModalOpen] = useState(false);

  const fetchSenders = async () => {
    try {
      const list = await sendersApi.list();
      setSenders(list);
      if (list.length > 0 && !selectedSenderId) {
        setSelectedSenderId(list[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSenders();
    }
  }, [isOpen]);

  const handleLeadsLoaded = (newEmails: string[]) => {
    // Merge new emails deduplicated
    const set = new Set([...recipients, ...newEmails]);
    setRecipients(Array.from(set));
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSenderId) {
      setError('Please select a sender for this campaign.');
      return;
    }
    if (recipients.length === 0) {
      setError('Please upload or add at least one valid recipient email.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject line is required.');
      return;
    }
    if (!body.trim()) {
      setError('Email body cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const delayBetweenMs = Math.max(500, Math.round(delaySeconds * 1000));
      const startDateTime = new Date(startTime).toISOString();

      await campaignsApi.create({
        senderId: selectedSenderId,
        subject: subject.trim(),
        body: body.trim(),
        startTime: startDateTime,
        delayBetweenEmails: delayBetweenMs,
        hourlyLimit,
        recipients,
      });

      // Reset form
      setSubject('');
      setBody('');
      setRecipients([]);
      onCampaignScheduled();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to schedule campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Schedule Email Campaign"
        description="Compose outreach email, upload recipient list, and configure rate throttling."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Sender Selector (Single Sender per campaign) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                From (Sender) *
              </label>
              <button
                type="button"
                onClick={() => setIsSenderModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Add Custom Sender</span>
              </button>
            </div>

            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
              required
            >
              {senders.length === 0 && <option value="">No senders available (add one)</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.email}) — {s.smtpHost}
                </option>
              ))}
            </select>
          </div>

          {/* 2. File Upload for Leads */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Recipients (CSV / Text Upload) *
            </label>
            <FileUploadArea onLeadsLoaded={handleLeadsLoaded} />
            <RecipientChips recipients={recipients} onRemove={handleRemoveRecipient} />
          </div>

          {/* 3. Subject Line */}
          <Input
            label="Subject *"
            placeholder="e.g. Quick question regarding Outbox Labs partnerships"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          {/* 4. Throttling and Timing Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <Input
                label="Start Time *"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Delay Between Sends"
                type="number"
                step="0.5"
                min="0.5"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseFloat(e.target.value) || 2)}
                helperText="Seconds per email"
              />
            </div>

            <div>
              <Input
                label="Hourly Limit"
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 200)}
                helperText="Max sends / hr"
              />
            </div>
          </div>

          {/* 5. Email Body Area */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Email Body *</label>
            <textarea
              rows={6}
              placeholder="Write your email outreach message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans leading-relaxed text-slate-800 placeholder:text-slate-400 resize-y"
              required
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'} ready to schedule
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={recipients.length === 0}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Schedule Campaign
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <SenderModal
        isOpen={isSenderModalOpen}
        onClose={() => setIsSenderModalOpen(false)}
        onSenderCreated={fetchSenders}
      />
    </>
  );
};
