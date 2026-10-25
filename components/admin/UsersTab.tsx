'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  RefreshCw,
  X,
  MapPin,
  Lock,
  UserCheck,
  UserX
} from 'lucide-react';

interface UsersTabProps {
  user: any;
}

export const UsersTab: React.FC<UsersTabProps> = ({ user }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regionId, setRegionId] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setRegions(data.regions || []);
        if (data.regions && data.regions.length > 0 && !regionId) {
          setRegionId(data.regions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin users', err);
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateAdmin = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Nama, email, dan kata sandi wajib diisi.');
      return;
    }
    if (!regionId) {
      setFormError('Wilayah tugas cabang wajib dipilih.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          regionId,
          phone: phone.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal menambahkan admin wilayah.');
      }

      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSuccessMsg(`Akun Admin Wilayah "${json.user?.name}" berhasil dibuat!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat membuat akun.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: any) => {
    const nextStatus = !targetUser.isActive;
    const actionText = nextStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun ${targetUser.name}?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetUser.id,
          isActive: nextStatus,
        }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Hak Akses Admin Pusat */}
      <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-deep-forest text-warm-cream">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-stone-900">
              Pengelolaan Akun Admin Cabang Wilayah
            </h4>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Admin Pusat dapat mendaftarkan akun admin cabang baru dan mengatur status keaktifan akun demi keamanan data. Sistem mengunci agar akun Owner dan Developer tidak dapat diubah dari sini.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setFormError('');
          }}
          className="px-4 py-2 bg-deep-forest hover:bg-deep-forest/90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          id="btn-open-create-admin"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Admin Cabang</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-deep-forest" />
              <span>Daftar Akun Admin Wilayah Aktif</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Admin yang berwenang mengelola operasional pesanan dan stok di gudang masing-masing cabang.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat daftar akun...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <Users className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Belum Ada Admin Wilayah</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="p-3.5">Nama Admin</th>
                  <th className="p-3.5">Email Pengguna</th>
                  <th className="p-3.5">Wilayah Tugas</th>
                  <th className="p-3.5">Terakhir Login</th>
                  <th className="p-3.5">Status Akun</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="font-extrabold text-stone-900">{u.name}</div>
                      <div className="text-[11px] text-stone-500">{u.phone || '-'}</div>
                    </td>

                    <td className="p-3.5 font-mono text-stone-700 font-semibold">
                      {u.email}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {u.region?.name || 'Yogyakarta (DIY)'}
                      </span>
                    </td>

                    <td className="p-3.5 text-stone-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah login'}
                    </td>

                    <td className="p-3.5">
                      {u.isActive ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          u.isActive
                            ? 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: TAMBAH ADMIN WILAYAH BARU (SKENARIO 3)             */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-deep-forest" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Tambah Akun Admin Wilayah
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Lengkap Admin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Admin Wilayah Solo / Surabaya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  id="input-admin-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="admin.cabang@luvira.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  id="input-admin-email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Kata Sandi Sementara <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Minimal 8 karakter..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
                  id="input-admin-password"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Wilayah Tugas Cabang <span className="text-red-500">*</span>
                </label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold"
                  id="select-admin-region"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nomor WhatsApp Kontak (Opsional):
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={submitting}
                className="flex-1 py-2.5 bg-deep-forest hover:bg-deep-forest/90 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-submit-admin"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Buat Akun Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
