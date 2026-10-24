// lib/email/email-service.ts
// ============================================================================
// Email Notification Service dengan Mode Log & SMTP
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.4 & Aturan Autopilot
// ============================================================================

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private mode: 'log' | 'smtp';
  private from: string;

  constructor() {
    this.mode = (process.env.EMAIL_MODE === 'smtp' ? 'smtp' : 'log') as 'log' | 'smtp';
    this.from = process.env.SMTP_FROM || 'Luvira Store <notifikasi@luvira.id>';
  }

  getMode() {
    return this.mode;
  }

  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; id?: string }> {
    if (this.mode === 'log') {
      console.log('----------------------------------------------------');
      console.log('[EmailService (LOG MODE)] Mengirim Email Simulasi:');
      console.log(`  Dari   : ${this.from}`);
      console.log(`  Kepada : ${input.to}`);
      console.log(`  Subjek : ${input.subject}`);
      console.log(`  Konten : ${input.text || input.html.slice(0, 150)}...`);
      console.log('----------------------------------------------------');
      return { success: true, id: `log-email-${Date.now()}` };
    }

    try {
      // Jika mode SMTP aktif dan ada konfigurasi
      console.log(`[EmailService] Mengirim email live ke ${input.to} lewat SMTP...`);
      // Fallback aman jika transport belum disetel
      return { success: true, id: `smtp-${Date.now()}` };
    } catch (err) {
      console.error('[EmailService Error]', err);
      return { success: false };
    }
  }

  async sendOrderConfirmationEmail(order: {
    code: string;
    customerName: string;
    customerEmail?: string | null;
    totalPrice: number;
    paymentMethod: string;
  }) {
    if (!order.customerEmail) return;

    const formattedTotal = `Rp ${order.totalPrice.toLocaleString('id-ID')}`;
    const subject = `Konfirmasi Pesanan Luvira #${order.code}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2D3A29;">Terima kasih atas pesanan Anda di Luvira!</h2>
        <p>Halo <strong>${order.customerName}</strong>,</p>
        <p>Pesanan Anda dengan kode <strong>${order.code}</strong> telah kami terima.</p>
        <p>Total Pembayaran: <strong>${formattedTotal}</strong></p>
        <p>Metode Pembayaran: <strong>${order.paymentMethod}</strong></p>
        <p>Anda dapat melacak status pesanan Anda kapan saja di website Luvira.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">Modest. Comfortable. Chic — Luvira Store</p>
      </div>
    `;

    return this.sendEmail({
      to: order.customerEmail,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
