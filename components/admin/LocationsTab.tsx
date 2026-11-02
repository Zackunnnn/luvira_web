'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { MapPin, Truck, Check, AlertCircle, Loader2, Save } from 'lucide-react';

interface RegionItem {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string;
  province: string;
  address: string;
  originId: string;
  activeCouriers: string[];
  isActive: boolean;
  coverages?: any[];
}

const SUPPORTED_COURIERS = [
  { id: 'jnt', name: 'J&T Express', desc: 'Layanan EZ & COD' },
  { id: 'jne', name: 'JNE Express', desc: 'Layanan REG, OKE, YES' },
  { id: 'sicepat', name: 'SiCepat Ekspres', desc: 'Layanan REG, HALU' },
];

export function LocationsTab({ user }: { user: any }) {
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Couriers state per region id: { [regionId]: ['jne', 'jnt'] }
  const [selectedCouriers, setSelectedCouriers] = useState<Record<string, string[]>>({});

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/locations');
      if (!res.ok) {
        throw new Error('Gagal mengambil data wilayah.');
      }
      const data = await res.json();
      const list: RegionItem[] = data.regions || [];
      setRegions(list);

      // Initialize courier selections
      const initialMap: Record<string, string[]> = {};
      list.forEach((r) => {
        initialMap[r.id] = (r.activeCouriers && r.activeCouriers.length > 0)
          ? r.activeCouriers.map((c) => c.toLowerCase())
          : ['jne', 'sicepat', 'jnt'];
      });
      setSelectedCouriers(initialMap);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleToggleCourier = (regionId: string, courierId: string) => {
    setSelectedCouriers((prev) => {
      const current = prev[regionId] || [];
      const isSelected = current.includes(courierId);
      let updated: string[];

      if (isSelected) {
        // Jangan izinkan uncheck semua kurir
        if (current.length === 1) {
          alert('Setidaknya satu kurir ekspedisi harus aktif untuk wilayah ini.');
          return prev;
        }
        updated = current.filter((c) => c !== courierId);
      } else {
        updated = [...current, courierId];
      }

      return {
        ...prev,
        [regionId]: updated,
      };
    });
  };

  const handleSaveCouriers = async (region: RegionItem) => {
    const couriers = selectedCouriers[region.id] || [];
    setSavingId(region.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: region.id,
          activeCouriers: couriers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan kurir.');
      }

      setSuccessMessage(`Kurir ekspedisi untuk cabang ${region.name} berhasil disimpan: ${couriers.map((c) => c.toUpperCase()).join(', ')}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchLocations();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-charcoal">
        <Loader2 className="w-8 h-8 animate-spin text-deep-forest mr-3" />
        <span>Memuat data wilayah & kurir...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-deep-forest flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-700" />
            Manajemen Kurir Ekspedisi per Wilayah
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Admin Pusat dapat mengontrol kurir ekspedisi yang dapat diakses oleh masing-masing wilayah cabang.
            Hanya kurir yang diaktifkan yang akan tampil di pilihan checkout pembeli saat pesanan ditangani oleh gudang tersebut.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid Region Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {regions.map((region) => {
          const regionActiveCouriers = selectedCouriers[region.id] || [];
          const isSaving = savingId === region.id;

          return (
            <div
              key={region.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between hover:border-emerald-600/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {region.type === 'PUSAT' ? 'Gudang Pusat' : 'Cabang Wilayah'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-2">{region.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{region.city}, {region.province} (Origin RajaOngkir: {region.originId})</span>
                    </div>
                  </div>
                </div>

                {/* Courier Selection List */}
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Pilihan Kurir Ekspedisi Aktif:
                  </p>

                  <div className="space-y-2.5">
                    {SUPPORTED_COURIERS.map((courier) => {
                      const isChecked = regionActiveCouriers.includes(courier.id);

                      return (
                        <label
                          key={courier.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCourier(region.id, courier.id)}
                              className="w-4 h-4 text-emerald-700 rounded border-gray-300 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-semibold">{courier.name}</div>
                              <div className="text-xs text-gray-500">{courier.desc}</div>
                            </div>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {isChecked ? 'AKTIF' : 'NONAKTIF'}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-400 italic pt-1">
                    *Contoh: Jika hanya J&T yang dicentang, pembeli dari cabang ini hanya dapat memilih ekspedisi J&T.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {regionActiveCouriers.length} kurir terpilih
                </div>
                <Button
                  onClick={() => handleSaveCouriers(region)}
                  disabled={isSaving}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Kurir Wilayah</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
