import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
const DELETED_STATUS = 'deleted';
function disableProfilePatch(now: string) { return { access_status: 'revoked', revoked_at: now, revoked_reason: 'Administrator disabled access' }; }
function enableProfilePatch(actorId: string, now: string) { return { access_status: 'approved', approved_at: now, approved_by: actorId, revoked_at: null, revoked_reason: null }; }
function hasExactConfirmation(expected: string, provided: unknown) { return typeof provided === 'string' && provided === expected; }
function isProfileEnabled(profile: any) { return profile?.access_status === 'approved' && !profile.revoked_at && !profile.deleted_at; }
function isUserListed(profile: any) { return profile?.access_status !== DELETED_STATUS && !profile?.deleted_at; }
function isSoftDeletedBuyer(profile: any) { return profile?.role === 'buyer' && (profile.access_status === DELETED_STATUS || Boolean(profile.deleted_at)); }
function isProtectedOwnerIdentity(profile: any) { return profile?.username?.toLowerCase() === 'owner' || profile?.email?.toLowerCase() === 'min955379@gmail.com'; }
function targetProtectionError(target: any, actor: any, activeAdminCount = 0) {
  if (!target) return 'User not found.';
  if (target.user_id === actor?.user_id) return 'You cannot manage your own account here.';
  if (isProtectedOwnerIdentity(target)) return 'The designated owner account is protected.';
  if (target.role === 'admin') return activeAdminCount <= 1 ? 'The last active administrator is protected.' : 'Administrator accounts cannot be changed in customer user management.';
  if (target.role !== 'buyer') return 'Only customer accounts can be managed here.';
  return null;
}

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = {
  'access-control-allow-origin': 'https://bluepeak-terminal.vercel.app',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-bp-client-ip',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};
const out = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const bad = (message: string, status = 400) => out({ error: message }, status);
const nameOk = (value: string) => /^[A-Za-z0-9._-]{3,32}$/.test(value);
const emailOk = (value: string) => {
  if (value.length > 254 || value !== value.trim() || Array.from(value).some(character => character.charCodeAt(0) <= 32)) return false;
  const at = value.indexOf('@');
  return at > 0 && at === value.lastIndexOf('@') && value.lastIndexOf('.') > at + 1 && value.lastIndexOf('.') < value.length - 1;
};
const identifierOk = (value: string) => value === value.trim() && (nameOk(value) || emailOk(value));
const strong = (value: string) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
const emailFor = (username: string) => `${username.toLowerCase()}@users.bluepeak.invalid`;
const OWNER_EMAIL = 'min955379@gmail.com';
const isOwnerIdentity = (username: string, email: string) => username.toLowerCase() === 'owner' || email.toLowerCase() === OWNER_EMAIL;

function claims(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

async function audit(adminId: string, action: string, targetId: string | null, details: Record<string, unknown>) {
  const { data: actor } = await db.from('bp_profiles').select('username,email').eq('user_id', adminId).maybeSingle();
  const { error } = await db.from('bp_admin_audit').insert({
    admin_user_id: adminId,
    action,
    target_user_id: targetId,
    details: { ...details, actor_user_id_snapshot: adminId, actor_username: actor?.username || null, actor_email: actor?.email || null },
  });
  return error?.message || null;
}

async function revokeSessions(userId: string, now: string, reason: string) {
  const { error } = await db.from('bp_active_sessions')
    .update({ revoked_at: now, revoked_reason: reason })
    .eq('user_id', userId)
    .is('revoked_at', null);
  return error?.message || null;
}

function warningResult(messages: Array<string | null>) {
  const warnings = messages.filter((message): message is string => Boolean(message));
  return warnings.length ? { warning: warnings.join(' ') } : {};
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok');
  if (request.method !== 'POST') return bad('POST required.', 405);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid request.');
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return bad('Admin authentication required.', 401);

  const caller = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return bad('Admin authentication required.', 401);

  const tokenClaims = claims(token);
  if (tokenClaims.aal !== 'aal2' || !tokenClaims.session_id) {
    return bad('Administrator MFA verification required.', 403);
  }

  const { data: actorProfile, error: actorError } = await db.from('bp_profiles')
    .select('user_id,username,role,access_status,revoked_at')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (actorError) return bad('Could not verify administrator profile.', 500);
  if (!actorProfile || actorProfile.role !== 'admin' || actorProfile.access_status !== 'approved' || actorProfile.revoked_at) {
    return bad('Administrator access is not active.', 403);
  }

  const { data: actorSession, error: actorSessionError } = await db.from('bp_active_sessions')
    .select('id,revoked_at')
    .eq('user_id', authData.user.id)
    .eq('auth_session_id', tokenClaims.session_id)
    .maybeSingle();
  if (actorSessionError) return bad('Could not verify administrator session.', 500);
  if (!actorSession || actorSession.revoked_at) return bad('Administrator session was revoked.', 403);

  const action = String(body.action || '');
  const actor = { user_id: authData.user.id, username: actorProfile.username };

  if (action === 'list-audit') {
    const { data: events, error } = await db.from('bp_admin_audit')
      .select('id,action,created_at,admin_user_id,details')
      .order('created_at', { ascending: false }).limit(30);
    if (error) return bad('Could not load administrative audit events.', 500);
    const actorIds = [...new Set((events || []).map(event => event.admin_user_id).filter(Boolean))];
    const { data: actors, error: actorLookupError } = actorIds.length
      ? await db.from('bp_profiles').select('user_id,username').in('user_id', actorIds)
      : { data: [], error: null };
    if (actorLookupError) return bad('Could not load audit actor names.', 500);
    const actorNames = new Map((actors || []).map(actor => [actor.user_id, actor.username]));
    return out({ events: (events || []).map(event => ({
      id: event.id,
      action: event.action,
      created_at: event.created_at,
      actor: actorNames.get(event.admin_user_id) || event.details?.actor_username || 'Former administrator',
      target: event.details?.username || event.details?.email || '—',
    })) });
  }

  if (action === 'list-users') {
    const { data, error } = await db.from('bp_profiles')
      .select('user_id,username,email,role,access_status,created_at,approved_at,revoked_at,deleted_at,deleted_by,deleted_reason')
      .neq('access_status', 'deleted').is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) return bad('Could not load user accounts.', 500);
    return out({ users: (data || []).filter(isUserListed) });
  }

  if (action === 'create-user') {
    const username = String(body.username || '');
    const password = String(body.password || '');
    if (!identifierOk(username)) {
      return bad('Enter a 3–32 character username or a valid email address.');
    }
    if (!strong(password)) return bad('Use at least 12 characters with uppercase, lowercase, and a number.');

    const email = emailOk(username) ? username.toLowerCase() : emailFor(username);
    if (isOwnerIdentity(username, email)) return bad('The designated owner identity is protected.', 403);

    // A legacy soft-deleted profile should not reserve its old username/email forever.
    // Purge only matching soft-deleted customer identities; active or protected records remain conflicts.
    const [byUsername, byEmail] = await Promise.all([
      db.from('bp_profiles').select('user_id,username,email,role,access_status,deleted_at').eq('username', username),
      db.from('bp_profiles').select('user_id,username,email,role,access_status,deleted_at').eq('email', email),
    ]);
    if (byUsername.error || byEmail.error) return bad('Could not check whether the username or email is already in use.', 500);
    const matches = new Map<string, NonNullable<typeof byUsername.data>[number]>();
    for (const profile of [...(byUsername.data || []), ...(byEmail.data || [])]) matches.set(profile.user_id, profile);
    for (const profile of matches.values()) {
      if (isProtectedOwnerIdentity(profile)) return bad('The designated owner identity is protected.', 403);
      if (!isSoftDeletedBuyer(profile)) return bad('That username or email is already in use.', 409);
      const { error: purgeError } = await db.auth.admin.deleteUser(profile.user_id);
      if (purgeError) return bad(`Could not release the matching soft-deleted account: ${purgeError.message}`, 500);
      const { data: stale, error: verifyError } = await db.from('bp_profiles').select('user_id').eq('user_id', profile.user_id).maybeSingle();
      if (verifyError || stale) return bad('The old deleted profile could not be fully removed; no replacement was created.', 500);
    }

    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { bluepeak_username: username },
    });
    if (createError || !created.user) return bad(createError?.message || 'Could not create account.', 400);

    const { error: profileError } = await db.from('bp_profiles').insert({
      user_id: created.user.id,
      email,
      username,
      role: 'buyer',
      access_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: actor.user_id,
    });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      return bad(profileError.code === '23505' ? 'That username or email is already in use.' : profileError.message,
        profileError.code === '23505' ? 409 : 500);
    }
    const auditWarning = await audit(actor.user_id, 'create_user', created.user.id, { username, email });
    return out({ ok: true, username, ...warningResult([auditWarning]) });
  }

  const username = String(body.username || '');
  const { data: target, error: targetError } = await db.from('bp_profiles')
    .select('user_id,username,email,role,access_status,revoked_at,deleted_at')
    .eq('username', username)
    .maybeSingle();
  if (targetError) return bad('Could not look up the selected account.', 500);
  if (!target) return bad('User not found.', 404);

  let activeAdminCount = 0;
  if (target.role === 'admin') {
    const { count, error } = await db.from('bp_profiles').select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin').eq('access_status', 'approved').is('revoked_at', null);
    if (error) return bad('Could not verify administrator protections.', 500);
    activeAdminCount = count || 0;
  }
  const protectionError = targetProtectionError(target, actor, activeAdminCount);
  if (protectionError) return bad(protectionError, 403);

  if (action === 'disable-user' || action === 'revoke-user') {
    if (!isProfileEnabled(target)) return bad('Only an active user can be disabled.', 409);
    const now = new Date().toISOString();
    const { data: updated, error } = await db.from('bp_profiles')
      .update(disableProfilePatch(now))
      .eq('user_id', target.user_id).eq('role', 'buyer').eq('access_status', 'approved')
      .select('user_id').maybeSingle();
    if (error) return bad('Could not disable user access.', 500);
    if (!updated) return bad('The account status changed; reload the user list and try again.', 409);

    const sessionWarning = await revokeSessions(target.user_id, now, 'account_access_disabled');
    const { error: banError } = await db.auth.admin.updateUserById(target.user_id, { ban_duration: '876000h' });
    const auditWarning = await audit(actor.user_id, 'disable_user_access', target.user_id, { username: target.username, email: target.email });
    return out({ ok: true, username: target.username, access_status: 'revoked', ...warningResult([
      sessionWarning,
      banError ? `Application access is disabled, but the Auth-level block needs attention: ${banError.message}` : null,
      auditWarning ? `The access change succeeded, but the audit record needs attention: ${auditWarning}` : null,
    ]) });
  }

  if (action === 'enable-user') {
    const enableableStatus = target.access_status === 'revoked' || target.access_status === 'pending'
      || (target.access_status === 'approved' && Boolean(target.revoked_at));
    if (!enableableStatus || target.deleted_at) return bad('Only a disabled/pending account can be enabled. Deleted accounts cannot be re-enabled.', 409);
    const now = new Date().toISOString();
    const sessionError = await revokeSessions(target.user_id, now, 'account_reenabled_fresh_login_required');
    if (sessionError) return bad('Could not invalidate old sessions; the account remains disabled.', 500);
    const { error: unbanError } = await db.auth.admin.updateUserById(target.user_id, { ban_duration: 'none' });
    if (unbanError) return bad(`Could not restore Auth access: ${unbanError.message}`, 500);

    const { data: updated, error } = await db.from('bp_profiles')
      .update(enableProfilePatch(actor.user_id, now))
      .eq('user_id', target.user_id).eq('role', 'buyer').eq('access_status', target.access_status)
      .select('user_id').maybeSingle();
    if (error || !updated) {
      await db.auth.admin.updateUserById(target.user_id, { ban_duration: '876000h' });
      return bad(error ? 'Could not re-enable the account.' : 'The account status changed; reload the user list and try again.', error ? 500 : 409);
    }
    const auditWarning = await audit(actor.user_id, 'enable_user_access', target.user_id, { username: target.username, email: target.email });
    return out({ ok: true, username: target.username, access_status: 'approved',
      message: 'Access restored. The user can sign in with the existing password; old sessions remain revoked.',
      ...warningResult([auditWarning]) });
  }

  if (action === 'delete-user') {
    if (target.access_status === 'deleted' || target.deleted_at) return bad('This account is already deleted.', 409);
    if (!hasExactConfirmation(`DELETE ${target.username}`, body.confirmation)) {
      return bad(`Confirmation must exactly match: DELETE ${target.username}`, 400);
    }

    const now = new Date().toISOString();
    // Explicitly remove app sessions first; Auth deletion also cascades any remaining sessions.
    const { error: sessionError } = await db.from('bp_active_sessions').delete().eq('user_id', target.user_id);
    if (sessionError) return bad('Could not clear the user sessions; account was not deleted.', 500);

    // Auth deletion cascades bp_profiles and session rows; nullable historical FK references are retained as NULL.
    const { error: deleteError } = await db.auth.admin.deleteUser(target.user_id);
    if (deleteError) return bad(`Permanent deletion failed: ${deleteError.message}`, 500);

    // Keep an immutable audit snapshot without retaining a live FK to the removed user.
    const auditWarning = await audit(actor.user_id, 'delete_user', null, {
      username: target.username,
      email: target.email,
      deleted_user_id: target.user_id,
      deleted_at: now,
    });
    const { data: remainingProfile, error: verifyError } = await db.from('bp_profiles')
      .select('user_id').eq('user_id', target.user_id).maybeSingle();
    if (verifyError || remainingProfile) {
      return bad('The Auth account was deleted, but its profile cleanup needs administrator attention.', 500);
    }
    return out({ ok: true, username: target.username, access_status: 'deleted',
      message: 'Account permanently deleted. Its username and email are available for reuse.',
      ...warningResult([auditWarning ? `Deletion succeeded, but the audit record needs attention: ${auditWarning}` : null]) });
  }

  if (action === 'reset-user-password') {
    if (target.access_status === 'deleted' || target.deleted_at) return bad('Deleted accounts cannot have their password reset.', 409);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const password = Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
    const { error } = await db.auth.admin.updateUserById(target.user_id, { password });
    if (error) return bad(error.message, 500);
    const now = new Date().toISOString();
    const sessionWarning = await revokeSessions(target.user_id, now, 'password_reset');
    const auditWarning = await audit(actor.user_id, 'reset_username_password', target.user_id,
      { username: target.username, email: target.email });
    return out({ ok: true, username: target.username, temporary_password: password,
      notice: 'Shown once only. Share securely; the previous password is not retrievable.',
      ...warningResult([sessionWarning, auditWarning]) });
  }

  return bad('Unknown action.', 404);
});
