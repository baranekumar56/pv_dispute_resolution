import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, LogOut, Menu, X,
  ChevronRight, Bell
} from 'lucide-react';
import { ROUTES } from '@/config/constants';
import { useAppDispatch, useUser } from '@/hooks';
import { logoutUser } from '@/features/auth';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTES.DOCUMENTS, icon: FileText,         label: 'Documents' },
];

const Sidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useUser();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside className={clsx(
      'flex flex-col bg-surface-900 text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-800">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-base tracking-tight whitespace-nowrap overflow-hidden">
            PaisaVasool
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg hover:bg-surface-800 transition-colors"
        >
          <ChevronRight className={clsx('w-4 h-4 text-surface-400 transition-transform duration-300', collapsed ? '' : 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-surface-400 hover:bg-surface-800 hover:text-white'
            )}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-2 border-t border-surface-800">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-surface-300 font-medium truncate">{user.name}</p>
            <p className="text-xs text-surface-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useUser();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-surface-200 flex items-center px-6 py-3 gap-4 shrink-0">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-surface-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-xl hover:bg-surface-100 transition-colors">
            <Bell size={18} className="text-surface-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2.5 pl-2 border-l border-surface-200">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-semibold font-display">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {user && (
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-surface-900 leading-none">{user.name}</p>
                <p className="text-xs text-surface-400 mt-0.5">Finance Associate</p>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
