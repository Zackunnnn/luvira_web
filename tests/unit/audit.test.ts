// tests/unit/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audit } from '@/lib/audit';
import { prisma } from '@/lib/db';

describe('Audit Log Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mencatat audit log append-only dengan parameter lengkap', async () => {
    const createSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({
      id: 'audit-1',
      actorId: 'user-1',
      actorName: 'Admin Pusat',
      actorRole: 'ADMIN_PUSAT',
      action: 'UPDATE_PRICE',
      entity: 'Product',
      entityId: 'prod-1',
      before: { price: 30000 },
      after: { price: 35000 },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    });

    await audit({
      actor: {
        id: 'user-1',
        name: 'Admin Pusat',
        role: 'ADMIN_PUSAT',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
      action: 'UPDATE_PRICE',
      entity: 'Product',
      entityId: 'prod-1',
      before: { price: 30000 },
      after: { price: 35000 },
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'UPDATE_PRICE',
          entity: 'Product',
          entityId: 'prod-1',
        }),
      })
    );
  });

  it('tidak melempar exception fatal jika pencatatan audit log gagal', async () => {
    vi.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB Connection Timeout'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      audit({
        action: 'DELETE_PROMO',
        entity: 'PromoCode',
        entityId: 'promo-1',
      })
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
