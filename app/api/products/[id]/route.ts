import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Product } from '@/types/product';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
    }

    const { id } = await params;
    const body: Partial<Product> = await request.json();
    
    // Construct data object for Prisma
    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.model !== undefined) dataToUpdate.model = body.model;
    if (body.price !== undefined) dataToUpdate.price = body.price;
    if (body.originalPrice !== undefined) dataToUpdate.originalPrice = body.originalPrice;
    if (body.rating !== undefined) dataToUpdate.rating = body.rating;
    if (body.reviewsCount !== undefined) dataToUpdate.reviewsCount = body.reviewsCount;
    if (body.badge !== undefined) dataToUpdate.badge = body.badge;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.features !== undefined) dataToUpdate.features = body.features;

    // Handle variants: since this is a simple CMS, we can delete old variants and create new ones
    // Or we can just update them if we have an array of variants
    if (body.variants) {
      dataToUpdate.variants = {
        deleteMany: {}, // Delete all existing variants for this product
        create: body.variants.map((v) => ({
          id: v.id,
          name: v.name,
          hex: v.hex,
          imageUrl: v.image,
          stock: v.stock,
        })),
      };
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { variants: true },
    });

    const mappedProduct = {
      ...updatedProduct,
      variants: updatedProduct.variants.map(v => ({
        id: v.id,
        name: v.name,
        hex: v.hex,
        image: v.imageUrl,
        stock: v.stock,
      }))
    };

    return Response.json({ success: true, data: mappedProduct });
  } catch (error) {
    console.error(`[Products API] Error PUT:`, error);
    return Response.json({ error: 'Gagal memperbarui produk' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
    }

    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(`[Products API] Error DELETE:`, error);
    return Response.json({ error: 'Gagal menghapus produk' }, { status: 500 });
  }
}
