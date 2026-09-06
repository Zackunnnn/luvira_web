import { Product } from '@/types/product';

// Helper function to generate clean, high quality inline SVG sock graphics with specific colors
const generateSockImage = (baseColor: string, accentColor: string, style: 'emboss' | 'black-sole' | 'anti-slip' | 'classic'): string => {
  const isSplitToe = style !== 'classic';
  const hasBlackSole = style === 'black-sole';
  const hasAntiSlip = style === 'anti-slip';
  const hasEmboss = style === 'emboss';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDFBF7"/>
        <stop offset="100%" stop-color="#F5F0E6"/>
      </linearGradient>
      <linearGradient id="sockGrad-${baseColor.replace('#', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${baseColor}"/>
        <stop offset="100%" stop-color="${accentColor}"/>
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="2" dy="8" stdDeviation="6" flood-color="#1E4D48" flood-opacity="0.12"/>
      </filter>
    </defs>
    <rect width="400" height="400" rx="32" fill="url(#bgGrad)"/>
    
    <!-- Background Decor Rings -->
    <circle cx="200" cy="200" r="140" fill="none" stroke="${accentColor}" stroke-opacity="0.15" stroke-width="2" stroke-dasharray="6 6"/>
    
    <!-- Main Sock Body Path -->
    <g filter="url(#softShadow)">
      <!-- Sock Cuff & Leg -->
      <path d="M 175,70 L 235,70 C 240,70 244,74 244,79 L 238,200 C 238,220 250,240 270,250 L 290,260 C 310,270 320,290 315,310 C 310,330 288,340 260,340 L 190,340 C 160,340 140,320 140,290 C 140,240 175,200 175,180 Z" 
            fill="url(#sockGrad-${baseColor.replace('#', '')})" />

      <!-- Ribbed Cuff Details -->
      <path d="M 175,70 L 235,70 L 234,95 L 175,95 Z" fill="${accentColor}" opacity="0.4"/>
      <line x1="185" y1="70" x2="185" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="195" y1="70" x2="195" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="205" y1="70" x2="205" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="215" y1="70" x2="215" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="225" y1="70" x2="225" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>

      ${isSplitToe ? `
      <!-- Split Toe Notch (Thumb Separator) -->
      <path d="M 305,295 C 298,295 295,302 295,310 C 295,318 300,322 308,320" fill="none" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
      <line x1="292" y1="285" x2="292" y2="330" stroke="#1E4D48" stroke-opacity="0.2" stroke-width="2"/>
      ` : ''}

      ${hasBlackSole ? `
      <!-- Dark Stain-Resistant Sole -->
      <path d="M 145,280 C 145,335 180,340 260,340 L 310,320 C 315,305 300,290 280,280 Z" fill="#2D3748" opacity="0.88"/>
      ` : ''}

      ${hasAntiSlip ? `
      <!-- Silicon Anti-Slip Micro Grips -->
      <g fill="#1E4D48" opacity="0.75">
        <circle cx="180" cy="325" r="4"/>
        <circle cx="195" cy="325" r="4"/>
        <circle cx="210" cy="325" r="4"/>
        <circle cx="225" cy="325" r="4"/>
        <circle cx="240" cy="325" r="4"/>
        <circle cx="255" cy="325" r="4"/>
        <circle cx="270" cy="320" r="4"/>
        <circle cx="190" cy="312" r="3"/>
        <circle cx="210" cy="312" r="3"/>
        <circle cx="230" cy="312" r="3"/>
        <circle cx="250" cy="312" r="3"/>
      </g>
      ` : ''}

      ${hasEmboss ? `
      <!-- Textured Emboss Lines -->
      <path d="M 180,120 Q 210,130 232,125" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      <path d="M 180,140 Q 210,150 230,145" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      <path d="M 178,160 Q 210,170 230,165" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      <path d="M 182,180 Q 210,190 232,185" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      ` : ''}

      <!-- Luvira Signature Delicate Logo Dot -->
      <circle cx="205" cy="115" r="5" fill="#D78A7E"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'luv-emboss-split',
    name: 'Emboss Split Toe Socks',
    model: 'emboss',
    price: 35000,
    originalPrice: 45000,
    rating: 4.9,
    reviewsCount: 128,
    badge: 'Best Seller',
    description: 'Kaos kaki jempol emboss premium dengan tekstur 3D rajut yang halus, sejuk, dan fleksibel dipakai bersama sandal jepit maupun sepatu.',
    features: [
      'Split-Toe Design (Jempol Terpisah)',
      'Tekstur Knit Emboss Modern 3D',
      'Katun Combed Ultra Soft',
      'Karet Anti-Meral & Non-Binding Cuff'
    ],
    variants: [
      {
        id: 'emb-nude',
        name: 'Nude Cream',
        hex: '#E8D5C4',
        image: generateSockImage('#E8D5C4', '#C9B39F', 'emboss'),
        stock: 50
      },
      {
        id: 'emb-rose',
        name: 'Dusty Rose',
        hex: '#D78A7E',
        image: generateSockImage('#D78A7E', '#B56B5F', 'emboss'),
        stock: 50
      },
      {
        id: 'emb-olive',
        name: 'Sage Olive',
        hex: '#748E44',
        image: generateSockImage('#748E44', '#556A30', 'emboss'),
        stock: 50
      },
      {
        id: 'emb-charcoal',
        name: 'Soft Charcoal',
        hex: '#4A5568',
        image: generateSockImage('#4A5568', '#2D3748', 'emboss'),
        stock: 50
      },
      {
        id: 'emb-mocha',
        name: 'Mocha Brown',
        hex: '#8B6A56',
        image: generateSockImage('#8B6A56', '#694F40', 'emboss'),
        stock: 50
      }
    ]
  },
  {
    id: 'luv-black-sole-split',
    name: 'Black Sole Split Toe Socks',
    model: 'black-sole',
    price: 38000,
    originalPrice: 48000,
    rating: 4.95,
    reviewsCount: 210,
    badge: 'Most Popular',
    description: 'Sol bagian bawah berwarna gelap tahan noda tanah/debu. Sangat cocok untuk muslimah aktif dan penggunaan harian luar ruangan.',
    features: [
      'Alas Hitam Anti Noda',
      'Ergonomis Jempol Split-Toe',
      'Serat Katun Anti Bau & Breathable',
      'Perlindungan Ekstra Telapak'
    ],
    variants: [
      {
        id: 'bs-beige',
        name: 'Beige Sand',
        hex: '#E3D0B9',
        image: generateSockImage('#E3D0B9', '#C4AF98', 'black-sole'),
        stock: 50
      },
      {
        id: 'bs-latte',
        name: 'Muted Latte',
        hex: '#C5A880',
        image: generateSockImage('#C5A880', '#9F825B', 'black-sole'),
        stock: 50
      },
      {
        id: 'bs-white',
        name: 'Cloud White',
        hex: '#F7FAFC',
        image: generateSockImage('#F7FAFC', '#E2E8F0', 'black-sole'),
        stock: 50
      },
      {
        id: 'bs-grey',
        name: 'Steel Grey',
        hex: '#718096',
        image: generateSockImage('#718096', '#4A5568', 'black-sole'),
        stock: 50
      },
      {
        id: 'bs-navy',
        name: 'Navy Blue',
        hex: '#2A4365',
        image: generateSockImage('#2A4365', '#1E3048', 'black-sole'),
        stock: 50
      }
    ]
  },
  {
    id: 'luv-anti-slip-split',
    name: 'Anti Slip Split Toe Socks',
    model: 'anti-slip',
    price: 38000,
    originalPrice: 50000,
    rating: 4.88,
    reviewsCount: 94,
    badge: 'Safe Grip',
    description: 'Dilengkapi silicon bintik anti-slip di telapak bawah untuk cengkeraman maksimal saat beribadah di sajadah mulus maupun lantai licin.',
    features: [
      'Silicon Anti-Slip Grid Telapak',
      'Desain Split-Toe Nyaman',
      'Mencegah Tergelincir di Lantai Licin',
      'Bahan Adem & Menyerap Keringat'
    ],
    variants: [
      {
        id: 'as-sage',
        name: 'Sage Green',
        hex: '#748E44',
        image: generateSockImage('#748E44', '#556A30', 'anti-slip'),
        stock: 50
      },
      {
        id: 'as-pink',
        name: 'Blossom Pink',
        hex: '#E2A9A1',
        image: generateSockImage('#E2A9A1', '#C7877F', 'anti-slip'),
        stock: 50
      },
      {
        id: 'as-cream',
        name: 'Cream Tan',
        hex: '#EBDCB9',
        image: generateSockImage('#EBDCB9', '#CFBE9B', 'anti-slip'),
        stock: 50
      },
      {
        id: 'as-slate',
        name: 'Deep Slate',
        hex: '#1E4D48',
        image: generateSockImage('#1E4D48', '#143632', 'anti-slip'),
        stock: 50
      }
    ]
  }
];

export const PRODUCTS = MOCK_PRODUCTS;
