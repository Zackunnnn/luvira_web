// app/api/admin/products/route.ts
// ============================================================================
// API Manajemen Katalog Produk & Varian (Admin Pusat & Owner)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 7 (HPP terproteksi, berat varian)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can, maskProductCost } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'catalog:view')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      include: {
        variants: {
          include: {
            stocks: {
              include: {
                region: {
                  select: { id: true, name: true, code: true, type: true },
                },
              },
            },
            cost: can(user, 'cost_price:view') ? true : false,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const safeProducts = products.map((p) => maskProductCost(user, p));
    return NextResponse.json({ products: safeProducts });
  } catch (error: any) {
    console.error('[API Admin Products GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat produk' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'catalog:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat mengelola katalog.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, model, price, originalPrice, description, features, badge, variants } = body;

    if (!name?.trim() || !model?.trim() || price === undefined) {
      return NextResponse.json({ error: 'Nama, model, dan harga produk wajib diisi.' }, { status: 400 });
    }

    // Buat slug unik
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Ambil semua wilayah aktif untuk inisialisasi stok
    const activeRegions = await prisma.region.findMany({ where: { isActive: true } });

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          slug,
          model: model.trim(),
          price: Math.max(0, parseInt(price, 10)),
          originalPrice: originalPrice ? Math.max(0, parseInt(originalPrice, 10)) : null,
          description: description || '',
          features: Array.isArray(features) ? features : [],
          badge: badge || null,
        },
      });

      if (Array.isArray(variants) && variants.length > 0) {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const sku = v.sku?.trim() || `${slug}-${i + 1}-${Date.now().toString(36)}`;
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              name: v.name || `Varian ${i + 1}`,
              hex: v.hex || '#E8D5C4',
              sku,
              weightGram: Math.max(1, parseInt(v.weightGram || '35', 10)), // Default 35 gram
              imageUrl: v.imageUrl || v.image || '/socks/est1.webp',
            },
          });

          // Inisialisasi stok untuk semua wilayah
          for (const region of activeRegions) {
            const initialQty = v.stock !== undefined ? Math.max(0, parseInt(v.stock, 10)) : 50;
            await tx.stock.create({
              data: {
                variantId: createdVariant.id,
                regionId: region.id,
                qty: initialQty,
                reserved: 0,
              },
            });
          }
        }
      }

      return product;
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: newProduct.id,
      after: { name, slug, price, model },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil ditambahkan ke katalog.',
      product: newProduct,
    });
  } catch (error: any) {
    console.error('[API Admin Products POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan produk' }, { status: 500 });
  }
}
