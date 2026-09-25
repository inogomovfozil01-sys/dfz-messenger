'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  Radio,
  Activity,
  History,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { UserRole, ReportStatus } from '@dfz/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'audit'>('users');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (!isLoading) {
      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)) {
        router.push('/');
      } else {
        loadData();
      }
    }
  }, [user, isLoading]);

  const loadData = async () => {
    const [metricsRes, usersRes, reportsRes, auditRes] = await Promise.all([
      apiRequest('/api/admin/metrics'),
      apiRequest('/api/admin/users'),
      apiRequest('/api/moderation/queue'),
      apiRequest('/api/admin/audit-logs'),
    ]);

    if (metricsRes.success) setMetrics(metricsRes.data);
    if (usersRes.success && usersRes.data) setUsersList(usersRes.data.items);
    if (reportsRes.success && reportsRes.data) setReports(reportsRes.data);
    if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
  };

  const handleBanUser = async (targetUserId: string) => {
    const reason = prompt('Причина блокировки:');
    if (!reason) return;
    const res = await apiRequest(`/api/admin/users/${targetUserId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (res.success) loadData();
  };

  const handleUnbanUser = async (targetUserId: string) => {
    const res = await apiRequest(`/api/admin/users/${targetUserId}/unban`, {
      method: 'POST',
    });
    if (res.success) loadData();
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    const res = await apiRequest(`/api/admin/users/${targetUserId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role: newRole }),
    });
    if (res.success) loadData();
  };

  const handleResolveReport = async (reportId: string, status: ReportStatus) => {
    const res = await apiRequest(`/api/moderation/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    if (res.success) loadData();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dfz-bg text-dfz-text text-sm">
        Загрузка панели управления...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dfz-bg text-dfz-text p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navbar */}
      <div className="flex items-center justify-between border-b border-dfz-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-dfz-md bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-dfz-text transition-colors"
            title="Назад к сообщениям"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-dfz-md bg-dfz-accent text-white">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold">DFZ Admin & Moderation</h1>
              <p className="text-xs text-dfz-text-muted">Центральная панель управления платформой</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono bg-dfz-surface px-3 py-1.5 rounded-dfz-md border border-dfz-border">
          <span className="flex items-center gap-1.5 text-dfz-success">
            <span className="w-2 h-2 rounded-full bg-dfz-success inline-block animate-pulse" />
            База данных: OK
          </span>
          <span className="text-dfz-text-muted">
            Uptime: {metrics ? `${Math.floor(metrics.serverUptimeSeconds / 60)} мин.` : '0'}
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-lg p-4 space-y-1 shadow-dfz-sm">
            <div className="flex items-center justify-between text-dfz-text-muted text-xs">
              <span>Всего пользователей</span>
              <Users size={16} />
            </div>
            <p className="text-2xl font-bold font-mono text-dfz-text">{metrics.totalUsers}</p>
            <span className="text-[11px] text-dfz-success">
              {metrics.activeUsers} активных сеансов
            </span>
          </div>

          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-lg p-4 space-y-1 shadow-dfz-sm">
            <div className="flex items-center justify-between text-dfz-text-muted text-xs">
              <span>Всего сообщений</span>
              <MessageSquare size={16} />
            </div>
            <p className="text-2xl font-bold font-mono text-dfz-text">{metrics.totalMessages}</p>
            <span className="text-[11px] text-dfz-text-muted">в {metrics.totalChats} чатах</span>
          </div>

          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-lg p-4 space-y-1 shadow-dfz-sm">
            <div className="flex items-center justify-between text-dfz-text-muted text-xs">
              <span>Группы и Каналы</span>
              <Radio size={16} />
            </div>
            <p className="text-2xl font-bold font-mono text-dfz-text">
              {metrics.groupChats + metrics.channelChats}
            </p>
            <span className="text-[11px] text-dfz-text-muted">
              {metrics.groupChats} групп, {metrics.channelChats} каналов
            </span>
          </div>

          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-lg p-4 space-y-1 shadow-dfz-sm">
            <div className="flex items-center justify-between text-dfz-text-muted text-xs">
              <span>Жалобы в очереди</span>
              <AlertTriangle size={16} className="text-dfz-warning" />
            </div>
            <p className="text-2xl font-bold font-mono text-dfz-warning">
              {metrics.pendingReports}
            </p>
            <span className="text-[11px] text-dfz-text-muted">требуют рассмотрения</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dfz-border pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-dfz-md text-xs font-semibold transition-colors ${
            activeTab === 'users'
              ? 'bg-dfz-accent text-white shadow-dfz-sm'
              : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
          }`}
        >
          <Users size={14} />
          <span>Пользователи</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-dfz-md text-xs font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'bg-dfz-accent text-white shadow-dfz-sm'
              : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Очередь модерации</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-dfz-md text-xs font-semibold transition-colors ${
            activeTab === 'audit'
              ? 'bg-dfz-accent text-white shadow-dfz-sm'
              : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
          }`}
        >
          <History size={14} />
          <span>Журнал аудита</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl overflow-hidden shadow-dfz-sm">
          <div className="p-3 border-b border-dfz-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-dfz-text">Список пользователей</h3>
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-md text-xs text-dfz-text focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dfz-bg text-dfz-text-muted uppercase text-[10px] font-semibold border-b border-dfz-border">
                <tr>
                  <th className="p-3">Пользователь</th>
                  <th className="p-3">Роль</th>
                  <th className="p-3">Активность</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dfz-border/50">
                {usersList
                  .filter((u) => u.username.toLowerCase().includes(searchUser.toLowerCase()))
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-dfz-surface-hover/50">
                      <td className="p-3">
                        <p className="font-semibold text-dfz-text">{u.displayName || u.username}</p>
                        <p className="text-[11px] text-dfz-text-muted">@{u.username} • {u.email || 'без email'}</p>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className="bg-dfz-bg border border-dfz-border rounded px-2 py-1 text-[11px] focus:outline-none"
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="p-3 text-dfz-text-muted">
                        {u.messagesCount} сообщ. • {u.chatsCount} чатов
                      </td>
                      <td className="p-3">
                        {u.isBanned ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dfz-danger/15 text-dfz-danger">
                            Заблокирован
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dfz-success/15 text-dfz-success">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {u.isBanned ? (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="px-2.5 py-1 text-xs text-dfz-success hover:bg-dfz-success/10 rounded transition-colors"
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(u.id)}
                            className="px-2.5 py-1 text-xs text-dfz-danger hover:bg-dfz-danger/10 rounded transition-colors"
                          >
                            Заблокировать
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Reports Queue */}
      {activeTab === 'reports' && (
        <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-4 shadow-dfz-sm space-y-3">
          <h3 className="text-xs font-semibold text-dfz-text">Жалобы пользователей</h3>
          {reports.length === 0 ? (
            <p className="text-xs text-dfz-text-muted p-4 text-center">Очередь жалоб пуста</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-dfz-danger">
                      Причина: {r.reason} (Цель: {r.targetType} {r.targetId})
                    </p>
                    <p className="text-dfz-text-muted">
                      Отправитель: @{r.reporter.username} • {r.comment || 'Без комментария'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveReport(r.id, ReportStatus.DISMISSED)}
                      className="px-2.5 py-1 bg-dfz-surface-hover hover:bg-dfz-border rounded text-[11px]"
                    >
                      Отклонить
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, ReportStatus.RESOLVED)}
                      className="px-2.5 py-1 bg-dfz-accent text-white rounded text-[11px] font-semibold"
                    >
                      Решено
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-4 shadow-dfz-sm space-y-3">
          <h3 className="text-xs font-semibold text-dfz-text">Журнал действий администраторов</h3>
          <div className="space-y-2 font-mono text-[11px]">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-md flex items-center justify-between"
              >
                <div>
                  <span className="text-dfz-accent font-semibold">{log.actor.username}</span>:{' '}
                  <span className="text-dfz-text">{log.action}</span> (цель: {log.target})
                </div>
                <span className="text-dfz-text-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
