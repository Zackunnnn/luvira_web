// app/api/admin/users/regional/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { POST as mainUsersPost, GET as mainUsersGet, PUT as mainUsersPut } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return mainUsersGet(request);
}

export async function POST(request: NextRequest) {
  return mainUsersPost(request);
}

export async function PUT(request: NextRequest) {
  return mainUsersPut(request);
}
