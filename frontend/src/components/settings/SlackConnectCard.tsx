import React, { useEffect, useState } from 'react';
import { slackApi } from '../../api/slack.api';
import { SlackStatus } from '../../types';
import { Button } from '../common/Button';
import { CheckCircle2, MessageSquare } from 'lucide-react';

export const SlackConnectCard: React.FC = () => {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await slackApi.getStatus();
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = slackApi.getConnectUrl();
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await slackApi.disconnect();
      await fetchStatus();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl animate-pulse h-20" />
    );
  }

  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Slack Alerts</h4>
            <p className="text-[11px] text-slate-500">Hourly limit alerts</p>
          </div>
        </div>

        {status?.connected ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Not connected</span>
        )}
      </div>

      {status?.connected ? (
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-slate-600 font-medium truncate max-w-[120px]">
            {status.teamName || 'Workspace'}
          </span>
          <button
            onClick={handleDisconnect}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium hover:underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-xs font-medium"
          onClick={handleConnect}
        >
          Connect Slack
        </Button>
      )}
    </div>
  );
};
