import { SignJWT } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'luvira_default_secret_key_change_me_in_production'
);

async function generateToken(role: string, username: string) {
  return new SignJWT({ userId: `user-${role}`, username, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET_KEY);
}

async function testHttpEndpoint(url: string, cookieToken?: string) {
  const headers: Record<string, string> = {};
  if (cookieToken) {
    headers['cookie'] = `luvira_session=${cookieToken}`;
  }

  // redirect: 'manual' agar kita bisa mendeteksi status 307 redirect
  const res = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });

  return {
    status: res.status,
    location: res.headers.get('location'),
  };
}

async function main() {
  console.log('Testing live Next.js HTTP server at http://localhost:3001 ...');

  const adminToken = await generateToken('admin', 'admin_live');
  const ownerToken = await generateToken('owner', 'owner_live');

  // Test 1: Tanpa login ke /dashboard/admin
  const t1 = await testHttpEndpoint('http://localhost:3001/dashboard/admin');
  console.log('1. GET /dashboard/admin (No Auth): Status =', t1.status, 'Location =', t1.location);

  // Test 2: Tanpa login ke /dashboard/owner
  const t2 = await testHttpEndpoint('http://localhost:3001/dashboard/owner');
  console.log('2. GET /dashboard/owner (No Auth): Status =', t2.status, 'Location =', t2.location);

  // Test 3: Admin ke /dashboard/owner
  const t3 = await testHttpEndpoint('http://localhost:3001/dashboard/owner', adminToken);
  console.log('3. GET /dashboard/owner (Admin Cookie): Status =', t3.status, 'Location =', t3.location);

  // Test 4: Owner ke /dashboard/owner
  const t4 = await testHttpEndpoint('http://localhost:3001/dashboard/owner', ownerToken);
  console.log('4. GET /dashboard/owner (Owner Cookie): Status =', t4.status, 'Location =', t4.location);
}

main().catch(console.error);
