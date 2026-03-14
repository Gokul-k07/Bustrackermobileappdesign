import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Map, Bell, User, Shield } from 'lucide-react';
import { Badge } from './ui/badge';

export interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCount: number;
  hasAdminAccess?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItemProps {
  label: string;
  isActive: boolean;
  icon: React.ReactNode;
  badgeCount?: number;
  onClick: () => void;
}

export function MenuItem({
  label,
  isActive,
  icon,
  badgeCount,
  onClick,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] font-medium transition-colors',
        isActive
          ? 'bg-gray-100 text-black shadow-sm'
          : 'text-gray-600 hover:bg-gray-100'
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
      role="menuitem"
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'flex h-5 w-5 items-center justify-center',
            isActive ? 'text-black' : 'text-gray-500 group-hover:text-gray-700'
          ].join(' ')}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <Badge
          variant="destructive"
          className="h-5 min-w-[20px] px-1.5 text-xs"
          aria-label={`${badgeCount} unread notifications`}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </Badge>
      )}
    </button>
  );
}

export function SidebarNav({
  activeTab,
  onTabChange,
  notificationCount,
  hasAdminAccess = false,
  isOpen,
  onOpenChange,
}: SidebarNavProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => setAnimateIn(true));
      return () => cancelAnimationFrame(raf);
    }

    setAnimateIn(false);
    const timeout = setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  const menuItems = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'map', label: 'Map', icon: <Map className="h-5 w-5" /> },
    {
      id: 'notifications',
      label: 'Alert',
      icon: <Bell className="h-5 w-5" />,
      badgeCount: notificationCount,
    },
    { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  if (hasAdminAccess) {
    menuItems.push({
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-5 w-5" />,
    });
  }

  const handleMenuClick = (id: string) => {
    onTabChange(id);
    onOpenChange(false);
  };

  if (!isRendered || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-[1100] flex',
        animateIn ? 'pointer-events-auto' : 'pointer-events-none'
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <button
        className={[
          'absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300',
          animateIn ? 'opacity-100' : 'opacity-0'
        ].join(' ')}
        aria-label="Close navigation menu"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={[
          'relative z-[1101] h-full w-[240px] bg-white text-slate-900 shadow-2xl',
          'transform transition-transform duration-300 ease-in-out',
          animateIn ? 'translate-x-0' : '-translate-x-full'
        ].join(' ')}
      >
        <div className="flex items-center gap-3 border-b px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm overflow-hidden">
            <img
              src="/hero-frames/nextstop-logo.png?v=2"
              alt="NextStop logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">NEXTSTOP</div>
            <div className="text-xs italic text-slate-500">Bus Tracker</div>
          </div>
        </div>
        <div className="px-2 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <MenuItem
                key={item.id}
                label={item.label}
                isActive={activeTab === item.id}
                icon={item.icon}
                badgeCount={item.badgeCount}
                onClick={() => handleMenuClick(item.id)}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
