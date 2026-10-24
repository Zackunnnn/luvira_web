// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can, maskProductCost } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        variants: {
          include: {
            stocks: {
              include: { region: true },
            },
            cost: can(user, 'cost_price:view') ? true : false,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ product: maskProductCost(user, product) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat detail produk' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'catalog:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat mengubah produk.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const activeRegions = await prisma.region.findMany({ where: { isActive: true } });

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.model !== undefined) updateData.model = body.model.trim();
      if (body.price !== undefined) updateData.price = Math.max(0, parseInt(body.price, 10));
      if (body.originalPrice !== undefined) {
        updateData.originalPrice = body.originalPrice ? Math.max(0, parseInt(body.originalPrice, 10)) : null;
      }
      if (body.description !== undefined) updateData.description = body.description;
      if (body.features !== undefined) updateData.features = body.features;
      if (body.badge !== undefined) updateData.badge = body.badge;
      if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

      const prod = await tx.product.update({
        where: { id },
        data: updateData,
      });

      // Update / Create Variants
      if (Array.isArray(body.variants)) {
        for (let i = 0; i < body.variants.length; i++) {
          const v = body.variants[i];
          const weightGram = Math.max(1, parseInt(v.weightGram || '35', 10));

          if (v.id && !v.id.startsWith('temp-') && !v.id.startsWith('var-')) {
            const variantExists = await tx.productVariant.findUnique({ where: { id: v.id } });
            if (variantExists) {
              await tx.productVariant.update({
                where: { id: v.id },
                data: {
                  name: v.name,
                  hex: v.hex,
                  weightGram,
                  imageUrl: v.imageUrl || v.image || variantExists.imageUrl,
                  isActive: v.isActive !== undefined ? Boolean(v.isActive) : variantExists.isActive,
                },
              });
              continue;
            }
          }

          // Create new variant
          const sku = v.sku?.trim() || `${existingProduct.slug}-${Date.now().toString(36)}-${i + 1}`;
          const newVar = await tx.productVariant.create({
            data: {
              productId: id,
              name: v.name || `Varian ${i + 1}`,
              hex: v.hex || '#E8D5C4',
              sku,
              weightGram,
              imageUrl: v.imageUrl || v.image || '/socks/est1.webp',
            },
          });

          for (const reg of activeRegions) {
            await tx.stock.create({
              data: {
                variantId: newVar.id,
                regionId: reg.id,
                qty: v.stock !== undefined ? Math.max(0, parseInt(v.stock, 10)) : 50,
                reserved: 0,
              },
            });
          }
        }
      }

      return prod;
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      before: { name: existingProduct.name, price: existingProduct.price },
      after: { name: updated.name, price: updated.price },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui.',
      product: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Product PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'catalog:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat menghapus produk.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'DEACTIVATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Produk berhasil dinonaktifkan.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus produk' }, { status: 500 });
  }
}
