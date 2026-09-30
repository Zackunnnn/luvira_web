import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { code: 'asc' }
    });
    return NextResponse.json({ success: true, data: promos });
  } catch (error) {
    console.error('Error fetching promos:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch promos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newPromo = await prisma.promoCode.create({
      data: {
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue,
        resellerName: body.resellerName || null,
        resellerWaNumber: body.resellerWaNumber || null,
        commissionType: body.commissionType || null,
        commissionValue: body.commissionValue || null,
        quota: body.quota || 0,
        isActive: body.isActive ?? true,
        isFreeShipping: body.isFreeShipping ?? false,
        isFreeTax: body.isFreeTax ?? false,
      }
    });
    return NextResponse.json({ success: true, data: newPromo });
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json({ success: false, error: 'Failed to create promo' }, { status: 500 });
  }
}
