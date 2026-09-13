import ImageKit from '@imagekit/nodejs';

// Inisialisasi ImageKit client menggunakan API v7
export const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  // Catatan: publicKey dan urlEndpoint tidak diperlukan lagi di versi V7 untuk proses upload backend.
  // API URL akan secara otomatis menggunakan default https://api.imagekit.io
});

/**
 * Upload file ke ImageKit
 * @param file Buffer dari file gambar atau string base64
 * @param fileName Nama file yang akan disimpan
 * @returns URL publik gambar dari ImageKit
 */
export const uploadToImageKit = async (file: Buffer | string, fileName: string): Promise<string> => {
  try {
    // V7 API: Parameter `file` menerima string (base64/URL) atau tipe spesifik `Uploadable` (seperti File web API).
    // Agar lebih kompatibel dan aman dengan Buffer Node.js, kita ubah Buffer menjadi base64 string.
    const fileToUpload = Buffer.isBuffer(file) ? file.toString('base64') : file;

    const response = await imagekit.files.upload({
      file: fileToUpload,
      fileName,
      folder: '/luvira/products', // Opsional: mengelompokkan gambar dalam folder
    });
    
    return response.url || '';
  } catch (error: any) {
    console.error('[ImageKit] Upload Error:', error);
    // Throw error yang jelas agar tidak silent fail
    throw new Error(error.message || 'Gagal mengunggah gambar ke ImageKit');
  }
};
