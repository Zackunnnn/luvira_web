import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocodeCoordinates } from '@/lib/shipping/geolocation';

describe('GPS Geolocation & Reverse Geocoding Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('berhasil memetakan koordinat Kota Yogyakarta ke RajaOngkir DIY', async () => {
    // Mock fetch respons Nominatim
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          address: {
            road: 'Jalan Malioboro',
            suburb: 'Suryatmajan',
            city_district: 'Danurejan',
            city: 'Kota Yogyakarta',
            state: 'Daerah Istimewa Yogyakarta',
            postcode: '55213',
          },
        }),
      } as any;
    });

    const res = await reverseGeocodeCoordinates(-7.797068, 110.370529);
    expect(res).not.toBeNull();
    expect(res?.provinceName).toContain('Yogyakarta');
    expect(res?.cityName).toContain('Yogyakarta');
    expect(res?.districtName).toBe('Danurejan');
    expect(res?.street).toBe('Jalan Malioboro');
  });

  it('berhasil memetakan koordinat Kota Depok ke RajaOngkir Pusat Jawa Barat', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          address: {
            road: 'Jl. Margonda Raya No. 100',
            suburb: 'Kemirimuka',
            city_district: 'Beji',
            city: 'Kota Depok',
            state: 'Jawa Barat',
            postcode: '16423',
          },
        }),
      } as any;
    });

    const res = await reverseGeocodeCoordinates(-6.3728, 106.8317);
    expect(res).not.toBeNull();
    expect(res?.provinceName).toBe('Jawa Barat');
    expect(res?.cityName).toBe('Kota Depok');
    expect(res?.districtName).toBe('Beji');
    expect(res?.subDistrictName).toBe('Kemirimuka');
  });
});
