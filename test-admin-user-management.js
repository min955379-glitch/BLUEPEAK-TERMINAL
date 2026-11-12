const assert = require('node:assert/strict');
const fs = require('node:fs');
const rules = import('./supabase/functions/secure-bluepeak-admin/user-management-rules.mjs');

(async () => {
  const { disableProfilePatch, enableProfilePatch, softDeleteProfilePatch, isProfileEnabled,
    targetProtectionError, hasExactConfirmation } = await rules;
  const timestamp = '2026-11-12T12:00:00.000Z';
  const actor = { user_id: 'admin-id', username: 'owner' };
  const original = {
    user_id: 'buyer-id', username: 'buyer-one', email: 'buyer@example.invalid', role: 'buyer',
    access_status: 'approved', created_at: '2026-01-01T00:00:00.000Z', custom_profile_data: 'keep-me',
    revoked_at: null, deleted_at: null,
  };

  // Disable changes access state but leaves identity/profile/business data intact.
  const disabled = { ...original, ...disableProfilePatch(timestamp) };
  assert.equal(disabled.access_status, 'revoked');
  assert.equal(disabled.revoked_at, timestamp);
  assert.equal(isProfileEnabled(disabled), false);
  assert.equal(disabled.user_id, original.user_id);
  assert.equal(disabled.custom_profile_data, original.custom_profile_data);
  assert.equal(disabled.created_at, original.created_at);

  // One enable operation restores the existing account and credentials; it doesn't clear old sessions.
  const enabled = { ...disabled, ...enableProfilePatch(actor.user_id, timestamp) };
  assert.equal(enabled.access_status, 'approved');
  assert.equal(enabled.approved_by, actor.user_id);
  assert.equal(enabled.revoked_at, null);
  assert.equal(isProfileEnabled(enabled), true);
  assert.equal(enabled.user_id, original.user_id);
  assert.equal(enabled.custom_profile_data, original.custom_profile_data);

  // Soft deletion blocks access while retaining the auth/profile identity and related data.
  const deleted = { ...enabled, ...softDeleteProfilePatch(actor.user_id, timestamp) };
  assert.equal(deleted.access_status, 'deleted');
  assert.equal(deleted.deleted_by, actor.user_id);
  assert.equal(deleted.deleted_at, timestamp);
  assert.equal(isProfileEnabled(deleted), false);
  assert.equal(deleted.user_id, original.user_id);
  assert.equal(deleted.custom_profile_data, original.custom_profile_data);

  // Explicit protections: self, designated owner, all administrator roles, and last-admin guard.
  assert.match(targetProtectionError({ ...original, user_id: actor.user_id }, actor), /own account/);
  assert.match(targetProtectionError({ ...original, username: 'owner' }, actor), /owner account/);
  assert.match(targetProtectionError({ ...original, role: 'admin' }, actor, 1), /last active administrator/);
  assert.match(targetProtectionError({ ...original, role: 'admin', username: 'other-admin' }, actor, 2), /Administrator accounts/);
  assert.equal(targetProtectionError(original, actor, 1), null);

  assert.equal(hasExactConfirmation('DELETE buyer-one', 'DELETE buyer-one'), true);
  assert.equal(hasExactConfirmation('DELETE buyer-one', 'delete buyer-one'), false);
  assert.equal(hasExactConfirmation('PURGE buyer-one', 'PURGE buyer-one '), false);

  const functionSource = fs.readFileSync('./supabase/functions/secure-bluepeak-admin/index.ts', 'utf8');
  const authSource = fs.readFileSync('./supabase/functions/secure-bluepeak-auth/index.ts', 'utf8');
  const accessSource = fs.readFileSync('./supabase/functions/bluepeak-access/index.ts', 'utf8');
  const migration = fs.readFileSync('./supabase/migrations/20261112150000_add_safe_user_management_status.sql', 'utf8');
  const baseSchema = fs.readFileSync('./supabase/migrations/20261112063225_create_bluepeak_access_tables.sql', 'utf8');
  const gateway = fs.readFileSync('./api/gateway.js', 'utf8');
  const ui = fs.readFileSync('./admin-portal.js', 'utf8');

  assert.match(functionSource, /tokenClaims\.aal !== 'aal2'/);
  assert.match(functionSource, /actorProfile\.role !== 'admin'/);
  assert.match(functionSource, /actorSession\.revoked_at/);
  assert.match(functionSource, /disable-user/);
  assert.match(functionSource, /enable-user/);
  assert.match(functionSource, /delete-user/);
  assert.match(functionSource, /purge-deleted-user/);
  assert.match(functionSource, /ban_duration: '876000h'/);
  assert.match(functionSource, /ban_duration: 'none'/);
  assert.match(functionSource, /revokeSessions\(target\.user_id/);
  assert.match(functionSource, /isProfileEnabled\(target\)/);
  assert.match(functionSource, /enableableStatus = target\.access_status === 'revoked' \|\| target\.access_status === 'pending'/);
  assert.match(functionSource, /actor\.username !== 'owner'/);
  assert.match(functionSource, /targetProtectionError\(target, actor, activeAdminCount\)/);
  assert.match(functionSource, /hasExactConfirmation\(`DELETE/);
  assert.match(functionSource, /hasExactConfirmation\(`PURGE/);
  assert.match(functionSource, /db\.auth\.admin\.deleteUser\(target\.user_id\)/);
  const enableStart = functionSource.indexOf("if (action === 'enable-user')");
  const deleteStart = functionSource.indexOf("if (action === 'delete-user')", enableStart);
  const enableBlock = functionSource.slice(enableStart, deleteStart);
  assert.ok(enableBlock.indexOf('revokeSessions(') < enableBlock.indexOf("ban_duration: 'none'"), 'old sessions must be revoked before enabling the account');
  assert.ok(enableBlock.indexOf("ban_duration: 'none'") < enableBlock.indexOf('enableProfilePatch('), 'Auth is unbanned before profile activation');
  assert.match(functionSource, /can_purge_deleted_users/);
  assert.match(authSource, /p\.access_status!=='approved'\|\|p\.revoked_at/);
  assert.match(accessSource, /p\.access_status==='approved'/);
  assert.match(migration, /'revoked', 'deleted'/);
  assert.match(migration, /deleted_by uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  assert.match(baseSchema, /bp_profiles \([\s\S]*?user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(baseSchema, /bp_active_sessions \([\s\S]*?user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(baseSchema, /user_id uuid references auth\.users\(id\) on delete set null/);
  assert.match(gateway, /'disable-user','enable-user','delete-user','purge-deleted-user'/);
  assert.match(ui, /Delete User/);
  assert.match(ui, /Enable access/);
  assert.match(ui, /Disable access/);
  assert.match(ui, /Permanently purge/);
  assert.match(ui, /emailCell\.textContent = user\.email/);

  console.log('PASS test-admin-user-management: disable/enable/delete/purge transitions, preserved data, confirmation checks, owner/self/last-admin protections, Auth bans, session revocation, login/API status guards, FK retention, and UI actions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
