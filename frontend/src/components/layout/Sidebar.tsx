import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SlackConnectCard } from '../settings/SlackConnectCard';
import { Button } from '../common/Button';
import {
  Clock,
  Send,
  Plus,
  Activity,
  LogOut,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export interface SidebarProps {
  onOpenCompose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCompose }) => {
  const { user, logout } = useAuth();

  const getQueueMonitorUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    return `${apiUrl.replace(/\/api\/?$/, '')}/admin/queues`;
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block">
              Outbox Labs
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              Email Scheduler
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Button (+ Compose) */}
      <div className="p-4 pb-2">
        <Button
          onClick={onOpenCompose}
          className="w-full py-2.5 text-sm font-semibold shadow-xs"
          icon={<Plus className="w-4 h-4" />}
        >
          Compose
        </Button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <NavLink
          to="/dashboard/scheduled"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Clock className="w-4 h-4" />
          <span>Scheduled</span>
        </NavLink>

        <NavLink
          to="/dashboard/sent"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Send className="w-4 h-4" />
          <span>Sent</span>
        </NavLink>

        <div className="pt-3 pb-1">
          <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Monitoring
          </div>
        </div>

        <a
          href={getQueueMonitorUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-brand-600" />
            <span>Queue Monitor</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            Bull Board
          </span>
        </a>

        {/* Slack Connection Card */}
        <div className="pt-4">
          <SlackConnectCard />
        </div>
      </nav>

      {/* User Profile Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-slate-800 truncate">
                {user?.name || 'User'}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {user?.email || ''}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
