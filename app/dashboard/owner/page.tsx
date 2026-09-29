import React from 'react';
import { isOwner } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OwnerDashboardClient from './OwnerDashboardClient';

export default async function OwnerDashboardPage() {
  const isUserOwner = await isOwner();
  if (!isUserOwner) {
    redirect('/admin');
  }

  return <OwnerDashboardClient />;
}
