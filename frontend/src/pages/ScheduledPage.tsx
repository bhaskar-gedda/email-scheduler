import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { EmailTable } from '../components/email/EmailTable';
import { emailsApi } from '../api/emails.api';
import { Email, Pagination } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { DashboardLayoutContextType } from '../components/layout/DashboardLayout';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ScheduledPage: React.FC = () => {
  const { searchQuery, refreshTrigger } = useOutletContext<DashboardLayoutContextType>();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });

  const fetchScheduled = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      if (debouncedSearch.trim()) {
        const searchResults = await emailsApi.search(debouncedSearch.trim());
        const filtered = searchResults;
        setEmails(filtered);
        setPagination({
          total: filtered.length,
          page: 1,
          pageSize: filtered.length || 20,
          totalPages: 1,
        });
      } else {
        const res = await emailsApi.getScheduled(page, 20);
        setEmails(res.data);
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load scheduled emails');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchScheduled(1);
  }, [fetchScheduled, refreshTrigger]);

  return (
    <div className="space-y-4">
      {/* Search status indicator */}
      {debouncedSearch.trim() && (
        <div className="text-xs text-slate-500">
          Showing search results for &ldquo;<span className="font-semibold text-slate-800">{debouncedSearch}</span>&rdquo; ({emails.length} found via Elasticsearch)
        </div>
      )}

      {/* Main Table */}
      <EmailTable
        emails={emails}
        loading={loading}
        error={error}
        onRefresh={() => fetchScheduled(pagination.page)}
        type="scheduled"
      />

      {/* Pagination Controls (when not searching) */}
      {!debouncedSearch.trim() && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} scheduled emails
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchScheduled(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchScheduled(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
