import { describe, it, expect } from 'vitest';
import {
  resolveSockImage,
  generateSockSvg,
  VARIANT_CODE_MAP,
  MODEL_DEFAULT_PHOTO,
} from '@/lib/products/sock-images';

describe('Sock Images Resolver & Fallback System', () => {
  it('berhasil mengekstrak kode foto dari URL ImageKit lama dan mengarahkannya ke /socks-web/*.webp', () => {
    const oldUrl = 'https://ik.imagekit.io/awan1177/luvira/products/1789102201329-est6_ErIWNwZld.jpg';
    const resolved = resolveSockImage(oldUrl, 'Cudpahnut', '#e2be9e', 'emboss');
    expect(resolved).toBe('/socks-web/est6.webp');
  });

  it('mengonversi path /socks/*.webp yang berat ke /socks-web/*.webp yang ringan', () => {
    const rawUrl = '/socks/bsst1.webp';
    const resolved = resolveSockImage(rawUrl, 'Pink Blossom', '#E2A9A1', 'black-sole');
    expect(resolved).toBe('/socks-web/bsst1.webp');
  });

  it('memetakan varian berdasarkan nama jika URL kosong atau tidak valid', () => {
    const resolved = resolveSockImage('', 'Special Tan', '#e3bea8', 'emboss');
    expect(resolved).toBe('/socks-web/est5.webp');
  });

  it('memetakan varian nama Cudpahnut ke est6', () => {
    const resolved = resolveSockImage(null, 'Cudpahnut', '#e2be9e', 'emboss');
    expect(resolved).toBe('/socks-web/est6.webp');
  });

  it('menghasilkan SVG tajam sebagai fallback terakhir jika URL dan nama varian tidak dikenal', () => {
    const resolved = resolveSockImage('', 'Custom Warna Unik', '#123456');
    expect(resolved).toContain('data:image/svg+xml;utf8');
    expect(resolved).toContain('%23123456');
  });

  it('fungsi generateSockSvg menghasilkan data URL SVG valid untuk berbagai model', () => {
    const svgEmboss = generateSockSvg('#E8D5C4', '#C9B39F', 'emboss');
    expect(svgEmboss).toContain('data:image/svg+xml');
    
    const svgBlackSole = generateSockSvg('#FFFFFF', '#000000', 'black-sole');
    expect(svgBlackSole).toContain('data:image/svg+xml');
  });
});
