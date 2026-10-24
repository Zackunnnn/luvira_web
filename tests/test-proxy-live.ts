import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { SignJWT } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'luvira_default_secret_key_change_me_in_production'
);

async function generateTestToken(role: string, username: string) {
  return new SignJWT({ userId: `user-${role}`, username, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET_KEY);
}

function createRequest(urlPath: string, cookieValue?: string): NextRequest {
  const url = `http://localhost:3000${urlPath}`;
  const req = new NextRequest(url, {
    headers: cookieValue ? { cookie: `luvira_session=${cookieValue}` } : {},
  });
  return req;
}

async function runTests() {
  console.log('=== PENGUJIAN OTENTIKASI & OTORISASI PROXY.TS ===\n');

  const adminToken = await generateTestToken('admin', 'admin_test');
  const ownerToken = await generateTestToken('owner', 'owner_test');

  const testCases = [
    {
      name: 'Kasus 1: Akses /dashboard/admin TANPA LOGIN',
      path: '/dashboard/admin',
      cookie: undefined,
      expected: 'Redirect ke /dashboard/login',
    },
    {
      name: 'Kasus 2: Akses /dashboard/owner TANPA LOGIN',
      path: '/dashboard/owner',
      cookie: undefined,
      expected: 'Redirect ke /dashboard/login',
    },
    {
      name: 'Kasus 3: Akses /dashboard/admin DENGAN SESI ADMIN',
      path: '/dashboard/admin',
      cookie: adminToken,
      expected: 'Lolos (NextResponse.next / status 200)',
    },
    {
      name: 'Kasus 4: Akses /dashboard/owner DENGAN SESI ADMIN (Bukan Owner)',
      path: '/dashboard/owner',
      cookie: adminToken,
      expected: 'Ditolak & Redirect ke /dashboard/admin',
    },
    {
      name: 'Kasus 5: Akses /dashboard/admin DENGAN SESI OWNER',
      path: '/dashboard/admin',
      cookie: ownerToken,
      expected: 'Lolos (NextResponse.next / status 200)',
    },
    {
      name: 'Kasus 6: Akses /dashboard/owner DENGAN SESI OWNER',
      path: '/dashboard/owner',
      cookie: ownerToken,
      expected: 'Lolos (NextResponse.next / status 200)',
    },
    {
      name: 'Kasus 7: Akses /dashboard/login DENGAN SESI ADMIN (Auto-redirect)',
      path: '/dashboard/login',
      cookie: adminToken,
      expected: 'Redirect ke /dashboard/admin',
    },
    {
      name: 'Kasus 8: Akses /dashboard/login DENGAN SESI OWNER (Auto-redirect)',
      path: '/dashboard/login',
      cookie: ownerToken,
      expected: 'Redirect ke /dashboard/owner',
    },
  ];

  const results: any[] = [];

  for (const tc of testCases) {
    const req = createRequest(tc.path, tc.cookie);
    const res = await proxy(req);
    const location = res.headers.get('location');
    const status = res.status;

    let behavior = '';
    let pass = false;

    if (location) {
      const targetPath = new URL(location).pathname;
      behavior = `Redirect (${status}) -> ${targetPath}`;
      if (tc.expected.includes(targetPath)) {
        pass = true;
      }
    } else {
      behavior = `Lolos (NextResponse.next / ${status})`;
      if (tc.expected.includes('Lolos')) {
        pass = true;
      }
    }

    results.push({
      Kasus: tc.name,
      'Ekspektasi': tc.expected,
      'Hasil Aktual': behavior,
      'Status': pass ? 'PASS' : 'FAIL',
    });
  }

  console.table(results);
}

runTests().catch(console.error);
