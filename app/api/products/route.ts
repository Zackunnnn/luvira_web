import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
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
    
    const mappedProducts = products.map(p => ({
      ...p,
      variants: p.variants.map(v => ({
        id: v.id,
        name: v.name,
        hex: v.hex,
        image: v.imageUrl,
        stock: v.stock,
      }))
    }));
    
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

    const newProduct = await prisma.product.create({
      data: {
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
          create: variants.map(v => ({
            id: v.id,
            name: v.name,
            hex: v.hex,
            imageUrl: v.image,
            stock: v.stock,
          }))
        }
      },
      include: { variants: true },
    });

    const mappedProduct = {
      ...newProduct,
      variants: newProduct.variants.map(v => ({
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
