// data/products.ts
// ============================================================================
// Katalog Produk Kaus Kaki Luvira 2.0 (5 Produk Asli & 26 Varian Warna Lengkap)
// Diselaraskan 1-to-1 dengan backups/Product.json, backups/ColorVariant.json,
// dan aset foto resolusi tinggi teroptimasi WebP di /socks-web/*.webp
// ============================================================================

import { Product } from '@/types/product';
import { generateSockSvg } from '@/lib/products/sock-images';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'luv-admin-1789102214581',
    name: 'Emboss Split Toe All Variant',
    model: 'emboss-split-toe',
    price: 35000,
    originalPrice: 45000,
    rating: 4.9,
    reviewsCount: 128,
    badge: 'Must Have',
    description:
      "Kaos kaki jempol emboss dari Luvira, didesain untuk kamu yang mengutamakan kenyamanan tanpa mengorbankan gaya. Terbuat dari bahan nylon premium yang lembut di kulit, elastis, dan tetap nyaman dipakai seharian — cocok untuk aktivitas harian maupun tampilan syar'i yang tetap chic.",
    features: [
      'Bahan Nylon Premium — lembut, elastis, dan breathable seharian',
      'Desain Emboss Eksklusif — motif unik 3D rajut yang nggak pasaran',
      'Tahan Lama & Anti Melar — jahitan rapi, kualitas terjaga meski dicuci berulang',
      'Desain Split-Toe Ergonomis — nyaman dipakai sandal maupun sepatu',
    ],
    variants: [
      {
        id: 'var-1789102181091-u87dx',
        name: 'Cudpahnut',
        hex: '#e2be9e',
        image: '/socks-web/est6.webp',
        stock: 50,
      },
      {
        id: 'var-1789262469407-6wt4k',
        name: 'Special Tan',
        hex: '#e3bea8',
        image: '/socks-web/est5.webp',
        stock: 50,
      },
      {
        id: 'var-1789262495519-0xqar',
        name: 'Deep Sea',
        hex: '#113b4f',
        image: '/socks-web/est1.webp',
        stock: 50,
      },
      {
        id: 'var-1789262514343-bhrr2',
        name: 'Treehouse',
        hex: '#392723',
        image: '/socks-web/est3.webp',
        stock: 50,
      },
      {
        id: 'var-1789262514734-imp1v',
        name: 'Boho Pink',
        hex: '#f0bdbe',
        image: '/socks-web/est4.webp',
        stock: 50,
      },
      {
        id: 'var-1789262515127-3qlku',
        name: 'Tin',
        hex: '#e3e0e6',
        image: '/socks-web/est2.webp',
        stock: 50,
      },
      {
        id: 'var-1789262515511-nj631',
        name: 'Floral Blue',
        hex: '#92b1d5',
        image: '/socks-web/est7.webp',
        stock: 50,
      },
    ],
  },
  {
    id: 'luv-admin-1789264533619',
    name: 'Black Sole Split Toe All Variant',
    model: 'black-sole-split-toe',
    price: 35000,
    originalPrice: 45000,
    rating: 4.95,
    reviewsCount: 210,
    badge: 'Best Seller',
    description:
      'Kaos kaki jempol black sole dari Luvira, didesain untuk kamu yang mengutamakan kenyamanan tanpa khawatir kotor. Sol bawah berwarna gelap tahan noda debu/tanah, sangat cocok untuk muslimah aktif dan kegiatan luar ruangan.',
    features: [
      'Alas Hitam Anti Noda — bagian telapak gelap tidak mudah terlihat kotor',
      'Bahan Nylon Premium — lembut, sejuk, dan elastisitas tinggi',
      'Desain Split-Toe Ergonomis — fleksibel bergerak seharian',
      'Tahan Lama & Anti Melar — jahitan kokoh tahan cuci mesin',
    ],
    variants: [
      {
        id: 'var-1789264186647-ooka3',
        name: 'Penelope',
        hex: '#ebc9b0',
        image: '/socks-web/bsst6.webp',
        stock: 50,
      },
      {
        id: 'var-1789264293334-cpmkx',
        name: 'Pink Blossom',
        hex: '#f3d1d8',
        image: '/socks-web/bsst1.webp',
        stock: 50,
      },
      {
        id: 'var-1789264292503-t34o5',
        name: 'Winter Blue',
        hex: '#283858',
        image: '/socks-web/bsst2.webp',
        stock: 50,
      },
      {
        id: 'var-1789264291616-ptqg0',
        name: 'Brushed Black',
        hex: '#39363c',
        image: '/socks-web/bsst3.webp',
        stock: 50,
      },
      {
        id: 'var-1789264292095-qrh2h',
        name: 'Pastel Blue',
        hex: '#c9d7e4',
        image: '/socks-web/bsst4.webp',
        stock: 50,
      },
      {
        id: 'var-1789264290559-9vozg',
        name: 'Manatee Gray',
        hex: '#949097',
        image: '/socks-web/bsst5.webp',
        stock: 50,
      },
      {
        id: 'var-1789264293655-uuee8',
        name: 'Powder',
        hex: '#f4f3f8',
        image: '/socks-web/bsst7.webp',
        stock: 50,
      },
      {
        id: 'var-1789264290167-7rggj',
        name: 'Dark Taupe',
        hex: '#372a2a',
        image: '/socks-web/bsst8.webp',
        stock: 50,
      },
    ],
  },
  {
    id: 'luv-admin-1789264862842',
    name: 'Anti-Slip Split Toe All Variant',
    model: 'anti-slip-split-toe',
    price: 40000,
    originalPrice: 45000,
    rating: 4.88,
    reviewsCount: 94,
    badge: 'Safe Grip',
    description:
      'Kaos kaki jempol anti-slip dari Luvira, dilengkapi silicon dot grip premium di telapak bawah untuk mencegah tergelincir di lantai licin, sajadah masjid, maupun anak tangga saat beraktivitas.',
    features: [
      'Silicone Anti-Slip Grid — cengkeraman mantap di segala permukaan licin',
      'Bahan Nylon Premium — adem, lembut, dan menyerap kelembapan kaki',
      'Desain Split-Toe Nyaman — fleksibel dipakai sehari-hari',
      'Anti Melar & Jahitan Rapi — awet dipakai jangka panjang',
    ],
    variants: [
      {
        id: 'var-1789264622121-tb37e',
        name: 'White Marble',
        hex: '#e7e7eb',
        image: '/socks-web/as1.webp',
        stock: 50,
      },
      {
        id: 'var-1789264777351-24yqe',
        name: 'Pink Aura',
        hex: '#edd3dd',
        image: '/socks-web/as3.webp',
        stock: 50,
      },
      {
        id: 'var-1789264777687-8qa0r',
        name: 'Tender Light Blue',
        hex: '#cad6e4',
        image: '/socks-web/as2.webp',
        stock: 50,
      },
    ],
  },
  {
    id: 'luv-admin-1789263524386',
    name: 'Emboss All Variant',
    model: 'emboss',
    price: 30000,
    originalPrice: 40000,
    rating: 4.75,
    reviewsCount: 68,
    badge: 'Everyday Basic',
    description:
      'Kaos kaki polos classic emboss dengan rajutan motif geometris 3D yang elegan. Model standard cuff tanpa belah jempol, cocok untuk sepatu sneakers, flat shoes, maupun sepatu kerja harian.',
    features: [
      'Bahan Nylon Premium — serat rajut lembut & breathable',
      'Motif Knit Emboss 3D Eksklusif — modis dan elegan',
      'Model Round-Toe Classic — fleksibel untuk berbagai model sepatu',
      'Karet Elastis Pas — tidak menekan betis dan tidak mudah melorot',
    ],
    variants: [
      {
        id: 'var-1789263230479-o0v6n',
        name: 'Black Skin',
        hex: '#523226',
        image: '/socks-web/e1.webp',
        stock: 50,
      },
      {
        id: 'var-1789263324759-b1i4n',
        name: 'Penelope',
        hex: '#edc7b0',
        image: '/socks-web/e2.webp',
        stock: 50,
      },
      {
        id: 'var-1789263325199-csz7a',
        name: 'Cuddle',
        hex: '#ebc3ca',
        image: '/socks-web/e4.webp',
        stock: 50,
      },
      {
        id: 'var-1789263328446-std2d',
        name: 'Paper Blue',
        hex: '#bfd1e1',
        image: '/socks-web/e3.webp',
        stock: 50,
      },
      {
        id: 'var-1789263438784-ifq05',
        name: 'Tin',
        hex: '#e6e5e9',
        image: '/socks-web/e5.webp',
        stock: 50,
      },
    ],
  },
  {
    id: 'luv-admin-1789264150617',
    name: 'Black Sole All Variant',
    model: 'black-sole',
    price: 35000,
    originalPrice: 45000,
    rating: 4.82,
    reviewsCount: 85,
    badge: 'Anti Noda',
    description:
      'Kaos kaki model round-toe classic dengan teknologi dark sole anti kotor di bagian telapak. Menjaga kaus kaki tetap terlihat bersih dan segar meski beraktivitas seharian tanpa alas sepatu.',
    features: [
      'Telapak Hitam Anti Noda — noda debu & lantai tidak tampak',
      'Bahan Nylon Premium — sejuk dan elastis di kaki',
      'Model Classic Round-Toe — pas untuk sepatu sneakers dan kerja',
      'Awet & Tahan Lama — jahitan dobel di bagian tumit dan jari',
    ],
    variants: [
      {
        id: 'var-1789263524387-1sap9',
        name: 'Ivory Silk',
        hex: '#E8D5C4',
        image: '/socks-web/bs1.webp',
        stock: 50,
      },
      {
        id: 'var-1789264048903-j1r82',
        name: 'Raspberry Ripple',
        hex: '#eec1c8',
        image: '/socks-web/bs2.webp',
        stock: 50,
      },
      {
        id: 'var-1789264045760-6ba2w',
        name: 'Ebb',
        hex: '#e8e1e6',
        image: '/socks-web/bs3.webp',
        stock: 50,
      },
    ],
  },
];

export const PRODUCTS = MOCK_PRODUCTS;
