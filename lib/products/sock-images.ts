// lib/products/sock-images.ts
// ============================================================================
// Resolver Gambar Kaus Kaki Luvira 2.0
// Memastikan gambar kaus kaki SELALU tampil di hosting tanpa broken image:
// 1. Ekstrak kode foto (est1-est7, bsst1-bsst8, bs1-bs3, as1-as3, e1-e5) dari URL ImageKit / path lokal
// 2. Prioritaskan aset WebP ringan di /socks-web/ (50-100KB) dengan fallback /socks/ (1.6-2.4MB)
// 3. Fallback pemetaan nama varian (misal "Cudpahnut" -> "est6")
// 4. Fallback inline SVG kristal tajam jika file tidak ditemukan
// ============================================================================

export const VARIANT_CODE_MAP: Record<string, string> = {
  cudpahnut: 'est6',
  'special tan': 'est5',
  'deep sea': 'est1',
  treehouse: 'est3',
  'boho pink': 'est4',
  tin: 'est2',
  'floral blue': 'est7',
  'black skin': 'e1',
  penelope: 'bsst6',
  cuddle: 'e4',
  'paper blue': 'e3',
  'ivory silk': 'bs1',
  ebb: 'bs3',
  'raspberry ripple': 'bs2',
  'dark taupe': 'bsst8',
  'manatee gray': 'bsst5',
  'brushed black': 'bsst3',
  'pastel blue': 'bsst4',
  'winter blue': 'bsst2',
  'pink blossom': 'bsst1',
  powder: 'bsst7',
  'white marble': 'as1',
  'pink aura': 'as3',
  'tender light blue': 'as2',
};

export const MODEL_DEFAULT_PHOTO: Record<string, string> = {
  emboss: '/socks-web/est1.webp',
  'black-sole': '/socks-web/bsst1.webp',
  'anti-slip': '/socks-web/as1.webp',
  classic: '/socks-web/e1.webp',
};

/**
 * Generate clean, high-quality inline SVG sock graphics as ultimate guaranteed fallback
 */
export function generateSockSvg(
  baseColor = '#D78A7E',
  accentColor = '#B56B5F',
  style: 'emboss' | 'black-sole' | 'anti-slip' | 'classic' = 'emboss'
): string {
  const isSplitToe = style !== 'classic';
  const hasBlackSole = style === 'black-sole';
  const hasAntiSlip = style === 'anti-slip';

  const cleanBase = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  const cleanAccent = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;
  const gradId = `sockGrad-${cleanBase.replace(/[^a-zA-Z0-9]/g, '')}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDFBF7"/>
        <stop offset="100%" stop-color="#F5F0E6"/>
      </linearGradient>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cleanBase}"/>
        <stop offset="100%" stop-color="${cleanAccent}"/>
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="2" dy="8" stdDeviation="6" flood-color="#1E4D48" flood-opacity="0.12"/>
      </filter>
    </defs>
    <rect width="400" height="400" rx="32" fill="url(#bgGrad)"/>
    <circle cx="200" cy="200" r="140" fill="none" stroke="${cleanAccent}" stroke-opacity="0.15" stroke-width="2" stroke-dasharray="6 6"/>
    <g filter="url(#softShadow)">
      <path d="M 175,70 L 235,70 C 240,70 244,74 244,79 L 238,200 C 238,220 250,240 270,250 L 290,260 C 310,270 320,290 315,310 C 310,330 288,340 260,340 L 190,340 C 160,340 140,320 140,290 C 140,240 175,200 175,180 Z" 
            fill="url(#${gradId})" />
      <path d="M 175,70 L 235,70 L 234,95 L 175,95 Z" fill="${cleanAccent}" opacity="0.4"/>
      <line x1="185" y1="70" x2="185" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="195" y1="70" x2="195" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="205" y1="70" x2="205" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="215" y1="70" x2="215" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      <line x1="225" y1="70" x2="225" y2="95" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
      ${isSplitToe ? `
      <path d="M 305,295 C 298,295 295,302 295,310 C 295,318 300,322 308,320" fill="none" stroke="${cleanAccent}" stroke-width="3" stroke-linecap="round"/>
      <line x1="292" y1="285" x2="292" y2="330" stroke="#1E4D48" stroke-opacity="0.2" stroke-width="2"/>
      ` : ''}
      ${hasBlackSole ? `
      <path d="M 145,280 C 145,335 180,340 260,340 L 310,320 C 315,305 300,290 280,280 Z" fill="#2D3748" opacity="0.88"/>
      ` : ''}
      ${hasAntiSlip ? `
      <g fill="#1E4D48" opacity="0.75">
        <circle cx="180" cy="325" r="4"/>
        <circle cx="195" cy="325" r="4"/>
        <circle cx="210" cy="325" r="4"/>
        <circle cx="225" cy="325" r="4"/>
        <circle cx="240" cy="325" r="4"/>
        <circle cx="255" cy="325" r="4"/>
      </g>
      ` : ''}
      <circle cx="205" cy="115" r="5" fill="${cleanAccent}"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves a variant image string to a working URL (preferring /socks-web/*.webp)
 */
export function resolveSockImage(
  rawUrl?: string | null,
  variantName?: string | null,
  variantHex?: string | null,
  model?: string | null
): string {
  const url = (rawUrl || '').trim();

  // 1. Jika URL memuat kode seperti -est6_ atau /socks/est6.webp atau /socks-web/est6.webp
  const codeMatch = url.match(/(?:-|\/)(as\d+|bsst\d+|bs\d+|est\d+|e\d+)(?:_|\.webp|\.jpg|\.png)?/i);
  if (codeMatch && codeMatch[1]) {
    const code = codeMatch[1].toLowerCase();
    return `/socks-web/${code}.webp`;
  }

  // 2. Cek pemetaan nama varian (misal "Cudpahnut")
  if (variantName) {
    const nameKey = variantName.toLowerCase().trim();
    const mappedCode = VARIANT_CODE_MAP[nameKey];
    if (mappedCode) {
      return `/socks-web/${mappedCode}.webp`;
    }
  }

  // 3. Jika URL adalah data URI SVG atau HTTP valid yang bukan ImageKit lama
  if (url.startsWith('data:image/') || (url.startsWith('http') && !url.includes('ik.imagekit.io/awan1177'))) {
    return url;
  }

  // 4. Default berdasarkan model produk
  if (model && MODEL_DEFAULT_PHOTO[model]) {
    return MODEL_DEFAULT_PHOTO[model];
  }

  // 5. Fallback SVG
  return generateSockSvg(variantHex || '#D78A7E', variantHex || '#B56B5F', (model as any) || 'emboss');
}

/**
 * Image onError fallback handler for <img> elements
 */
export function handleSockImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackHex = '#D78A7E',
  model = 'emboss'
) {
  const target = e.currentTarget;
  const currentSrc = target.src || '';

  // 1. Jika gagal memuat /socks-web/xxx.webp, coba /socks/xxx.webp
  if (currentSrc.includes('/socks-web/')) {
    target.src = currentSrc.replace('/socks-web/', '/socks/');
    return;
  }

  // 2. Jika gagal memuat /socks/xxx.webp atau URL remote, fallback ke default est1.webp
  if (!currentSrc.includes('/socks-web/est1.webp') && !currentSrc.startsWith('data:image/svg')) {
    target.src = '/socks-web/est1.webp';
    return;
  }

  // 3. Fallback mutlak: inline SVG data URL
  target.src = generateSockSvg(fallbackHex, fallbackHex, model as any);
}
