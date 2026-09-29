import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { isOwner } from '@/lib/auth';
import { Product } from '@/types/product';

export async function GET() {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return Response.json({ warning: 'Database belum dikonfigurasi', data: [] });
    }

    const products = await prisma.product.findMany({
      include: { variants: true },
    });
    
    const ownerStatus = await isOwner();

    const mappedProducts = products.map(p => {
      // Strip cost fields if not owner
      let productData: any = { ...p };
      if (!ownerStatus) {
        delete productData.costPrice;
        delete productData.packingCost;
      }

      return {
        ...productData,
        variants: p.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          hex: v.hex,
          image: v.imageUrl,
          stock: v.stock,
        }))
      };
    });
    
    return Response.json({ data: mappedProducts });
  } catch (error) {
    console.error('[Products API] Error GET:', error);
    return Response.json({ error: 'Gagal mengambil data produk' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
    }

    const body: Product = await request.json();
    const { id, name, model, price, originalPrice, rating, reviewsCount, badge, description, features, variants } = body;

    const ownerStatus = await isOwner();

    const dataToCreate: any = {
      id: id || `prod-${Date.now()}`,
      name,
      model,
      price,
      originalPrice,
      rating,
      reviewsCount,
      badge,
      description,
      features,
      variants: {
        create: variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          hex: v.hex,
          imageUrl: v.image,
          stock: v.stock,
        }))
      }
    };

    if (ownerStatus) {
      if ((body as any).costPrice !== undefined) dataToCreate.costPrice = (body as any).costPrice;
      if ((body as any).packingCost !== undefined) dataToCreate.packingCost = (body as any).packingCost;
    }

    const newProduct = await prisma.product.create({
      data: dataToCreate,
      include: { variants: true },
    });

    let productData: any = { ...newProduct };
    if (!ownerStatus) {
      delete productData.costPrice;
      delete productData.packingCost;
    }

    const mappedProduct = {
      ...productData,
      variants: newProduct.variants.map((v: any) => ({
        id: v.id,
        name: v.name,
        hex: v.hex,
        image: v.imageUrl,
        stock: v.stock,
      }))
    };

    return Response.json({ success: true, data: mappedProduct });
  } catch (error) {
    console.error('[Products API] Error POST:', error);
    return Response.json({ error: 'Gagal membuat produk' }, { status: 500 });
  }
}
