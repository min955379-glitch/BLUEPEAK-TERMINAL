const assert = require('node:assert/strict');
const handler = require('./api/gateway.js');

const events = [];
const sessions = {
  'buyer-token': { approved: true, role: 'buyer', aal2: false },
  'admin-token': { approved: true, role: 'admin', aal2: true },
  'admin-aal1-token': { approved: true, role: 'admin', aal2: false },
  'unknown-token': { approved: true, role: 'unexpected', aal2: false },
  'revoked-token': { approved: false },
  'refreshed-buyer-token': { approved: true, role: 'buyer', aal2: false },
};

global.fetch = async (input, init = {}) => {
  const url = String(input);
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body || {};
  events.push({ url, action: body.action, method: init.method });

  if (url.endsWith('/functions/v1/bluepeak-access')) {
    const token = (init.headers?.authorization || '').replace(/^Bearer\s+/, '');
    if (body.action === 'status') {
      const profile = sessions[token] || { approved: false };
      return Response.json(profile, { status: 200 });
    }
    if (body.action === 'logout') return Response.json({ ok: true }, { status: 200 });
  }
  if (url.endsWith('/functions/v1/secure-bluepeak-admin')) {
    return Response.json({ ok: true, users: [] }, { status: 200 });
  }
  if (url.endsWith('/functions/v1/secure-bluepeak-auth')) {
    return Response.json({ ok: true, role: 'buyer', access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600 }, { status: 200 });
  }
  if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
    if (body.refresh_token === 'good-refresh') {
      return Response.json({ access_token: 'refreshed-buyer-token', refresh_token: 'rotated-refresh', expires_in: 3600 }, { status: 200 });
    }
    return Response.json({ error: 'expired' }, { status: 401 });
  }
  return Response.json({ error: 'unexpected mock request' }, { status: 500 });
};

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = Buffer.isBuffer(value) ? value.toString() : value; },
  };
}
async function request(path, { method = 'GET', cookie = '', accept = 'text/html', body } = {}) {
  const req = {
    url: `/api/gateway?path=${encodeURIComponent(path)}`,
    method,
    headers: { cookie, accept, host: 'bluepeak-terminal.vercel.app' },
    body,
  };
  const res = makeRes();
  await handler(req, res);
  return res;
}
function location(res) { return res.headers.location; }

(async () => {
  // Signed out: only the login shells are directly visible; every app route and asset is guarded.
  assert.equal((await request('/')).statusCode, 200);
  assert.match((await request('/')).body, /Welcome back/);
  assert.equal((await request('/admin')).statusCode, 200);
  assert.match((await request('/admin')).body, /Administrator sign in/);
  const loginPage = await request('/login');
  assert.equal(loginPage.statusCode, 200); assert.match(loginPage.body, /Username or email/);
  assert.match(loginPage.body, /href=\"\/admin\"/);
  assert.match(loginPage.body, /https:\/\/wa\.me\//);
  assert.match(loginPage.body, /rel=\"noopener\"/);
  assert.match(loginPage.body, /fetch\('\/api\/auth'/);
  assert.match(loginPage.body, /username:f\.username\.value,password:f\.password\.value/);
  assert.match(loginPage.body, /window\.crypto\.getRandomValues/);
  assert.doesNotMatch(loginPage.body, /crypto\.randomUUID\(\)\.replaceAll/);
  let res = await request('/app');
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/');
  res = await request('/pattern-scanner.js');
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/');
  res = await request('/admin/dashboard');
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin');
  res = await request('/app', { cookie: 'bp_at=%E0%A4%A' });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/');
  res = await request('/admin/users');
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin');
  res = await request('/admin/dashboard/');
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin');
  assert.equal((await request('/api/admin', { method: 'POST', body: { action: 'list-users' } })).statusCode, 401);

  // Customer session: customer site works; admin login and all admin assets/APIs are denied.
  const buyer = 'bp_at=buyer-token; bp_rt=buyer-refresh';
  assert.equal((await request('/app', { cookie: buyer })).statusCode, 200);
  res = await request('/login', { cookie: buyer });
  assert.equal(res.statusCode, 200); assert.match(res.body, /Username or email/);
  // A buyer cookie must not send /admin away from the admin sign-in page. Keep
  // protected admin resources customer-denied, but let a legitimate admin sign in.
  res = await request('/admin', { cookie: buyer });
  assert.equal(res.statusCode, 200); assert.match(res.body, /Administrator sign in/);
  res = await request('/admin/dashboard', { cookie: buyer });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/app');
  res = await request('/app/admin', { cookie: buyer });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/app');
  res = await request('/admin/users', { cookie: buyer, accept: 'application/json' });
  assert.equal(res.statusCode, 403);
  res = await request('/api/admin', { method: 'POST', cookie: buyer, body: { action: 'list-users' } });
  assert.equal(res.statusCode, 403);

  // Admin MFA/AAL2 session: role redirects and portal access are correct; customer assets are not.
  const admin = 'bp_at=admin-token; bp_rt=admin-refresh';
  res = await request('/', { cookie: admin });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin/dashboard');
  res = await request('/login', { cookie: admin });
  assert.equal(res.statusCode, 200); assert.match(res.body, /Username or email/);
  assert.equal(res.headers['set-cookie'], undefined, 'Opening the customer login must not mutate the admin session');
  res = await request('/admin', { cookie: admin });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin/dashboard');
  res = await request('/admin/dashboard', { cookie: admin });
  assert.equal(res.statusCode, 200); assert.match(res.body, /Administrator dashboard/);
  res = await request('/app', { cookie: admin });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin/dashboard');
  assert.equal((await request('/api/admin', { method: 'POST', cookie: admin, body: { action: 'list-users' } })).statusCode, 200);
  res = await request('/app/admin', { cookie: admin });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin/users');
  assert.equal((await request('/pattern-scanner.js', { cookie: admin })).statusCode, 403);

  // An administrator without a verified AAL2 claim must re-authenticate for portal pages.
  const adminAal1 = 'bp_at=admin-aal1-token; bp_rt=aal1-refresh';
  res = await request('/admin', { cookie: adminAal1 });
  assert.equal(res.statusCode, 200); assert.match(res.body, /Administrator sign in/);
  res = await request('/admin/dashboard', { cookie: adminAal1 });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/admin');
  assert.equal((await request('/api/admin', { method: 'POST', cookie: adminAal1, body: { action: 'list-users' } })).statusCode, 403);

  // A valid refresh token silently renews an expired access token and preserves the session.
  res = await request('/app', { cookie: 'bp_at=expired-access; bp_rt=good-refresh' });
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['set-cookie']), /rotated-refresh/);

  // Unknown roles fail closed; expired/revoked sessions lose access and cookies.
  res = await request('/', { cookie: 'bp_at=unknown-token; bp_rt=unknown-refresh' });
  assert.equal(res.statusCode, 403);
  res = await request('/app', { cookie: 'bp_at=revoked-token; bp_rt=expired-refresh' });
  assert.equal(res.statusCode, 302); assert.equal(location(res), '/');
  assert.match(String(res.headers['set-cookie']), /Max-Age=0/);

  // Logout still revokes the server-side active session and clears secure HttpOnly cookies.
  res = await request('/api/logout', { method: 'POST', cookie: buyer });
  assert.equal(res.statusCode, 200);
  const cookies = String(res.headers['set-cookie']);
  assert.match(cookies, /HttpOnly/); assert.match(cookies, /Secure/); assert.match(cookies, /Max-Age=0/);
  assert.ok(events.some(e => e.action === 'logout'));

  // Login responses set server-only session cookies; they do not expose tokens in JSON.
  res = await request('/api/auth', { method: 'POST', body: { action: 'user-login', username: 'customer', password: 'test-password', device_id: 'test-device-identifier-001' } });
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(res.body, /fresh-access|fresh-refresh/);
  assert.match(String(res.headers['set-cookie']), /HttpOnly/);
  assert.match(String(res.headers['set-cookie']), /Secure/);

  // The approved-user UI no longer contains the two requested buttons or a duplicate admin UI;
  // the dedicated administrator portal keeps its logout controls and backend route.
  const fs = require('node:fs');
  const ui = fs.readFileSync(require.resolve('./bluepeak-access-ui.js'), 'utf8');
  const app = fs.readFileSync(require.resolve('./index.html'), 'utf8');
  assert.doesNotMatch(ui, /Admin panel|Sign out this device|bp-admin-open|bp-logout|adminList/);
  assert.match(app, /id="customer-logout"/);
  assert.match(app, /fetch\('\/api\/logout'/);
  const dashboard = fs.readFileSync(require.resolve('./admin-dashboard.html'), 'utf8');
  const users = fs.readFileSync(require.resolve('./admin-users.html'), 'utf8');
  const portal = fs.readFileSync(require.resolve('./admin-portal.js'), 'utf8');
  const authFn = fs.readFileSync(require.resolve('./supabase/functions/secure-bluepeak-auth/index.ts'), 'utf8');
  const adminFn = fs.readFileSync(require.resolve('./supabase/functions/secure-bluepeak-admin/index.ts'), 'utf8');
  const migration = fs.readFileSync(require.resolve('./supabase/migrations/20261112124634_allow_email_identifiers.sql'), 'utf8');
  assert.match(dashboard, /id="signout"/); assert.match(users, /id="signout"/);
  assert.match(users, /Username or email/);
  assert.match(app, /min-width:320px/);
  assert.match(app, /Mobile viewport containment/);
  assert.match(authFn, /identifierOk\(username\)/);
  assert.match(authFn, /action==='revoke-user'/);
  assert.match(authFn, /emailOk\(username\)\?username:emailFor\(username\)/);
  assert.match(adminFn, /emailOk\(username\)\?username:/);
  assert.match(migration, /bp_profiles_username_identifier_check/);
  assert.match(migration, /bp_profiles_username_lower_idx/);
  const adminLogin = (await request('/admin')).body;
  assert.match(adminLogin, /href="\/login">Return to user login/);
  assert.match(adminLogin, /<style>\*\{box-sizing:border-box\}body/);
  assert.match(ui, /@media\(max-width:720px\)\{\.bp-access\{order:-1;scroll-margin-top:68px\}\}/);
  assert.match(dashboard, /href="\/login" target="_blank" rel="noopener noreferrer">View Website<\/a>/);
  assert.match(dashboard, /href="\/admin\/users"/);
  assert.match(portal, /\/api\/logout/);
  assert.match(portal, /create-user/);
  assert.match(portal, /reset-user-password/);
  assert.match(portal, /revoke-user/);
  assert.match(portal, /if \(\$\('#users'\)\) loadUsers\(\)/, 'admin users list must load on initial page entry');
  assert.match(portal, /request timed out/i, 'admin API must time out with a recoverable message');
  assert.match(portal, /retry\.textContent = 'Retry'/, 'failed user list should offer retry');

  console.log('PASS test-gateway-auth: signed-out/buyer/admin login routing, return-to-login path, customer/admin authorization, AAL2, silent session refresh, expired sessions, logout/cookies, identifier UI, admin user-list auto-load/retry, and button preservation.');
})().catch(err => { console.error(err); process.exitCode = 1; });
