// components/checkout/CascadingAddressCombobox.tsx
// ============================================================================
// Komponen Form Alamat Cascading & Quick Search Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.1, 13 (E2E-13)
// Mobile-first, Keyboard navigable, Auto-save ke localStorage
// ============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, Loader2, Navigation } from 'lucide-react';

export interface AddressDestination {
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  subDistrictId: string;
  subDistrictName: string;
  postalCode: string;
  street: string;
  rtRw?: string;
  benchmark?: string;
}

interface CascadingAddressProps {
  value: AddressDestination;
  onChange: (dest: AddressDestination) => void;
  error?: string;
}

export const CascadingAddressCombobox: React.FC<CascadingAddressProps> = ({
  value,
  onChange,
  error,
}) => {
  // Mode: "quick" (pencarian cepat) atau "manual" (bertingkat)
  const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');

  // GPS Geolocation state
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Quick search state
  const [quickQuery, setQuickQuery] = useState('');
  const [quickResults, setQuickResults] = useState<any[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [showQuickDropdown, setShowQuickDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Cascading states
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [subDistricts, setSubDistricts] = useState<any[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubDistricts, setLoadingSubDistricts] = useState(false);

  // Fungsi Deteksi Lokasi Otomatis dari Perangkat (Browser Geolocation API)
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsMessage({
        type: 'error',
        text: 'Perangkat atau browser Anda tidak mendukung akses lokasi GPS.',
      });
      return;
    }

    setIsDetectingGps(true);
    setGpsMessage({
      type: 'info',
      text: 'Meminta izin akses lokasi perangkat Anda...',
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsMessage({
          type: 'info',
          text: 'Koordinat GPS diterima! Menghubungkan ke wilayah pengiriman...',
        });

        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(
            `/api/shipping/destinations?type=gps&lat=${lat}&lng=${lng}`
          );
          const json = await res.json();

          if (json.success && json.data) {
            const d = json.data;
            onChange({
              ...value,
              provinceId: d.provinceId,
              provinceName: d.provinceName,
              cityId: d.cityId,
              cityName: d.cityName,
              districtId: d.districtId,
              districtName: d.districtName,
              subDistrictId: d.subDistrictId,
              subDistrictName: d.subDistrictName,
              postalCode: d.postalCode,
              street: d.street ? (value.street ? value.street : d.street) : value.street,
            });

            setQuickQuery(
              d.formattedAddress ||
                `${d.subDistrictName}, ${d.districtName}, ${d.cityName}`
            );

            setGpsMessage({
              type: 'success',
              text: `Wilayah terdeteksi: ${d.cityName}, ${d.provinceName} (${d.postalCode})`,
            });
          } else {
            setGpsMessage({
              type: 'error',
              text:
                json.error ||
                'Nama wilayah tidak dapat dicocokkan otomatis. Silakan gunakan Cari Cepat.',
            });
          }
        } catch (err: any) {
          console.error('[GPS Geolocation Error]', err);
          setGpsMessage({
            type: 'error',
            text: 'Gagal mendeteksi wilayah dari server. Silakan ketik nama kota di Cari Cepat.',
          });
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMessage({
            type: 'error',
            text: 'Izin lokasi tidak diberikan. Anda tetap bisa memilih wilayah via Cari Cepat di bawah.',
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsMessage({
            type: 'error',
            text: 'Informasi lokasi tidak tersedia pada perangkat ini. Silakan gunakan Cari Cepat.',
          });
        } else {
          setGpsMessage({
            type: 'error',
            text: 'Waktu deteksi lokasi habis. Silakan gunakan Cari Cepat di bawah.',
          });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Load provinces awal
  useEffect(() => {
    let isMounted = true;
    setLoadingProvinces(true);
    fetch('/api/shipping/destinations?type=provinces')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setProvinces(json.data);
        }
      })
      .catch((err) => console.error('[Fetch Provinces Error]', err))
      .finally(() => {
        if (isMounted) setLoadingProvinces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick search debounce 400ms (E2E-13)
  useEffect(() => {
    if (quickQuery.trim().length < 3) {
      setQuickResults([]);
      setShowQuickDropdown(false);
      return;
    }

    setIsSearchingQuick(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/shipping/destinations?type=quick&q=${encodeURIComponent(quickQuery)}`
        );
        const json = await res.json();
        if (json.success) {
          setQuickResults(json.data || []);
          setShowQuickDropdown(true);
          setHighlightedIndex(0);
        }
      } catch (err) {
        console.error('[Quick Search Error]', err);
      } finally {
        setIsSearchingQuick(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [quickQuery]);

  // Load cities jika provinceId berubah
  useEffect(() => {
    if (!value.provinceId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    fetch(`/api/shipping/destinations?type=cities&provinceId=${value.provinceId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCities(json.data);
      })
      .catch(console.error)
      .finally(() => setLoadingCities(false));
  }, [value.provinceId]);

  // Load districts jika cityId berubah
  useEffect(() => {
    if (!value.cityId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    fetch(`/api/shipping/destinations?type=districts&cityId=${value.cityId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDistricts(json.data);
      })
      .catch(console.error)
      .finally(() => setLoadingDistricts(false));
  }, [value.cityId]);

  // Load subdistricts jika districtId berubah
  useEffect(() => {
    if (!value.districtId) {
      setSubDistricts([]);
      return;
    }
    setLoadingSubDistricts(true);
    fetch(`/api/shipping/destinations?type=subdistricts&districtId=${value.districtId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSubDistricts(json.data);
      })
      .catch(console.error)
      .finally(() => setLoadingSubDistricts(false));
  }, [value.districtId]);

  // Pilih item dari Quick Search
  const handleSelectQuickResult = (item: any) => {
    onChange({
      ...value,
      provinceId: item.provinceId,
      provinceName: item.provinceName,
      cityId: item.cityId,
      cityName: item.cityName,
      districtId: item.districtId,
      districtName: item.districtName,
      subDistrictId: item.subDistrictId,
      subDistrictName: item.subDistrictName,
      postalCode: item.postalCode,
    });
    setQuickQuery(item.label);
    setShowQuickDropdown(false);
  };

  // Navigasi keyboard pada quick search dropdown
  const handleKeyDownQuick = (e: React.KeyboardEvent) => {
    if (!showQuickDropdown || quickResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < quickResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : quickResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < quickResults.length) {
        handleSelectQuickResult(quickResults[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowQuickDropdown(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 text-stone-800 shadow-sm sm:p-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-emerald-700" />
          <h3 className="text-sm font-semibold text-stone-900 sm:text-base">
            Alamat Pengiriman
          </h3>
        </div>
        <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            id="tab-quick-search"
            onClick={() => setActiveTab('quick')}
            className={`rounded-md px-2.5 py-1 transition ${
              activeTab === 'quick'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Cari Cepat
          </button>
          <button
            type="button"
            id="tab-manual-search"
            onClick={() => setActiveTab('manual')}
            className={`rounded-md px-2.5 py-1 transition ${
              activeTab === 'manual'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Pilih Bertingkat
          </button>
        </div>
      </div>

      {/* BANNER DETEKSI LOKASI OTOMATIS (GPS DEVICE) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-3.5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <Navigation className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Deteksi Wilayah Otomatis (Izin Lokasi Perangkat)
              </p>
              <p className="text-[11px] text-emerald-800/90 leading-tight">
                Tanpa perlu memilih manual — tekan tombol untuk mengizinkan deteksi otomatis lokasi & ongkir Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-detect-gps-location"
            onClick={handleDetectLocation}
            disabled={isDetectingGps}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isDetectingGps ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Mendeteksi...</span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5" />
                <span>Gunakan Lokasi Saya</span>
              </>
            )}
          </button>
        </div>

        {gpsMessage && (
          <div
            id="gps-feedback-message"
            className={`mt-2.5 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
              gpsMessage.type === 'success'
                ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300'
                : gpsMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {gpsMessage.type === 'success' && (
              <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            )}
            {gpsMessage.type === 'info' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700 shrink-0" />
            )}
            <span className="flex-1">{gpsMessage.text}</span>
          </div>
        )}
      </div>

      {/* 1. CARI CEPAT AUTOCOMPLETE (DEBOUNCED 400MS) */}
      {activeTab === 'quick' && (
        <div className="relative">
          <label
            htmlFor="input-quick-destination"
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Ketik Kelurahan, Kecamatan, atau Kota
          </label>
          <div className="relative">
            <input
              id="input-quick-destination"
              ref={quickInputRef}
              type="text"
              autoComplete="off"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              onKeyDown={handleKeyDownQuick}
              onFocus={() => quickResults.length > 0 && setShowQuickDropdown(true)}
              placeholder="Contoh: Kemirimuka, Beji, Depok"
              className="w-full rounded-lg border border-stone-300 py-2.5 pl-9 pr-8 text-sm placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            {isSearchingQuick && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-stone-400" />
            )}
          </div>

          {/* Dropdown Quick Search */}
          {showQuickDropdown && quickResults.length > 0 && (
            <div
              id="quick-destination-dropdown"
              className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
            >
              {quickResults.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSelectQuickResult(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex w-full items-center px-3 py-2 text-left text-xs transition ${
                    highlightedIndex === index
                      ? 'bg-emerald-50 text-emerald-900 font-medium'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <MapPin className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Info terpilih dari quick search */}
          {value.provinceName && (
            <div className="mt-2 rounded-lg bg-emerald-50/60 p-2.5 text-xs text-emerald-900 border border-emerald-200/50">
              <span className="font-semibold">Lokasi Terpilih: </span>
              {value.subDistrictName ? `${value.subDistrictName}, ` : ''}
              {value.districtName ? `${value.districtName}, ` : ''}
              {value.cityName}, {value.provinceName} {value.postalCode}
            </div>
          )}
        </div>
      )}

      {/* 2. PILIH BERTINGKAT (PROVINSI -> KOTA -> KECAMATAN -> KELURAHAN) */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Provinsi */}
          <div>
            <label
              htmlFor="select-province"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              Provinsi *
            </label>
            <div className="relative">
              <select
                id="select-province"
                value={value.provinceId}
                onChange={(e) => {
                  const pId = e.target.value;
                  const pObj = provinces.find((p) => p.id === pId);
                  onChange({
                    ...value,
                    provinceId: pId,
                    provinceName: pObj?.name || '',
                    cityId: '',
                    cityName: '',
                    districtId: '',
                    districtName: '',
                    subDistrictId: '',
                    subDistrictName: '',
                    postalCode: '',
                  });
                }}
                disabled={loadingProvinces}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-8 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-stone-100"
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Kota / Kabupaten */}
          <div>
            <label
              htmlFor="select-city"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              Kota / Kabupaten *
            </label>
            <div className="relative">
              <select
                id="select-city"
                value={value.cityId}
                onChange={(e) => {
                  const cId = e.target.value;
                  const cObj = cities.find((c) => c.id === cId);
                  onChange({
                    ...value,
                    cityId: cId,
                    cityName: cObj ? `${cObj.type} ${cObj.name}` : '',
                    districtId: '',
                    districtName: '',
                    subDistrictId: '',
                    subDistrictName: '',
                    postalCode: cObj?.postalCode || '',
                  });
                }}
                disabled={!value.provinceId || loadingCities}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-8 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-stone-100"
              >
                <option value="">-- Pilih Kota/Kabupaten --</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Kecamatan */}
          <div>
            <label
              htmlFor="select-district"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              Kecamatan *
            </label>
            <div className="relative">
              <select
                id="select-district"
                value={value.districtId}
                onChange={(e) => {
                  const dId = e.target.value;
                  const dObj = districts.find((d) => d.id === dId);
                  onChange({
                    ...value,
                    districtId: dId,
                    districtName: dObj?.name || '',
                    subDistrictId: '',
                    subDistrictName: '',
                  });
                }}
                disabled={!value.cityId || loadingDistricts}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-8 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-stone-100"
              >
                <option value="">-- Pilih Kecamatan --</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Kelurahan & Kode Pos */}
          <div>
            <label
              htmlFor="select-subdistrict"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              Kelurahan / Desa *
            </label>
            <div className="relative">
              <select
                id="select-subdistrict"
                value={value.subDistrictId}
                onChange={(e) => {
                  const sdId = e.target.value;
                  const sdObj = subDistricts.find((sd) => sd.id === sdId);
                  onChange({
                    ...value,
                    subDistrictId: sdId,
                    subDistrictName: sdObj?.name || '',
                    postalCode: sdObj?.postalCode || value.postalCode,
                  });
                }}
                disabled={!value.districtId || loadingSubDistricts}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-8 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-stone-100"
              >
                <option value="">-- Pilih Kelurahan --</option>
                {subDistricts.map((sd) => (
                  <option key={sd.id} value={sd.id}>
                    {sd.name} ({sd.postalCode})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>
        </div>
      )}

      {/* 3. DETAIL ALAMAT: JALAN, RT/RW, NOMOR, PATOKAN (E2E-13) */}
      <div className="space-y-3 pt-2">
        <div>
          <label
            htmlFor="input-street-address"
            className="mb-1 block text-xs font-medium text-stone-700"
          >
            Nama Jalan, Gang, Blok, No. Rumah *
          </label>
          <input
            id="input-street-address"
            type="text"
            required
            value={value.street || ''}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="Contoh: Jl. Margonda Raya No. 45 RT 02/RW 03"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="input-rtrw"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              RT / RW (Opsional)
            </label>
            <input
              id="input-rtrw"
              type="text"
              value={value.rtRw || ''}
              onChange={(e) => onChange({ ...value, rtRw: e.target.value })}
              placeholder="02/03"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="input-postal-code"
              className="mb-1 block text-xs font-medium text-stone-600"
            >
              Kode Pos *
            </label>
            <input
              id="input-postal-code"
              type="text"
              required
              value={value.postalCode || ''}
              onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
              placeholder="16424"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="input-benchmark"
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Patokan Kurir (Opsional)
          </label>
          <input
            id="input-benchmark"
            type="text"
            value={value.benchmark || ''}
            onChange={(e) => onChange({ ...value, benchmark: e.target.value })}
            placeholder="Dekat Masjid Nurul Huda / Pagar Hitam"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-rose-600" id="address-error-message">
          {error}
        </p>
      )}
    </div>
  );
};
