import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { sendersApi, CreateSenderPayload } from '../../api/senders.api';

export interface SenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSenderCreated: () => void;
}

export const SenderModal: React.FC<SenderModalProps> = ({ isOpen, onClose, onSenderCreated }) => {
  const [formData, setFormData] = useState<CreateSenderPayload>({
    email: '',
    displayName: '',
    smtpHost: 'smtp.ethereal.email',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.displayName || !formData.smtpHost) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await sendersApi.create(formData);
      onSenderCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create sender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Email Sender"
      description="Configure sender email and optional custom SMTP credentials"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Display Name *"
          placeholder="e.g. Sarah Connor"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          required
        />

        <Input
          label="Sender Email Address *"
          type="email"
          placeholder="e.g. sarah@outboxlabs.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            SMTP Settings (Defaults to Ethereal)
          </span>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="col-span-2">
              <Input
                label="SMTP Host"
                value={formData.smtpHost}
                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Port"
                type="number"
                value={formData.smtpPort}
                onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Input
              label="SMTP Username (optional)"
              placeholder="Leave blank for auto-Ethereal"
              value={formData.smtpUser}
              onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
            />
            <Input
              label="SMTP Password (optional)"
              type="password"
              placeholder="Leave blank for auto-Ethereal"
              value={formData.smtpPassword}
              onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Sender
          </Button>
        </div>
      </form>
    </Modal>
  );
};
