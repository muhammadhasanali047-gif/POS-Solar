import React, { useEffect, useState } from 'react';
import { Settings, Users, Plus, Wifi, RefreshCw, Database, Shield, Cloud, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import api, { getOfflineQueue } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { User } from '../../types';
import { useSyncStore } from '../../stores/syncStore';

export const SettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('Solar123!');
  const [role, setRole] = useState<'ADMIN' | 'CEO' | 'MANAGER'>('MANAGER');

  // Reset Password Modal
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleOpenResetModal = (u: User) => {
    setSelectedUserForReset(u);
    setNewPassword('');
    setResetMsg(null);
    setShowResetModal(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsResetting(true);
    setResetMsg(null);
    try {
      const res = await api.post('/auth/reset-password', {
        email: selectedUserForReset.email,
        new_password: newPassword,
      });

      if (res.data?.success) {
        try {
          const roleKey = selectedUserForReset.role?.toLowerCase() || 'manager';
          localStorage.setItem(`solar_${roleKey}_custom_pwd`, newPassword);
        } catch {}

        setResetMsg(`Password for ${selectedUserForReset.full_name} updated successfully!`);
        setTimeout(() => {
          setShowResetModal(false);
          setResetMsg(null);
        }, 2000);
      } else {
        alert(res.data?.error || 'Failed to update password');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsResetting(false);
    }
  };

  const { isOnline, isSyncing, pendingCount, triggerSync, checkHealth } = useSyncStore();
  const offlineQueue = getOfflineQueue();

  // Firebase Cloud Database State
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [isCheckingFirebase, setIsCheckingFirebase] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseSyncMsg, setFirebaseSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadFirebaseStatus();
  }, []);

  const loadFirebaseStatus = async () => {
    setIsCheckingFirebase(true);
    try {
      const res = await api.get('/sync/firebase-status');
      if (res.data?.success) {
        setFirebaseStatus(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load Firebase status', e);
    } finally {
      setIsCheckingFirebase(false);
    }
  };

  const handlePushToFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseSyncMsg(null);
    try {
      const res = await api.post('/sync/firebase-sync-all');
      if (res.data?.success) {
        setFirebaseSyncMsg('Cloud master data sync completed successfully!');
        loadFirebaseStatus();
      }
    } catch (err: any) {
      setFirebaseSyncMsg(err.response?.data?.error || 'Failed to sync to Firebase');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data?.success) setUsers(res.data.data);
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/users', {
        email,
        full_name: fullName,
        password,
        role,
      });

      if (res.data?.success) {
        setShowAddUserModal(false);
        setEmail('');
        setFullName('');
        loadUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const userColumns: Column<User>[] = [
    {
      key: 'full_name',
      header: 'Staff Member',
      render: (u) => (
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{u.full_name}</p>
          <p className="text-[10px] text-gray-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (u) => {
        const variants: any = {
          ADMIN: 'danger',
          CEO: 'dealer',
          MANAGER: 'success',
        };
        return <Badge variant={variants[u.role] || 'default'}>{u.role}</Badge>;
      },
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (u) => <span>Lahore Head Office</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (u) => formatDate(u.created_at),
    },
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (u) => (
        <button
          type="button"
          onClick={() => handleOpenResetModal(u)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Change Password</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          System Administration & Multi-PC Offline Sync
        </h2>
      </div>

      {/* Offline Sync Diagnostics Widget */}
      <Card title="Multi-PC Offline Synchronization Engine" subtitle="Continuous background write-through sync status">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Network Status</span>
              <span className={`text-sm sm:text-base font-black ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isOnline ? '🟢 Connected (Hostinger Central DB)' : '🔴 Offline Mode'}
              </span>
            </div>
            <button
              onClick={checkHealth}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border text-gray-500 hover:text-gray-900 cursor-pointer"
              title="Ping central server"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">Pending Transactions</span>
              <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                {pendingCount} Records
              </span>
            </div>
            <button
              disabled={pendingCount === 0 || isSyncing}
              onClick={triggerSync}
              className="px-3 py-1.5 bg-solar-600 hover:bg-solar-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] text-gray-400 block uppercase">Local SQLite Store</span>
            <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white block">
              Encrypted (Active)
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">UUID write-through enabled</p>
          </div>
        </div>

        {offlineQueue.length > 0 && (
          <div className="border rounded-xl p-3 bg-amber-50/40 dark:bg-amber-950/20 text-xs">
            <p className="font-bold text-amber-800 dark:text-amber-300 mb-2">Pending FIFO Sync Queue:</p>
            <div className="space-y-1 font-mono text-[11px] text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto">
              {offlineQueue.map((q: any, idx: number) => (
                <div key={idx} className="flex justify-between py-1 border-b border-amber-100">
                  <span>{q.client_uuid} — {q.operation} {q.entity}</span>
                  <span>{q.client_timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Firebase Cloud Database (Firestore) Integration */}
      <Card
        title="Firebase Cloud Database (Firestore)"
        subtitle="Real-time cloud database backup & remote stock synchronization"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Cloud DB Status</span>
              <span className="text-sm sm:text-base font-black text-emerald-600 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {firebaseStatus?.connected ? 'LIVE & CONNECTED' : 'Checking...'}
              </span>
              <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                Project: <code className="text-solar-600 dark:text-solar-400 font-bold">{firebaseStatus?.projectId || 'alp-solar-pos'}</code>
              </p>
            </div>
            <button
              onClick={loadFirebaseStatus}
              disabled={isCheckingFirebase}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border text-gray-500 hover:text-gray-900 cursor-pointer"
              title="Refresh Firebase status"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingFirebase ? 'animate-spin text-solar-600' : ''}`} />
            </button>
          </div>

          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Firestore Collections</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                Products: {firebaseStatus?.counts?.products ?? 0}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-solar-100 dark:bg-solar-950/60 text-solar-800 dark:text-solar-300">
                Stock: {firebaseStatus?.counts?.inventory ?? 0}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                Customers: {firebaseStatus?.counts?.customers ?? 0}
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Cloud Master Sync</span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Push all local products, categories & stock to Firebase
              </p>
            </div>
            <button
              disabled={isSyncingFirebase}
              onClick={handlePushToFirebase}
              className="mt-2 w-full px-3 py-1.5 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSyncingFirebase ? 'Syncing to Cloud...' : 'Push All Data to Firebase'}</span>
            </button>
          </div>
        </div>

        {firebaseSyncMsg && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{firebaseSyncMsg}</span>
          </div>
        )}

        <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <span className="text-emerald-500 font-bold">●</span>
          <span>
            <strong>Dual-Write Active:</strong> Aap jab bhi naya product ya stock POS UI se add ya edit karenge, wo foran aapke Firebase Firestore me live save hoga.
          </span>
        </div>
      </Card>

      {/* User Management */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-solar-600" />
            <span>Authorized Staff Users (RBAC)</span>
          </h3>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-3 py-1.5 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Staff User</span>
          </button>
        </div>

        <DataTable
          data={users}
          columns={userColumns}
          isLoading={isLoading}
          searchPlaceholder="Search staff by name, email, role..."
          searchField={(u) => `${u.full_name} ${u.email} ${u.role}`}
        />
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Create Staff User"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Asif Ali"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Work Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@solarcompany.com"
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300">Access Role</label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-950 border rounded-xl font-bold"
            >
              <option value="MANAGER">Manager (Inventory, Purchases, Sales/POS, Shared Dealers)</option>
              <option value="CEO">CEO Portal (Executive Analytics & Shared Dealers)</option>
              <option value="ADMIN">Administrator (Full Unrestricted Access)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold rounded-xl shadow-md mt-2"
          >
            Create Staff Account
          </button>
        </form>
      </Modal>

      {/* Change / Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={`Change Password: ${selectedUserForReset?.full_name || 'Staff'}`}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-3.5 text-xs">
          {resetMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{resetMsg}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Target Account</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mt-0.5">
              {selectedUserForReset?.full_name} ({selectedUserForReset?.email})
            </span>
            <span className="text-[10px] text-solar-600 font-mono font-bold block mt-0.5">
              Role: {selectedUserForReset?.role}
            </span>
          </div>

          <div>
            <label className="font-bold text-gray-700 dark:text-gray-300 uppercase block mb-1">
              New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewPassword('Solar123!')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono font-bold hover:bg-slate-200"
            >
              Preset: Solar123!
            </button>
            <button
              type="button"
              onClick={() => setNewPassword('SolarPass2026!')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-mono font-bold hover:bg-slate-200"
            >
              Preset: SolarPass2026!
            </button>
          </div>

          <button
            type="submit"
            disabled={isResetting}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResetting ? (
              <span>Updating Password...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
};