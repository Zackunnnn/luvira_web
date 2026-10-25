// prisma/showcase-seed.ts
// ============================================================================
// Showcase Data Seeder Luvira 2.0
// Menyiapkan data dummy untuk presentasi & showcase live:
// 1. 3 Konten Dakwah Syar'i (Aurat Kaki, Mahkota Kesantunan, Istiqomah)
// 2. Beragam Transaksi Pesanan dengan berbagai status:
//    - SELESAI, DIKIRIM, DIPROSES, MENUNGGU_VERIFIKASI, MENUNGGU_PEMBAYARAN,
//      DIBATALKAN, KEDALUWARSA
// 3. Variasi Pesanan dengan Promo (RESELLER2026 & JOGJAISTIMEWA) dan Tanpa Promo
// 4. Data Finansial Lengkap (HPP, Packing, PPN, Ongkir) untuk Laporan Owner & Ekspor CSV
// ============================================================================

import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  PaymentVerificationStatus,
  StockMovementType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- [LUVIRA 2.0 SHOWCASE SEED] Memulai Seeding Data Showcase ---');

  // 1. Ambil Wilayah & Pengguna yang Dibutuhkan
  const pusatRegion = await prisma.region.findUnique({ where: { code: 'PUSAT' } });
  const jogjaRegion = await prisma.region.findUnique({ where: { code: 'YOGYAKARTA' } });
  const ownerUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  const adminPusat = await prisma.user.findFirst({ where: { role: 'ADMIN_PUSAT' } });

  if (!pusatRegion || !jogjaRegion || !ownerUser) {
    throw new Error(
      'Wilayah atau User belum siap. Pastikan npx tsx prisma/seed.ts sudah dijalankan terlebih dahulu!'
    );
  }

  // Ambil semua produk dan varian yang sudah ada
  const products = await prisma.product.findMany({
    include: {
      variants: {
        include: { cost: true },
      },
    },
  });

  if (products.length === 0) {
    throw new Error('Produk belum ada. Jalankan npx tsx prisma/seed.ts terlebih dahulu.');
  }

  const promoReseller = await prisma.promoCode.findUnique({ where: { code: 'RESELLER2026' } });
  const promoJogja = await prisma.promoCode.findUnique({ where: { code: 'JOGJAISTIMEWA' } });
  const jagoAccount = await prisma.paymentAccount.findFirst({ where: { bankName: 'Jago Syariah' } });
  const bsiAccount = await prisma.paymentAccount.findFirst({ where: { bankName: 'BSI' } });

  // --------------------------------------------------------------------------
  // 2. Tiga Konten Dakwah & Nasihat Syar'i
  // --------------------------------------------------------------------------
  console.log('[Showcase] 1. Menyiapkan 3 Artikel Nasihat & Dakwah Syar\'i...');

  const adviceArticles = [
    {
      title: 'Kaki pun Aurat yang Mulia: Menjaga Kesempurnaan Hijab di Setiap Langkah',
      slug: 'kaki-pun-aurat-yang-mulia',
      content: `Pernahkah kita menyadari bahwa dari ujung rambut hingga ujung jari kaki, setiap jengkal tubuh wanita muslimah memiliki kehormatan yang begitu dijaga oleh syariat?

Dalam hadits shahih riwayat Abu Daud (no. 4104), Rasulullah ﷺ bersabda kepada Asma binti Abu Bakar:
*"Wahai Asma, sesungguhnya wanita jika sudah baligh tidak boleh terlihat darinya kecuali ini dan ini,"* beliau menunjuk wajah dan kedua telapak tangan.

Lalu bagaimana dengan kedua kaki? Ummul Mukminin Ummu Salamah radhiyallahu 'anha pernah bertanya kepada Rasulullah ﷺ ketika mendengar hadits tentang larangan memanjangkan pakaian karena sombong:
*"Lalu apa yang harus dilakukan wanita dengan ujung-ujung pakaian mereka?"*
Rasulullah ﷺ menjawab: *"Hendaklah mereka menurunkannya sejengkal."*
Ummu Salamah kembali bertanya: *"Jika demikian, kedua kaki mereka akan tersingkap?"*
Rasulullah ﷺ bersabda: *"Hendaklah mereka menurunkannya sehasta dan jangan lebih dari itu."* (HR. At-Tirmidzi no. 1731, hadits shahih).

Jumhur ulama dari kalangan mazhab Maliki, Syafi'i, dan Hanbali menegaskan bahwa kedua telapak dan punggung kaki wanita merdeka adalah aurat yang wajib ditutup di hadapan non-mahram maupun saat mendirikan sholat. Ketika kita mengangkat kaki saat melangkah, menaiki tangga, atau terhembus angin, sering kali bagian punggung kaki tersingkap tanpa disadari.

Kaus kaki bukan sekadar pelengkap busana, melainkan perisai kesantunan. Memilih kaus kaki yang tidak menerawang, tidak membentuk lekuk jari secara transparan, serta nyaman dipakai seharian adalah ikhtiar nyata menjemput ridha Allah Ta'ala di setiap tapak langkah kita.`,
      isPublished: true,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Mahkota Kesantunan: Langkah Anggun Menjadi Muslimah Berkarakter dan Berakhlak Mulia',
      slug: 'mahkota-kesantunan-muslimah-berkarakter',
      content: `Dunia hari ini sering kali menilai keindahan dari seberapa banyak tatapan yang tertuju pada seseorang. Namun Islam mengajarkan definisi kecantikan yang jauh lebih bermartabat: kesantunan batin dan rasa malu (*al-haya'*).

Rasulullah ﷺ bersabda:
*"Rasa malu tidaklah mendatangkan kecuali kebaikan semata."* (HR. Bukhari no. 6117 dan Muslim no. 37).

Bagi seorang muslimah, menjadi pribadi yang baik bukan berarti mengurung diri dari berkarya dan menebar manfaat. Justru wanita muslimah hadir di ruang publik sebagai teladan integritas, kelembutan tutur kata (*qawlan karima*), kecerdasan berpikir, serta kehormatan diri (*iffah* dan *izzah*).

Busana syar'i yang kita kenakan adalah representasi dari keyakinan hati. Pakaian yang longgar, tidak mencolok untuk mencari perhatian (*syuhrah*), dan menutup aurat hingga ujung kaki adalah mahkota tak kasat mata yang menjaga marwah seorang muslimah di tengah gemerlap tren yang serba terbuka.

Saat langkah kaki terbungkus rapi dan hati tertaut pada adab, setiap langkah seorang muslimah menjadi jalan dakwah yang tenang namun berwibawa.`,
      isPublished: true,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Menjaga Kesucian di Setiap Langkah: Ikhtiar Istiqomah di Tengah Modernitas',
      slug: 'menjaga-kesucian-setiap-langkah-istiqomah',
      content: `Mempertahankan nilai-nilai syar'i di era serba cepat ini tentu memiliki tantangannya sendiri. Di tempat kerja, di kampus, maupun saat safar, ada kalanya rasa gerah, lelah, atau ragu menghampiri.

Namun Allah Ta'ala berfirman:
*"Dan orang-orang yang bersungguh-sungguh untuk (mencari keridhaan) Kami, benar-benar akan Kami tunjukkan kepada mereka jalan-jalan Kami. Dan sesungguhnya Allah benar-benar beserta orang-orang yang berbuat baik."* (QS. Al-'Ankabut: 69).

Kunci dari istiqomah adalah kemudahan dan kenyamanan dalam menjalankan syariat. Islam tidak pernah menyulitkan pemeluknya. Ketika memilih perlengkapan busana muslimah, pilihlah bahan-bahan berkualitas: serat katun dan nylon premium yang sejuk di iklim tropis, memiliki sirkulasi udara yang baik, dan karet cuff yang pas tanpa menekan betis.

Dengan demikian, saat adzan berkumandang di sela aktivitas padat, kita tidak perlu repot mencari mukena khusus yang menutupi kaki dari bawah karena pakaian dan kaus kaki kita sudah memenuhi syarat sahnya sholat: suci dari najis dan menutup aurat dengan sempurna.

Istiqomah adalah perjalanan selangkah demi selangkah. Jangan lelah berbuat baik, karena setiap lelah yang dilandasi ketaatan bernilai pahala di sisi-Nya.`,
      isPublished: true,
      publishedAt: new Date(),
    },
  ];

  for (const art of adviceArticles) {
    await prisma.advice.upsert({
      where: { slug: art.slug },
      update: {
        title: art.title,
        content: art.content,
        isPublished: art.isPublished,
        publishedAt: art.publishedAt,
        authorId: ownerUser.id,
      },
      create: {
        title: art.title,
        slug: art.slug,
        content: art.content,
        isPublished: art.isPublished,
        publishedAt: art.publishedAt,
        authorId: ownerUser.id,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 3. Transaksi Pesanan Showcase Berbagai Status & Promo
  // --------------------------------------------------------------------------
  console.log('[Showcase] 2. Menyiapkan Transaksi Pesanan dengan Beragam Status & Promo...');

  // Helper untuk mencari varian
  const findVariant = (modelSlug: string, colorName: string) => {
    const prod = products.find((p) => p.model === modelSlug || p.slug === modelSlug);
    if (!prod) return products[0].variants[0];
    const v = prod.variants.find((vr) => vr.name.toLowerCase() === colorName.toLowerCase());
    return v || prod.variants[0];
  };

  const vCudpahnut = findVariant('emboss-split-toe', 'Cudpahnut');
  const vPinkBlossom = findVariant('black-sole-split-toe', 'Pink Blossom');
  const vWhiteMarble = findVariant('anti-slip-split-toe', 'White Marble');
  const vPenelope = findVariant('emboss', 'Penelope');
  const vIvorySilk = findVariant('black-sole', 'Ivory Silk');
  const vWinterBlue = findVariant('black-sole-split-toe', 'Winter Blue');
  const vBohoPink = findVariant('emboss-split-toe', 'Boho Pink');
  const vDarkTaupe = findVariant('black-sole-split-toe', 'Dark Taupe');

  // Bersihkan data pesanan lama jika ada invoice contoh yang sama
  const demoCodes = [
    'LVR-20261020-001',
    'LVR-20261022-002',
    'LVR-20261023-003',
    'LVR-20261024-004',
    'LVR-20261025-005',
    'LVR-20261025-006',
    'LVR-20261019-007',
    'LVR-20261018-008',
  ];

  await prisma.order.deleteMany({
    where: { code: { in: demoCodes } },
  });

  // ORDER 1: SELESAI — DENGAN PROMO RESELLER (Pusat Depok, Midtrans Lunas)
  await prisma.order.create({
    data: {
      code: 'LVR-20261020-001',
      regionId: pusatRegion.id,
      status: OrderStatus.SELESAI,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Siti Rahmawati',
      customerPhone: '6281234567890',
      customerEmail: 'siti.rahma@gmail.com',
      shippingAddress: {
        recipientName: 'Siti Rahmawati',
        phone: '6281234567890',
        streetAddress: 'Jl. Margonda Raya No. 45, RT 02/RW 04, Kemiri Muka',
        district: 'Beji',
        city: 'Kota Depok',
        province: 'Jawa Barat',
        postalCode: '16424',
      },
      subtotal: 105000,
      discountAmount: 10500, // Diskon 10% dari RESELLER2026
      netPrice: 94500,
      ppnAmount: 10395,
      shippingCost: 9000,
      totalPrice: 113895,
      courierCode: 'jne',
      courierService: 'REG',
      trackingNumber: 'JNE901827364501',
      promoCodeId: promoReseller?.id,
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vCudpahnut.id,
            productName: 'Emboss Split Toe All Variant',
            variantName: 'Cudpahnut',
            quantity: 2,
            priceEach: 35000,
            costEach: 15000,
            packingEach: 2000,
            subtotal: 70000,
          },
          {
            variantId: vPinkBlossom.id,
            productName: 'Black Sole Split Toe All Variant',
            variantName: 'Pink Blossom',
            quantity: 1,
            priceEach: 35000,
            costEach: 16000,
            packingEach: 2000,
            subtotal: 35000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MIDTRANS_SNAP,
            amount: 113895,
            status: PaymentVerificationStatus.VERIFIED,
            midtransTransactionId: 'mid-txn-20261020-001',
            midtransStatus: 'settlement',
            verifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan dibuat' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.DIPROSES, note: 'Pembayaran Midtrans berhasil' },
          { fromStatus: OrderStatus.DIPROSES, toStatus: OrderStatus.DIKIRIM, note: 'Resi JNE diinput' },
          { fromStatus: OrderStatus.DIKIRIM, toStatus: OrderStatus.SELESAI, note: 'Paket telah diterima pembeli' },
        ],
      },
    },
  });

  // ORDER 2: DIKIRIM — TANPA PROMO (Cabang Yogyakarta, Transfer BSI)
  await prisma.order.create({
    data: {
      code: 'LVR-20261022-002',
      regionId: jogjaRegion.id,
      status: OrderStatus.DIKIRIM,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Annisa Lathifah',
      customerPhone: '6285678901234',
      customerEmail: 'annisa.lathifah@yahoo.com',
      shippingAddress: {
        recipientName: 'Annisa Lathifah',
        phone: '6285678901234',
        streetAddress: 'Jl. Kaliurang KM 5.5, Gg. Megatruh No. 12',
        district: 'Depok',
        city: 'Kabupaten Sleman',
        province: 'DI Yogyakarta',
        postalCode: '55281',
      },
      subtotal: 120000,
      discountAmount: 0, // Tanpa promo
      netPrice: 120000,
      ppnAmount: 13200,
      shippingCost: 8000,
      totalPrice: 141200,
      courierCode: 'sicepat',
      courierService: 'REG',
      trackingNumber: '004189201938',
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vWhiteMarble.id,
            productName: 'Anti-Slip Split Toe All Variant',
            variantName: 'White Marble',
            quantity: 3,
            priceEach: 40000,
            costEach: 18000,
            packingEach: 2000,
            subtotal: 120000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MANUAL_TRANSFER,
            accountId: bsiAccount?.id,
            amount: 141200,
            status: PaymentVerificationStatus.VERIFIED,
            proofUrl: 'https://ik.imagekit.io/awan1177/demo_proof_bsi_verified.jpg',
            verifiedBy: 'admin.jogja@luvira.id',
            verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan checkout transfer BSI' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.MENUNGGU_VERIFIKASI, note: 'Bukti transfer diunggah' },
          { fromStatus: OrderStatus.MENUNGGU_VERIFIKASI, toStatus: OrderStatus.DIPROSES, note: 'Pembayaran diverifikasi oleh Admin Jogja' },
          { fromStatus: OrderStatus.DIPROSES, toStatus: OrderStatus.DIKIRIM, note: 'Paket diserahkan ke kurir SiCepat' },
        ],
      },
    },
  });

  // ORDER 3: DIPROSES — DENGAN PROMO WILAYAH (Cabang Yogyakarta, Siap Kemas)
  await prisma.order.create({
    data: {
      code: 'LVR-20261023-003',
      regionId: jogjaRegion.id,
      status: OrderStatus.DIPROSES,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Dian Permatasari',
      customerPhone: '6281987654321',
      customerEmail: 'dian.permatasari@gmail.com',
      shippingAddress: {
        recipientName: 'Dian Permatasari',
        phone: '6281987654321',
        streetAddress: 'Jl. Malioboro No. 88, Sosromenduran',
        district: 'Gedongtengen',
        city: 'Kota Yogyakarta',
        province: 'DI Yogyakarta',
        postalCode: '55271',
      },
      subtotal: 95000,
      discountAmount: 14250, // Diskon 15% dari JOGJAISTIMEWA
      netPrice: 80750,
      ppnAmount: 8883,
      shippingCost: 8000,
      totalPrice: 97633,
      courierCode: 'jnt',
      courierService: 'EZ',
      trackingNumber: null, // Masih dipacking
      promoCodeId: promoJogja?.id,
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vPenelope.id,
            productName: 'Emboss All Variant',
            variantName: 'Penelope',
            quantity: 2,
            priceEach: 30000,
            costEach: 13000,
            packingEach: 2000,
            subtotal: 60000,
          },
          {
            variantId: vIvorySilk.id,
            productName: 'Black Sole All Variant',
            variantName: 'Ivory Silk',
            quantity: 1,
            priceEach: 35000,
            costEach: 15000,
            packingEach: 2000,
            subtotal: 35000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MIDTRANS_SNAP,
            amount: 97633,
            status: PaymentVerificationStatus.VERIFIED,
            midtransTransactionId: 'mid-txn-20261023-003',
            midtransStatus: 'settlement',
            verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan dibuat' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.DIPROSES, note: 'Pembayaran QRIS Midtrans tervalidasi' },
        ],
      },
    },
  });

  // ORDER 4: MENUNGGU_VERIFIKASI — TANPA PROMO (Pusat Depok, Siap Diverifikasi Admin)
  await prisma.order.create({
    data: {
      code: 'LVR-20261024-004',
      regionId: pusatRegion.id,
      status: OrderStatus.MENUNGGU_VERIFIKASI,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Fatimah Azzahra',
      customerPhone: '6282134567891',
      customerEmail: 'fatimah.azzahra@gmail.com',
      shippingAddress: {
        recipientName: 'Fatimah Azzahra',
        phone: '6282134567891',
        streetAddress: 'Jl. Pajajaran No. 20, Baranangsiang',
        district: 'Bogor Timur',
        city: 'Kota Bogor',
        province: 'Jawa Barat',
        postalCode: '16143',
      },
      subtotal: 70000,
      discountAmount: 0,
      netPrice: 70000,
      ppnAmount: 7700,
      shippingCost: 10000,
      totalPrice: 87700,
      courierCode: 'jne',
      courierService: 'REG',
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vBohoPink.id,
            productName: 'Emboss Split Toe All Variant',
            variantName: 'Boho Pink',
            quantity: 1,
            priceEach: 35000,
            costEach: 15000,
            packingEach: 2000,
            subtotal: 35000,
          },
          {
            variantId: vDarkTaupe.id,
            productName: 'Black Sole Split Toe All Variant',
            variantName: 'Dark Taupe',
            quantity: 1,
            priceEach: 35000,
            costEach: 16000,
            packingEach: 2000,
            subtotal: 35000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MANUAL_TRANSFER,
            accountId: jagoAccount?.id,
            amount: 87700,
            status: PaymentVerificationStatus.PENDING,
            proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop',
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan checkout transfer Bank Jago Syariah' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.MENUNGGU_VERIFIKASI, note: 'Pembeli mengunggah bukti transfer' },
        ],
      },
    },
  });

  // ORDER 5: MENUNGGU_PEMBAYARAN — DENGAN PROMO RESELLER (Pusat Depok)
  await prisma.order.create({
    data: {
      code: 'LVR-20261025-005',
      regionId: pusatRegion.id,
      status: OrderStatus.MENUNGGU_PEMBAYARAN,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Nurul Hidayah',
      customerPhone: '6287712345678',
      customerEmail: 'nurul.hidayah@outlook.com',
      shippingAddress: {
        recipientName: 'Nurul Hidayah',
        phone: '6287712345678',
        streetAddress: 'Jl. R.E. Martadinata No. 56, Citarum',
        district: 'Bandung Wetan',
        city: 'Kota Bandung',
        province: 'Jawa Barat',
        postalCode: '40115',
      },
      subtotal: 140000,
      discountAmount: 14000, // Diskon 10%
      netPrice: 126000,
      ppnAmount: 13860,
      shippingCost: 11000,
      totalPrice: 150860,
      courierCode: 'jne',
      courierService: 'REG',
      promoCodeId: promoReseller?.id,
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vWinterBlue.id,
            productName: 'Black Sole Split Toe All Variant',
            variantName: 'Winter Blue',
            quantity: 4,
            priceEach: 35000,
            costEach: 16000,
            packingEach: 2000,
            subtotal: 140000,
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan dibuat via Midtrans Snap' },
        ],
      },
    },
  });

  // ORDER 6: SELESAI — TANPA PROMO (Cabang Yogyakarta, Selesai)
  await prisma.order.create({
    data: {
      code: 'LVR-20261025-006',
      regionId: jogjaRegion.id,
      status: OrderStatus.SELESAI,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Dewi Sartika',
      customerPhone: '6281398765432',
      customerEmail: 'dewi.sartika@gmail.com',
      shippingAddress: {
        recipientName: 'Dewi Sartika',
        phone: '6281398765432',
        streetAddress: 'Jl. Gejayan No. 4, Caturtunggal',
        district: 'Depok',
        city: 'Kabupaten Sleman',
        province: 'DI Yogyakarta',
        postalCode: '55281',
      },
      subtotal: 150000,
      discountAmount: 0,
      netPrice: 150000,
      ppnAmount: 16500,
      shippingCost: 7000,
      totalPrice: 173500,
      courierCode: 'pos',
      courierService: 'Pos Reguler',
      trackingNumber: 'POS9928172648',
      paidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vWhiteMarble.id,
            productName: 'Anti-Slip Split Toe All Variant',
            variantName: 'White Marble',
            quantity: 2,
            priceEach: 40000,
            costEach: 18000,
            packingEach: 2000,
            subtotal: 80000,
          },
          {
            variantId: vIvorySilk.id,
            productName: 'Black Sole All Variant',
            variantName: 'Ivory Silk',
            quantity: 2,
            priceEach: 35000,
            costEach: 15000,
            packingEach: 2000,
            subtotal: 70000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MIDTRANS_SNAP,
            amount: 173500,
            status: PaymentVerificationStatus.VERIFIED,
            midtransTransactionId: 'mid-txn-20261025-006',
            midtransStatus: 'settlement',
            verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan dibuat' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.DIPROSES, note: 'Pembayaran diterima' },
          { fromStatus: OrderStatus.DIPROSES, toStatus: OrderStatus.DIKIRIM, note: 'Resi Pos Indonesia diterbitkan' },
          { fromStatus: OrderStatus.DIKIRIM, toStatus: OrderStatus.SELESAI, note: 'Terkonfirmasi sampai di alamat tujuan' },
        ],
      },
    },
  });

  // ORDER 7: DIBATALKAN — DENGAN PROMO RESELLER (Pusat Depok, Bukti Ditolak)
  await prisma.order.create({
    data: {
      code: 'LVR-20261019-007',
      regionId: pusatRegion.id,
      status: OrderStatus.DIBATALKAN,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Maya Safitri',
      customerPhone: '6285211223344',
      shippingAddress: {
        recipientName: 'Maya Safitri',
        phone: '6285211223344',
        streetAddress: 'Jl. Sukajadi No. 12',
        district: 'Sukajadi',
        city: 'Kota Bandung',
        province: 'Jawa Barat',
        postalCode: '40162',
      },
      subtotal: 35000,
      discountAmount: 3500,
      netPrice: 31500,
      ppnAmount: 3465,
      shippingCost: 9000,
      totalPrice: 43965,
      promoCodeId: promoReseller?.id,
      cancelledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      cancellationReason: 'Foto bukti transfer tidak terbaca / tidak valid',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vCudpahnut.id,
            productName: 'Emboss Split Toe All Variant',
            variantName: 'Cudpahnut',
            quantity: 1,
            priceEach: 35000,
            costEach: 15000,
            packingEach: 2000,
            subtotal: 35000,
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.MANUAL_TRANSFER,
            amount: 43965,
            status: PaymentVerificationStatus.REJECTED,
            rejectionReason: 'Struk transfer tidak mencantumkan nomor rekening tujuan resmi Luvira',
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Pesanan checkout' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.MENUNGGU_VERIFIKASI, note: 'Bukti transfer diunggah' },
          { fromStatus: OrderStatus.MENUNGGU_VERIFIKASI, toStatus: OrderStatus.DIBATALKAN, note: 'Admin menolak bukti transfer tidak valid' },
        ],
      },
    },
  });

  // ORDER 8: KEDALUWARSA — TANPA PROMO (Pusat Depok, Tidak Bayar Dalam 24 Jam)
  await prisma.order.create({
    data: {
      code: 'LVR-20261018-008',
      regionId: pusatRegion.id,
      status: OrderStatus.KEDALUWARSA,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Rina Kusuma',
      customerPhone: '6281822334455',
      shippingAddress: {
        recipientName: 'Rina Kusuma',
        phone: '6281822334455',
        streetAddress: 'Jl. Pemuda No. 7, Rawamangun',
        district: 'Pulo Gadung',
        city: 'Kota Jakarta Timur',
        province: 'DKI Jakarta',
        postalCode: '13220',
      },
      subtotal: 70000,
      discountAmount: 0,
      netPrice: 70000,
      ppnAmount: 7700,
      shippingCost: 9000,
      totalPrice: 86700,
      cancelledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      cancellationReason: 'Batas waktu pembayaran 24 jam telah terlampaui',
      expiresAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            variantId: vPinkBlossom.id,
            productName: 'Black Sole Split Toe All Variant',
            variantName: 'Pink Blossom',
            quantity: 2,
            priceEach: 35000,
            costEach: 16000,
            packingEach: 2000,
            subtotal: 70000,
          },
        ],
      },
      statusLogs: {
        create: [
          { fromStatus: null, toStatus: OrderStatus.MENUNGGU_PEMBAYARAN, note: 'Checkout pesanan' },
          { fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN, toStatus: OrderStatus.KEDALUWARSA, note: 'Cron job otomatis membatalkan pesanan kedaluwarsa' },
        ],
      },
    },
  });

  console.log('================================================================');
  console.log('  LUVIRA 2.0 SHOWCASE SEED BERHASIL');
  console.log('================================================================');
  console.log('  3 Konten Dakwah Syar\'i aktif di /nasihat');
  console.log('  8 Transaksi Beragam Status (Selesai, Dikirim, Diproses, Menunggu, Dibatalkan)');
  console.log('  Variasi Promo: RESELLER2026, JOGJAISTIMEWA, dan Tanpa Promo');
  console.log('  Laporan Owner di /dashboard/owner siap diunduh (CSV/Excel)');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('[Showcase Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
