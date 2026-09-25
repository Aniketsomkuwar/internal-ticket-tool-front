import type { Permission } from '@/shared/index';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  LayoutDashboard,
  Activity,
  Ticket,
  Briefcase,
  Calendar,
  Headphones,
  Kanban,
  Radar,
  DollarSign,
  Network,
  FolderGit2,
  Users,
  ShieldCheck,
  UserCheck,
  GitFork,
  Shield,
} from 'lucide-react';

/**
 * The navigation table (R003).
 */
export interface NavItem {
  href: string;
  label: string;
  marker: string;
  icon: LucideIcon;
  /** The key the destination's route enforces; `null` for any signed-in caller. */
  permission: Permission | null;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Overview', marker: 'O', icon: Home, permission: null },
  { href: '/dashboard', label: 'Dashboard', marker: 'D', icon: LayoutDashboard, permission: 'dashboard:read' },
  { href: '/services', label: 'Service Health', marker: 'S', icon: Activity, permission: 'services:read' },
  { href: '/portal', label: 'Client Portal', marker: 'C', icon: Ticket, permission: 'tickets:close' },
  { href: '/portal/project', label: 'Project Status', marker: 'V', icon: Briefcase, permission: 'projects:read' },
  { href: '/events', label: 'Events & Renewals', marker: 'N', icon: Calendar, permission: 'events:read' },
  { href: '/tickets', label: 'Tickets Console', marker: 'T', icon: Headphones, permission: 'tickets:claim' },
  { href: '/board', label: 'Kanban Board', marker: 'K', icon: Kanban, permission: 'tasks:read' },
  { href: '/watchtower', label: 'Watchtower', marker: 'W', icon: Radar, permission: 'tasks:read' },
  { href: '/admin/pricing', label: 'Feature Pricing', marker: '$', icon: DollarSign, permission: 'pricing:write' },
  { href: '/admin/escalation', label: 'Escalation Matrix', marker: 'E', icon: Network, permission: 'escalation:read' },
  { href: '/admin/projects', label: 'Projects', marker: 'J', icon: FolderGit2, permission: 'projects:write' },
  { href: '/admin/users', label: 'Directory', marker: 'U', icon: Users, permission: 'user:read' },
  { href: '/admin/roles', label: 'Roles & Permissions', marker: 'R', icon: ShieldCheck, permission: 'role:assign' },
  { href: '/profile', label: 'Profile', marker: 'P', icon: UserCheck, permission: 'profile:read' },
  { href: '/org', label: 'Org Chart', marker: 'H', icon: GitFork, permission: 'org:read' },
  { href: '/admin', label: 'Admin', marker: 'A', icon: Shield, permission: 'admin:access' },
];

/** The rows this permission list can actually open, in table order. */
export function visibleNavItems(
  permissions: readonly Permission[],
  role?: string,
): NavItem[] {
  const visible = NAV_ITEMS.filter((item) => {
    const hasPermission = item.permission === null || permissions.includes(item.permission);
    if (!hasPermission) return false;

    // Hide Service Health, Events, and Watchtower for all users for now
    if (item.href === '/services' || item.href === '/events' || item.href === '/watchtower') {
      return false;
    }

    // Hide Directory from developer and manager roles
    if (item.href === '/admin/users' && (role === 'developer' || role === 'manager')) {
      return false;
    }

    // Overview is only visible to admin
    if (item.href === '/' && role !== 'admin') {
      return false;
    }

    // Filter items for clients
    if (role === 'client') {
      if (
        item.href === '/events'
      ) {
        return false;
      }
    }

    return true;
  }).map((item) => {
    // For clients, display /portal as "My Tickets"
    if (role === 'client' && item.href === '/portal') {
      return { ...item, label: 'My Tickets', marker: 'T' };
    }
    return item;
  });

  // Position /events ('Events & Renewals') one step up (third-to-last)
  const eventsIdx = visible.findIndex((item) => item.href === '/events');
  if (eventsIdx !== -1 && visible.length > 2) {
    const eventsItem = visible[eventsIdx];
    if (eventsItem) {
      visible.splice(eventsIdx, 1);
      // Place at length - 2 (so /org can take length - 1)
      const targetIdx = Math.max(0, visible.length - 1);
      visible.splice(targetIdx, 0, eventsItem);
    }
  }

  // Position /org ('Org Chart') as second-to-last in the sidebar
  const orgIdx = visible.findIndex((item) => item.href === '/org');
  if (orgIdx !== -1 && visible.length > 1) {
    const orgItem = visible[orgIdx];
    if (orgItem) {
      visible.splice(orgIdx, 1);
      const targetIdx = Math.max(0, visible.length - 1);
      visible.splice(targetIdx, 0, orgItem);
    }
  }

  return visible;
}

/**
 * Prefix matching, so `/admin/anything` keeps Admin marked. The root path is
 * exact: every path starts with `/`, so a prefix test there would mark Overview
 * on every screen.
 */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  // When at /portal/project, /portal should not be active
  if (href === '/portal') {
    return pathname === '/portal' || (pathname.startsWith('/portal/') && !pathname.startsWith('/portal/project'));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
