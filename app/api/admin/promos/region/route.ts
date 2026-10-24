// app/api/admin/promos/region/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { POST as mainPromoPost } from '../route';

export async function POST(request: NextRequest) {
  const body = await request.json();
  body.type = 'WILAYAH';
  
  const clonedRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return mainPromoPost(clonedRequest);
}
