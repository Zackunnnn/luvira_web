import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const updatedPromo = await prisma.promoCode.update({
      where: { id },
      data: {
        code: body.code,
        discountType: body.discountType,
        discountValue: body.discountValue,
        resellerName: body.resellerName,
        resellerWaNumber: body.resellerWaNumber,
        commissionType: body.commissionType,
        commissionValue: body.commissionValue,
        quota: body.quota,
        isActive: body.isActive,
        isFreeShipping: body.isFreeShipping,
        isFreeTax: body.isFreeTax,
      }
    });
    return NextResponse.json({ success: true, data: updatedPromo });
  } catch (error) {
    console.error('Error updating promo:', error);
    return NextResponse.json({ success: false, error: 'Failed to update promo' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    await prisma.promoCode.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete promo' }, { status: 500 });
  }
}
