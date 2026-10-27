import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  RotateCcw,
  Save,
  Search,
  Filter,
  Users,
  ChevronDown,
  Layers,
  Crown,
  Briefcase,
  Wallet,
  Zap,
  Info,
  Link2,
  Copy,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import {
  useAccessStore,
  ALL_TAB_DEFINITIONS,
  TabDefinition,
  UserRole,
} from '../../stores/accessStore';
import { useAuthStore } from '../../stores/authStore';

const ROLES_LIST: { id: UserRole; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { id: 'CEO', label: 'CEO', icon: Crown, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'MANAGER', label: 'Manager', icon: Briefcase, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'CASHIER', label: 'Cashier', icon: Wallet, color: 'bg-sky-100 text-sky-800 border-sky-300' },
];

export const AccessPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    permissions,
    isLoading,
    isSaving,
    fetchPermissions,
    updatePermissions,
    toggleRoleForTab,
    setRolesForTab,
    resetToDefaults,
  } = useAccessStore();

  const [localPermissions, setLocalPermissions] = useState<Record<string, string[]>>({});
  const [activeDropdownTab, setActiveDropdownTab] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedRole, setCopiedRole] = useState<'admin' | 'manager' | null>(null);

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const adminPortalUrl = `${origin}/?role=admin`;
  const managerPortalUrl = `${origin}/?role=manager`;

  const handleCopyLink = async (url: string, role: 'admin' | 'manager') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2500);
    } catch (err) {
      console.error('Failed to copy portal URL:', err);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const handleToggle = (tabKey: string, role: string) => {
    const cur = localPermissions[tabKey] || ['ADMIN'];
    let next: string[];
    if (cur.includes(role)) {
      if (role === 'ADMIN') return;
      next = cur.filter((r) => r !== role);
    } else {
      next = [...cur, role];
    }
    setLocalPermissions((prev) => ({ ...prev, [tabKey]: next }));
  };

  const handleSetAllRoles = (tabKey: string, roles: string[]) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [tabKey]: Array.from(new Set(['ADMIN', ...roles])),
    }));
  };

  const handleSave = async () => {
    const ok = await updatePermissions(localPermissions);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all tab permissions to system defaults?')) {
      await resetToDefaults();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Filter sections
  const filteredTabs = ALL_TAB_DEFINITIONS.filter((tab) => {
    const matchesSearch =
      tab.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tab.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = selectedSection === 'All' || tab.section === selectedSection;
    return matchesSearch && matchesSection;
  });

  const sectionsList = ['All', 'Overview', 'Sales', 'Inventory', 'Service', 'Admin'];

  // Stats
  const totalTabs = ALL_TAB_DEFINITIONS.length;
  const ceoCount = ALL_TAB_DEFINITIONS.filter((t) => (localPermissions[t.key] || []).includes('CEO')).length;
  const managerCount = ALL_TAB_DEFINITIONS.filter((t) => (localPermissions[t.key] || []).includes('MANAGER')).length;
  const cashierCount = ALL_TAB_DEFINITIONS.filter((t) => (localPermissions[t.key] || []).includes('CASHIER')).length;

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Tab & Role Access Control
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Admin can configure which tabs and features each role can view and access.
              </p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Total Tabs: {totalTabs}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60">
              👑 CEO: {ceoCount}/{totalTabs}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60">
              👔 Manager: {managerCount}/{totalTabs}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/60">
              💵 Cashier: {cashierCount}/{totalTabs}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md text-xs font-bold transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Permissions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Permissions saved successfully to central database and synchronized with Sidebar!</span>
        </div>
      )}

      {/* Role-Specific Direct Authentication & Portal Links */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Role-Specific Authentication &amp; Direct Portal Links
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Direct Login URLs
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Admin can copy &amp; share these dedicated links with staff. Opening a link tailors the login experience, branding badge, and credentials for that role.
              </p>
            </div>
          </div>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Admin / CEO Portal Card */}
          <div className="bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-300 tracking-tight">
                      Executive &amp; Admin Portal Link
                    </h3>
                    <span className="text-[11px] font-bold text-slate-300">
                      Role: CEO / System Administrator
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  Full Access
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 mb-3.5 leading-relaxed">
                Pre-configures executive branding, amber theme, and CEO credentials for tab permissions, financial controls, and master system settings.
              </p>

              {/* URL Display Box */}
              <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-3.5">
                <span className="text-xs font-mono text-amber-200 truncate select-all">
                  {adminPortalUrl}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded shrink-0">
                  Direct URL
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => handleCopyLink(adminPortalUrl, 'admin')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copiedRole === 'admin'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:border-amber-400'
                }`}
              >
                {copiedRole === 'admin' ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-white" />
                    <span>Admin Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Admin Portal Link</span>
                  </>
                )}
              </button>

              <a
                href={adminPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all shadow-xs shrink-0"
                title="Open Admin Portal in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </a>
            </div>
          </div>

          {/* Manager Portal Card */}
          <div className="bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-500/70 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-300 tracking-tight">
                      Operations &amp; Manager Portal Link
                    </h3>
                    <span className="text-[11px] font-bold text-slate-300">
                      Role: Operations &amp; Branch Manager
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Branch Ops
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 mb-3.5 leading-relaxed">
                Pre-configures operations branding, emerald theme, and Manager credentials for sales billing, live stock replenishment, quotations, and service tasks.
              </p>

              {/* URL Display Box */}
              <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-3.5">
                <span className="text-xs font-mono text-emerald-200 truncate select-all">
                  {managerPortalUrl}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded shrink-0">
                  Direct URL
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => handleCopyLink(managerPortalUrl, 'manager')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copiedRole === 'manager'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400'
                }`}
              >
                {copiedRole === 'manager' ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-white" />
                    <span>Manager Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Manager Portal Link</span>
                  </>
                )}
              </button>

              <a
                href={managerPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all shadow-xs shrink-0"
                title="Open Manager Portal in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tabs, sub-tabs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {sectionsList.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSection === sec
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Access Table & Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Tab & Feature Name</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Currently Allowed Roles</th>
                <th className="py-3 px-4">Role Access Dropdown</th>
                <th className="py-3 px-4 text-center">Quick 1-Click Toggles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredTabs.map((tab) => {
                const assigned = localPermissions[tab.key] || ['ADMIN'];
                const isOpen = activeDropdownTab === tab.key;

                return (
                  <tr
                    key={tab.key}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Tab Name & Description & Sub-tabs */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                        <span className="font-black">{tab.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {tab.description}
                      </p>

                      {/* Sub-tabs list */}
                      {tab.subTabs && tab.subTabs.length > 0 && (
                        <div className="mt-2 pl-2 border-l-2 border-emerald-400/50 space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Sub-Tabs Included:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {tab.subTabs.map((sub) => (
                              <span
                                key={sub.key}
                                title={sub.description}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                              >
                                ↳ {sub.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Section Tag */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tab.section}
                      </span>
                    </td>

                    {/* Assigned Roles Badges */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200">
                          🔒 Admin
                        </span>
                        {assigned.includes('CEO') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
                            👑 CEO
                          </span>
                        )}
                        {assigned.includes('MANAGER') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
                            👔 Manager
                          </span>
                        )}
                        {assigned.includes('CASHIER') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200">
                            💵 Cashier
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role Dropdown Selector */}
                    <td className="py-3.5 px-4 align-top relative">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveDropdownTab(isOpen ? null : tab.key)}
                          className="w-full min-w-[170px] flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
                        >
                          <span className="truncate">
                            {assigned.filter((r) => r !== 'ADMIN').length === 0
                              ? 'Admin Only'
                              : assigned.filter((r) => r !== 'ADMIN').join(', ')}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-emerald-600' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                          <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fadeIn">
                            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1">
                              <span>Assign Roles</span>
                              <span className="text-[9px] text-emerald-600 font-bold">1-Tap Select</span>
                            </div>

                            {/* Role Options */}
                            {ROLES_LIST.map((role) => {
                              const checked = assigned.includes(role.id);
                              const Icon = role.icon;

                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  onClick={() => handleToggle(tab.key, role.id)}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    checked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{role.label}</span>
                                  </div>
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                      checked
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                    }`}
                                  >
                                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}

                            {/* Locked Admin Role */}
                            <div className="flex items-center justify-between px-2.5 py-1.5 text-slate-400 text-xs font-bold opacity-75">
                              <span className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-purple-400" />
                                <span>Administrator</span>
                              </span>
                              <span className="text-[9px] font-black text-purple-600 uppercase bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded">
                                Always
                              </span>
                            </div>

                            {/* Quick Presets inside dropdown */}
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleSetAllRoles(tab.key, ['CEO', 'MANAGER', 'CASHIER'])}
                                className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                              >
                                Allow All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetAllRoles(tab.key, ['CEO', 'MANAGER'])}
                                className="px-2 py-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg"
                              >
                                CEO+Manager
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetAllRoles(tab.key, [])}
                                className="px-2 py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quick 1-Click Toggles */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center justify-center gap-2">
                        {/* CEO Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggle(tab.key, 'CEO')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                            assigned.includes('CEO')
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                          title="Toggle CEO Access"
                        >
                          CEO
                        </button>

                        {/* Manager Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggle(tab.key, 'MANAGER')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                            assigned.includes('MANAGER')
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                          title="Toggle Manager Access"
                        >
                          MGR
                        </button>

                        {/* Cashier Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggle(tab.key, 'CASHIER')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                            assigned.includes('CASHIER')
                              ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                          title="Toggle Cashier Access"
                        >
                          CSH
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
