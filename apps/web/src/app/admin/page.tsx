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
  Star,
  Gift,
  Diamond,
  Sparkles,
  Search,
  Plus,
  Send,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { UserRole, ReportStatus, GiftRarity } from '@dfz/types';
import { Avatar } from '../../components/ui/Avatar';
import { GiftArtwork } from '../../components/economy/GiftArtworks';

type AdminTab =
  | 'overview'
  | 'users'
  | 'economy'
  | 'gifts'
  | 'collectibles'
  | 'moderation'
  | 'audit';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [economyMetrics, setEconomyMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');

  // Selected User Administrative Profile state (Section 7)
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Economy Grant Form state
  const [grantTargetUser, setGrantTargetUser] = useState('');
  const [grantAmount, setGrantAmount] = useState('500');
  const [grantReason, setGrantReason] = useState('Community Reward');
  const [isGranting, setIsGranting] = useState(false);

  // Mass Campaign state
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignStars, setCampaignStars] = useState('100');
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

  // New Gift state
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftArtwork, setNewGiftArtwork] = useState('crystal');
  const [newGiftPrice, setNewGiftPrice] = useState('1000');
  const [newGiftRarity, setNewGiftRarity] = useState<GiftRarity>(GiftRarity.RARE);
  const [newGiftCategory, setNewGiftCategory] = useState('popular');
  const [newGiftIsLimited, setNewGiftIsLimited] = useState(false);
  const [newGiftSupply, setNewGiftSupply] = useState('500');

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
    const [metricsRes, ecoRes, usersRes, reportsRes, auditRes, giftsRes] = await Promise.all([
      apiRequest<any>('/api/admin/metrics'),
      apiRequest<any>('/api/economy/admin/metrics'),
      apiRequest<any>('/api/admin/users'),
      apiRequest<any>('/api/moderation/queue'),
      apiRequest<any>('/api/admin/audit-logs'),
      apiRequest<any>('/api/economy/gifts/catalog'),
    ]);

    if (metricsRes.success) setMetrics(metricsRes.data);
    if (ecoRes.success) setEconomyMetrics(ecoRes.data);
    if (usersRes.success && usersRes.data) setUsersList(usersRes.data.items);
    if (reportsRes.success && reportsRes.data) setReports(reportsRes.data);
    if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
    if (giftsRes.success && giftsRes.data) setGiftCatalog(giftsRes.data);
  };

  const handleSearchUsers = async (query: string) => {
    setSearchUser(query);
    const res = await apiRequest<any>(`/api/admin/users?search=${encodeURIComponent(query)}`);
    if (res.success && res.data) {
      setUsersList(res.data.items);
    }
  };

  const openUserProfile = async (userId: string) => {
    setIsLoadingProfile(true);
    const res = await apiRequest<any>(`/api/admin/users/${userId}`);
    setIsLoadingProfile(false);
    if (res.success && res.data) {
      setSelectedAdminUser(res.data);
    }
  };

  const handleBanUser = async (targetUserId: string) => {
    const reason = prompt('Причина блокировки:');
    if (!reason) return;
    const res = await apiRequest(`/api/admin/users/${targetUserId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (res.success) {
      loadData();
      if (selectedAdminUser?.general.id === targetUserId) openUserProfile(targetUserId);
    }
  };

  const handleUnbanUser = async (targetUserId: string) => {
    const res = await apiRequest(`/api/admin/users/${targetUserId}/unban`, {
      method: 'POST',
    });
    if (res.success) {
      loadData();
      if (selectedAdminUser?.general.id === targetUserId) openUserProfile(targetUserId);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) return;
    const res = await apiRequest(`/api/admin/users/${targetUserId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role: newRole }),
    });
    if (res.success) {
      loadData();
      if (selectedAdminUser?.general.id === targetUserId) openUserProfile(targetUserId);
    } else {
      alert(res.error?.message || 'Ошибка смены роли');
    }
  };

  const handleGrantStars = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTargetUser.trim()) return;

    setIsGranting(true);
    // Find user by clean username
    const cleanUser = grantTargetUser.trim().replace(/^@/, '');
    const userRes = await apiRequest<any>(`/api/users/profile/${cleanUser}`);
    if (!userRes.success || !userRes.data) {
      setIsGranting(false);
      alert('Пользователь не найден');
      return;
    }

    const res = await apiRequest('/api/economy/admin/stars/grant', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: userRes.data.id,
        amount: parseInt(grantAmount, 10),
        reason: grantReason,
      }),
    });
    setIsGranting(false);
    if (res.success) {
      alert(`★ ${grantAmount} Stars успешно начислены @${cleanUser}`);
      setGrantTargetUser('');
      loadData();
    } else {
      alert(res.error?.message || 'Ошибка начисления Stars');
    }
  };

  const handleCreateGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/api/economy/admin/gifts', {
      method: 'POST',
      body: JSON.stringify({
        name: newGiftName,
        artwork: newGiftArtwork,
        priceStars: parseInt(newGiftPrice, 10),
        rarity: newGiftRarity,
        category: newGiftCategory,
        isLimited: newGiftIsLimited,
        totalSupply: newGiftIsLimited ? parseInt(newGiftSupply, 10) : null,
      }),
    });
    if (res.success) {
      alert('Подарок успешно создан в каталоге!');
      setNewGiftName('');
      loadData();
    } else {
      alert(res.error?.message || 'Ошибка создания подарка');
    }
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
    <div className="min-h-screen bg-dfz-bg text-dfz-text flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-dfz-border/80 bg-dfz-surface/60 backdrop-blur-lg px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-dfz-xl bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-dfz-text transition-colors"
            title="Назад к сообщениям"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-dfz-xl bg-dfz-accent text-white shadow-sm">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-dfz-text">DFZ Administration</h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-dfz-text-muted">
                Управление экономикой, пользователями, подарками и модерацией
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-dfz-xl text-amber-300">
            <span className="text-sm font-bold">★ ∞</span>
            <span className="text-[11px] hidden sm:inline text-amber-400/80">Admin Stars</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 bg-dfz-surface px-3 py-1.5 rounded-dfz-xl border border-dfz-border">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Database: OK</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="border-b border-dfz-border/60 bg-dfz-surface/30 px-6 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          { id: 'overview', label: 'Обзор', icon: <Activity size={14} /> },
          { id: 'users', label: 'Пользователи', icon: <Users size={14} /> },
          { id: 'economy', label: 'Stars и Экономика', icon: <Star size={14} className="text-amber-400" /> },
          { id: 'gifts', label: 'Подарки', icon: <Gift size={14} className="text-purple-400" /> },
          { id: 'collectibles', label: 'Коллекции & NFT', icon: <Diamond size={14} className="text-cyan-400" /> },
          { id: 'moderation', label: 'Модерация', icon: <AlertTriangle size={14} className="text-rose-400" /> },
          { id: 'audit', label: 'Аудит-лог', icon: <History size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-dfz-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-dfz-accent text-white shadow-sm font-bold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Real Economy Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <span className="text-[11px] text-dfz-text-muted block">Stars в обращении</span>
                <p className="text-2xl font-mono font-extrabold text-amber-300">
                  ★ {economyMetrics?.starsInCirculation?.toLocaleString() || 0}
                </p>
                <span className="text-[10px] text-dfz-text-muted">на счетах пользователей</span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <span className="text-[11px] text-dfz-text-muted block">Stars выдано сегодня</span>
                <p className="text-2xl font-mono font-extrabold text-emerald-400">
                  +★ {economyMetrics?.starsIssuedToday?.toLocaleString() || 0}
                </p>
                <span className="text-[10px] text-dfz-text-muted">
                  награды и админ-гранты
                </span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <span className="text-[11px] text-dfz-text-muted block">Stars переведено сегодня</span>
                <p className="text-2xl font-mono font-extrabold text-cyan-400">
                  ★ {economyMetrics?.starsTransferredToday?.toLocaleString() || 0}
                </p>
                <span className="text-[10px] text-dfz-text-muted">между пользователями</span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <span className="text-[11px] text-dfz-text-muted block">DFZ Premium подписчики</span>
                <p className="text-2xl font-mono font-extrabold text-violet-400">
                  ◆ {economyMetrics?.premiumUsersCount || 0}
                </p>
                <span className="text-[10px] text-dfz-text-muted">активных подписчиков</span>
              </div>
            </div>

            {/* General System Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <div className="flex justify-between items-center text-dfz-text-muted text-xs">
                  <span>Пользователи</span>
                  <Users size={15} />
                </div>
                <p className="text-2xl font-mono font-bold text-dfz-text">
                  {metrics?.totalUsers || 0}
                </p>
                <span className="text-[11px] text-emerald-400">
                  {metrics?.activeUsers || 0} активных сеансов
                </span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <div className="flex justify-between items-center text-dfz-text-muted text-xs">
                  <span>Всего сообщений</span>
                  <MessageSquare size={15} />
                </div>
                <p className="text-2xl font-mono font-bold text-dfz-text">
                  {metrics?.totalMessages || 0}
                </p>
                <span className="text-[11px] text-dfz-text-muted">
                  в {metrics?.totalChats || 0} чатах
                </span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <div className="flex justify-between items-center text-dfz-text-muted text-xs">
                  <span>Подарков отправлено</span>
                  <Gift size={15} className="text-purple-400" />
                </div>
                <p className="text-2xl font-mono font-bold text-purple-300">
                  {economyMetrics?.giftsSentTotal || 0}
                </p>
                <span className="text-[11px] text-dfz-text-muted">
                  {economyMetrics?.giftsSentToday || 0} за сегодня
                </span>
              </div>

              <div className="p-4 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-1">
                <div className="flex justify-between items-center text-dfz-text-muted text-xs">
                  <span>Жалобы в очереди</span>
                  <AlertTriangle size={15} className="text-rose-400" />
                </div>
                <p className="text-2xl font-mono font-bold text-rose-400">
                  {metrics?.pendingReports || 0}
                </p>
                <span className="text-[11px] text-dfz-text-muted">требуют проверки</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Users Tab (Section 6, 7) */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-dfz-text-muted" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Поиск по имени, @username или ID..."
                className="w-full pl-9 pr-4 py-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-dfz-accent"
              />
            </div>

            {/* Users Table */}
            <div className="rounded-dfz-2xl bg-dfz-surface border border-dfz-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-dfz-bg/50 border-b border-dfz-border text-[11px] text-dfz-text-muted uppercase">
                  <tr>
                    <th className="py-3 px-4">Пользователь</th>
                    <th className="py-3 px-3">Роль</th>
                    <th className="py-3 px-3">Stars</th>
                    <th className="py-3 px-3">Статус</th>
                    <th className="py-3 px-3">Регистрация</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dfz-border/50">
                  {usersList.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-dfz-surface-hover/60 transition-colors cursor-pointer"
                      onClick={() => openUserProfile(u.id)}
                    >
                      <td className="py-3 px-4 flex items-center gap-3">
                        <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-dfz-text">
                            <span>{u.displayName || u.username}</span>
                            {u.isPremium && (
                              <span className="text-[9px] px-1 rounded bg-violet-500/20 text-violet-400 font-bold">
                                ◆
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-dfz-text-muted">@{u.username}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === UserRole.SUPERADMIN
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : u.role === UserRole.ADMIN
                              ? 'bg-dfz-accent/20 text-dfz-accent border border-dfz-accent/30'
                              : u.role === UserRole.MODERATOR
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-dfz-bg text-dfz-text-muted'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {u.isUnlimitedStars ? '★ ∞' : `★ ${u.starBalance?.toLocaleString() || 0}`}
                      </td>

                      <td className="py-3 px-3">
                        {u.isBanned ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                            Заблокирован
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            Активен
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-dfz-text-muted">
                        {new Date(u.createdAt).toLocaleDateString('ru')}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openUserProfile(u.id)}
                          className="px-2.5 py-1 rounded-dfz-lg bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-dfz-text font-medium text-[11px]"
                        >
                          Профиль →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Economy & Stars Tab (Section 13, 15) */}
        {activeTab === 'economy' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
            {/* Give Stars Card */}
            <div className="p-5 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-dfz-xl bg-amber-500/20 text-amber-400">
                  <Star size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-dfz-text">Выдать Stars пользователю</h3>
                  <p className="text-[11px] text-dfz-text-muted">
                    Административное прямое начисление Stars с записью в реестр
                  </p>
                </div>
              </div>

              <form onSubmit={handleGrantStars} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Получатель (@username)</label>
                  <input
                    type="text"
                    value={grantTargetUser}
                    onChange={(e) => setGrantTargetUser(e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Количество Stars</label>
                  <input
                    type="number"
                    min="1"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Основание / Причина</label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="Contest award, bug bounty, etc."
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGranting}
                  className="w-full py-2.5 rounded-dfz-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Send size={13} />
                  <span>{isGranting ? 'Начисление...' : `Начислить ★ ${grantAmount} Stars`}</span>
                </button>
              </form>
            </div>

            {/* Mass Campaign Card (Section 15) */}
            <div className="p-5 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-dfz-xl bg-cyan-500/20 text-cyan-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-dfz-text">Массовая кампания наград</h3>
                  <p className="text-[11px] text-dfz-text-muted">
                    Контролируемая раздача Stars по когорте пользователей
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Название кампании</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="Новогодний бонус сообществу"
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Stars на одного пользователя</label>
                  <input
                    type="number"
                    min="1"
                    value={campaignStars}
                    onChange={(e) => setCampaignStars(e.target.value)}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-mono font-bold"
                  />
                </div>

                <div className="p-3 rounded-dfz-lg bg-dfz-bg text-[11px] text-dfz-text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Получателей:</span>
                    <span className="font-bold text-dfz-text">{usersList.length} пользователей</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Итого к эмиссии:</span>
                    <span className="font-mono font-bold text-amber-400">
                      ★ {(parseInt(campaignStars, 10) * usersList.length).toLocaleString()} Stars
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!campaignTitle.trim()) return alert('Укажите название');
                    if (!confirm(`Запустить кампанию "${campaignTitle}" на ${usersList.length} пользователей?`)) return;
                    setIsSubmittingCampaign(true);
                    const res = await apiRequest('/api/economy/admin/campaign', {
                      method: 'POST',
                      body: JSON.stringify({
                        title: campaignTitle,
                        starsPerUser: parseInt(campaignStars, 10),
                        recipientIds: usersList.map((u) => u.id),
                      }),
                    });
                    setIsSubmittingCampaign(false);
                    if (res.success) {
                      alert('Кампания успешно завершена! Stars зачислены.');
                      setCampaignTitle('');
                      loadData();
                    } else {
                      alert(res.error?.message || 'Ошибка запуска кампании');
                    }
                  }}
                  disabled={isSubmittingCampaign}
                  className="w-full py-2.5 rounded-dfz-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>{isSubmittingCampaign ? 'Выполнение...' : 'Запустить кампанию'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Gifts Management Tab (Section 50) */}
        {activeTab === 'gifts' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Create Gift Form */}
            <div className="p-5 rounded-dfz-2xl bg-dfz-surface border border-dfz-border space-y-4">
              <h3 className="font-bold text-sm text-dfz-text">Создать новый подарок в каталог</h3>
              <form onSubmit={handleCreateGift} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-dfz-text-muted block mb-1">Название</label>
                  <input
                    type="text"
                    value={newGiftName}
                    onChange={(e) => setNewGiftName(e.target.value)}
                    placeholder="Quantum Blade"
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-dfz-text-muted block mb-1">Артворк</label>
                  <select
                    value={newGiftArtwork}
                    onChange={(e) => setNewGiftArtwork(e.target.value)}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                  >
                    <option value="crystal">Crystal</option>
                    <option value="rose">Rose</option>
                    <option value="heart">Heart</option>
                    <option value="rocket">Rocket</option>
                    <option value="crown">Crown</option>
                    <option value="dragon">Dragon</option>
                    <option value="phoenix">Phoenix</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-dfz-text-muted block mb-1">Цена в Stars</label>
                  <input
                    type="number"
                    min="1"
                    value={newGiftPrice}
                    onChange={(e) => setNewGiftPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-dfz-text-muted block mb-1">Редкость</label>
                  <select
                    value={newGiftRarity}
                    onChange={(e) => setNewGiftRarity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGENDARY">LEGENDARY</option>
                    <option value="MYTHIC">MYTHIC</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    checked={newGiftIsLimited}
                    onChange={(e) => setNewGiftIsLimited(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span className="font-semibold text-dfz-text">Лимитированный тираж</span>
                </div>

                {newGiftIsLimited && (
                  <div>
                    <label className="text-[11px] text-dfz-text-muted block mb-1">Тираж (Supply)</label>
                    <input
                      type="number"
                      min="1"
                      value={newGiftSupply}
                      onChange={(e) => setNewGiftSupply(e.target.value)}
                      className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-mono"
                    />
                  </div>
                )}

                <div className="sm:col-span-3 pt-2">
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-dfz-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
                  >
                    + Добавить подарок в каталог
                  </button>
                </div>
              </form>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {giftCatalog.map((g) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border flex flex-col items-center text-center space-y-1.5"
                >
                  <GiftArtwork name={g.artwork} size={48} />
                  <h4 className="font-bold text-xs text-dfz-text truncate w-full">{g.name}</h4>
                  <span className="font-mono text-amber-400 font-bold text-xs">
                    ★ {g.priceStars.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-dfz-text-muted">
                    {g.isLimited ? `Тираж: ${g.soldCount} / ${g.totalSupply}` : 'Безлимит'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Moderation Queue Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {reports.length === 0 ? (
              <div className="p-12 text-center text-xs text-dfz-text-muted">
                Очередь жалоб пуста. Платформа работает чисто!
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-dfz-xl bg-dfz-surface border border-dfz-border flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-400">[{rep.reason}]</span>
                        <span className="text-xs text-dfz-text-muted">
                          Цель: {rep.targetType} ({rep.targetId})
                        </span>
                      </div>
                      {rep.comment && (
                        <p className="text-xs text-dfz-text mt-1 italic">"{rep.comment}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveReport(rep.id, ReportStatus.RESOLVED)}
                        className="px-2.5 py-1 rounded-dfz-lg bg-emerald-500/20 text-emerald-400 font-semibold text-xs hover:bg-emerald-500/30"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, ReportStatus.DISMISSED)}
                        className="px-2.5 py-1 rounded-dfz-lg bg-dfz-surface-hover text-dfz-text-muted font-semibold text-xs hover:text-dfz-text"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. Audit Logs Tab (Section 67) */}
        {activeTab === 'audit' && (
          <div className="rounded-dfz-2xl bg-dfz-surface border border-dfz-border overflow-hidden animate-in fade-in duration-150">
            <table className="w-full text-left text-xs">
              <thead className="bg-dfz-bg/50 border-b border-dfz-border text-[11px] text-dfz-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Администратор</th>
                  <th className="py-3 px-3">Действие</th>
                  <th className="py-3 px-3">Цель</th>
                  <th className="py-3 px-3">Детали</th>
                  <th className="py-3 px-4 text-right">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dfz-border/50">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dfz-surface-hover/50">
                    <td className="py-2.5 px-4 font-bold text-dfz-text">
                      @{log.actor?.username || 'system'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs text-cyan-400 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-dfz-text-muted font-mono text-[11px]">
                      {log.target}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-dfz-text max-w-xs truncate">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                    <td className="py-2.5 px-4 text-right text-dfz-text-muted">
                      {new Date(log.createdAt).toLocaleTimeString('ru')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Collectibles Admin Tab */}
        {activeTab === 'collectibles' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-dfz-2xl bg-gradient-to-br from-indigo-900/30 to-dfz-surface border border-indigo-500/30 text-xs">
              <h3 className="font-bold text-sm text-dfz-text">Архитектура Collectibles & NFT</h3>
              <p className="text-dfz-text-muted mt-1 leading-relaxed">
                Коллекционные артефакты функционируют по модульной off-chain модели внутри платформы с
                неизменяемой историей смены владельцев (Provenance). В будущем интерфейс может быть
                переключен на BlockchainCollectibleProvider без переписывания пользовательского UI.
              </p>
            </div>
          </div>
        )}

        {/* Administrative User Profile Drawer / Modal (Section 7) */}
        {selectedAdminUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-dfz-2xl bg-dfz-surface border border-dfz-border p-6 space-y-5 shadow-2xl text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-dfz-border pb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedAdminUser.general.avatarUrl}
                    name={selectedAdminUser.general.displayName}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-dfz-text">
                        {selectedAdminUser.general.displayName}
                      </h3>
                      {selectedAdminUser.premium.isPremium && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-400 font-bold">
                          ◆
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dfz-text-muted">
                      @{selectedAdminUser.general.username} • ID: {selectedAdminUser.general.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAdminUser(null)}
                  className="p-1.5 rounded-dfz-lg hover:bg-dfz-surface-hover text-dfz-text-muted"
                >
                  ✕
                </button>
              </div>

              {/* General & Account */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border">
                  <span className="text-[10px] text-dfz-text-muted block">Роль</span>
                  <span className="font-bold text-dfz-text">{selectedAdminUser.general.role}</span>
                </div>
                <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border">
                  <span className="text-[10px] text-dfz-text-muted block">Баланс Stars</span>
                  <span className="font-bold font-mono text-amber-400">
                    {selectedAdminUser.stars.isUnlimited ? '★ ∞' : `★ ${selectedAdminUser.stars.balance}`}
                  </span>
                </div>
                <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border">
                  <span className="text-[10px] text-dfz-text-muted block">Сообщений</span>
                  <span className="font-bold text-dfz-text">
                    {selectedAdminUser.account.messagesCount}
                  </span>
                </div>
                <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border">
                  <span className="text-[10px] text-dfz-text-muted block">Статус</span>
                  <span
                    className={`font-bold ${
                      selectedAdminUser.account.isBanned ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedAdminUser.account.isBanned ? 'Блокирован' : 'Активен'}
                  </span>
                </div>
              </div>

              {/* Administrative Actions Bar */}
              <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border space-y-2">
                <span className="font-bold text-dfz-text block">Административные действия</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const amt = prompt('Сколько Stars начислить?');
                      if (!amt) return;
                      const reason = prompt('Причина:');
                      if (!reason) return;
                      await apiRequest('/api/economy/admin/stars/grant', {
                        method: 'POST',
                        body: JSON.stringify({
                          targetUserId: selectedAdminUser.general.id,
                          amount: parseInt(amt, 10),
                          reason,
                        }),
                      });
                      openUserProfile(selectedAdminUser.general.id);
                    }}
                    className="px-2.5 py-1.5 rounded-dfz-lg bg-amber-500/20 text-amber-400 font-semibold hover:bg-amber-500/30"
                  >
                    + Выдать Stars
                  </button>

                  <button
                    onClick={async () => {
                      const dur = prompt('Срок (1d, 7d, 30d, 90d, 1y, lifetime):', '30d');
                      if (!dur) return;
                      await apiRequest('/api/economy/admin/premium/grant', {
                        method: 'POST',
                        body: JSON.stringify({
                          targetUserId: selectedAdminUser.general.id,
                          duration: dur,
                          reason: 'Admin Panel Action',
                        }),
                      });
                      openUserProfile(selectedAdminUser.general.id);
                    }}
                    className="px-2.5 py-1.5 rounded-dfz-lg bg-cyan-500/20 text-cyan-400 font-semibold hover:bg-cyan-500/30"
                  >
                    ◆ Выдать Premium
                  </button>

                  {selectedAdminUser.account.isBanned ? (
                    <button
                      onClick={() => handleUnbanUser(selectedAdminUser.general.id)}
                      className="px-2.5 py-1.5 rounded-dfz-lg bg-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/30"
                    >
                      Разблокировать
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBanUser(selectedAdminUser.general.id)}
                      className="px-2.5 py-1.5 rounded-dfz-lg bg-rose-500/20 text-rose-400 font-semibold hover:bg-rose-500/30"
                    >
                      Заблокировать
                    </button>
                  )}

                  <select
                    value={selectedAdminUser.general.role}
                    onChange={(e) => handleChangeRole(selectedAdminUser.general.id, e.target.value)}
                    className="px-2 py-1 rounded-dfz-lg bg-dfz-surface border border-dfz-border text-dfz-text"
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </div>
              </div>

              {/* Audit History Targeting this user */}
              <div className="space-y-1.5">
                <span className="font-bold text-dfz-text">История изменений (Аудит)</span>
                <div className="p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border space-y-1 max-h-36 overflow-y-auto">
                  {selectedAdminUser.auditHistory?.length === 0 ? (
                    <p className="text-dfz-text-muted text-[11px]">Записей аудита нет</p>
                  ) : (
                    selectedAdminUser.auditHistory?.map((a: any) => (
                      <div key={a.id} className="flex justify-between text-[11px] py-0.5 border-b border-dfz-border/30 last:border-0">
                        <span className="font-mono text-cyan-400">{a.action}</span>
                        <span className="text-dfz-text-muted">by @{a.actorUsername}</span>
                        <span className="text-dfz-text-muted">{new Date(a.createdAt).toLocaleDateString('ru')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
