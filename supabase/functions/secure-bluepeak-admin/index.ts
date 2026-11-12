import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import {
  disableProfilePatch,
  enableProfilePatch,
  hasExactConfirmation,
  isProfileEnabled,
  softDeleteProfilePatch,
  targetProtectionError,
} from './user-management-rules.mjs';

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
const emailOk = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const identifierOk = (value: string) => value === value.trim() && (nameOk(value) || emailOk(value));
const strong = (value: string) => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
const emailFor = (username: string) => `${username.toLowerCase()}@users.bluepeak.invalid`;

function claims(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

async function audit(adminId: string, action: string, targetId: string | null, details: Record<string, unknown>) {
  const { error } = await db.from('bp_admin_audit').insert({
    admin_user_id: adminId,
    action,
    target_user_id: targetId,
    details,
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

  if (action === 'list-users') {
    const { data, error } = await db.from('bp_profiles')
      .select('user_id,username,email,role,access_status,created_at,approved_at,revoked_at,deleted_at,deleted_by,deleted_reason')
      .order('created_at', { ascending: false });
    if (error) return bad('Could not load user accounts.', 500);
    return out({ users: data || [], can_purge_deleted_users: actorProfile.username === 'owner' });
  }

  if (action === 'create-user') {
    const username = String(body.username || '');
    const password = String(body.password || '');
    if (!identifierOk(username)) {
      return bad('Enter a 3–32 character username or a valid email address.');
    }
    if (!strong(password)) return bad('Use at least 12 characters with uppercase, lowercase, and a number.');

    const { data: existing, error: existingError } = await db.from('bp_profiles')
      .select('user_id').eq('username', username).limit(1);
    if (existingError) return bad('Could not check whether the username is already in use.', 500);
    if (existing?.length) return bad('That username or email is already in use.', 409);

    const email = emailOk(username) ? username : emailFor(username);
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
    const { data: updated, error } = await db.from('bp_profiles')
      .update(softDeleteProfilePatch(actor.user_id, now))
      .eq('user_id', target.user_id).eq('role', 'buyer').neq('access_status', 'deleted')
      .select('user_id').maybeSingle();
    if (error) return bad('Could not soft-delete the user account.', 500);
    if (!updated) return bad('The account status changed; reload the user list and try again.', 409);

    const sessionWarning = await revokeSessions(target.user_id, now, 'account_soft_deleted');
    const { error: banError } = await db.auth.admin.updateUserById(target.user_id, { ban_duration: '876000h' });
    const auditWarning = await audit(actor.user_id, 'soft_delete_user', target.user_id, {
      username: target.username,
      email: target.email,
      deleted_at: now,
    });
    return out({ ok: true, username: target.username, access_status: 'deleted',
      message: 'Account soft-deleted; profile and related data are retained.',
      ...warningResult([
        sessionWarning,
        banError ? `Application access is blocked, but the Auth-level block needs attention: ${banError.message}` : null,
        auditWarning ? `Deletion succeeded, but the audit record needs attention: ${auditWarning}` : null,
      ]) });
  }

  if (action === 'purge-deleted-user') {
    if (actor.username !== 'owner') return bad('Only the designated owner can permanently purge a deleted account.', 403);
    if (target.access_status !== 'deleted' || !target.deleted_at) return bad('Only soft-deleted accounts can be permanently purged.', 409);
    if (!hasExactConfirmation(`PURGE ${target.username}`, body.confirmation)) {
      return bad(`Confirmation must exactly match: PURGE ${target.username}`, 400);
    }
    const { error } = await db.auth.admin.deleteUser(target.user_id);
    if (error) return bad(`Permanent deletion failed without removing the profile: ${error.message}`, 500);

    // Existing FK rules cascade profile/session rows and set historical user references to NULL.
    const auditWarning = await audit(actor.user_id, 'purge_deleted_user', null, {
      username: target.username,
      email: target.email,
      purged_user_id: target.user_id,
    });
    return out({ ok: true, username: target.username, access_status: 'purged',
      ...warningResult([auditWarning ? `Permanent deletion succeeded, but the audit record needs attention: ${auditWarning}` : null]) });
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
