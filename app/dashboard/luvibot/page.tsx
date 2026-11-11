// app/dashboard/luvibot/page.tsx
// ============================================================================
// Halaman Dashboard Sub-Admin LuviBot (Model A)
// ============================================================================

import { Metadata } from 'next';
import LuviBotDashboardClient from '@/components/luvibot/LuviBotDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard LuviBot Sub-Admin | Luvira 2.0',
  description: 'Portal internal sub-admin LuviBot (Model A: Draf & Approval Awan)',
};

export default function LuviBotDashboardPage() {
  return <LuviBotDashboardClient />;
}

