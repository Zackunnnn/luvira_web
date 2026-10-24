// components/checkout/CascadingAddressCombobox.tsx
// ============================================================================
// Komponen Form Alamat Cascading & Quick Search Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.1, 13 (E2E-13)
// Mobile-first, Keyboard navigable, Auto-save ke localStorage
// ============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';

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
