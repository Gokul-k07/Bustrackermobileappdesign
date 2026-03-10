import React from 'react';
import { Home, Map, Bell, User, Shield, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

interface HamburgerMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCount: number;
  hasAdminAccess: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  showBadge?: boolean;
}

export function HamburgerMenu({
  activeTab,
  onTabChange,
  notificationCount,
  hasAdminAccess,
  open,
  onOpenChange,
}: HamburgerMenuProps) {
  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: 'map',
      label: 'Map',
      icon: <Map className="h-5 w-5" />,
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: <Bell className="h-5 w-5" />,
      showBadge: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
    },
  ];

  // Add admin menu item if user has access
  if (hasAdminAccess) {
    menuItems.splice(4, 0, {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-5 w-5" />,
    });
  }

  const handleMenuItemClick = (itemId: string) => {
    onTabChange(itemId);
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>
            Navigate between different sections of the app
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                className={`
                  flex w-full items-center justify-between rounded-lg px-4 py-3
                  text-left transition-colors
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.showBadge && notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-[20px] px-1.5 text-xs"
                    aria-label={`${notificationCount} unread notifications`}
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
