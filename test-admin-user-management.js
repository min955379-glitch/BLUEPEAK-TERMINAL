const assert = require('node:assert/strict');
const fs = require('node:fs');
const rules = import('./supabase/functions/secure-bluepeak-admin/user-management-rules.mjs');

(async () => {
  const { disableProfilePatch, enableProfilePatch, isProfileEnabled, isUserListed, isSoftDeletedBuyer,
    isProtectedOwnerIdentity, targetProtectionError, hasExactConfirmation } = await rules;
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

  // Direct delete removes the row from returned-user policy, while legacy soft-deleted buyer rows are purgeable for reuse.
  const legacyDeleted = { ...original, access_status: 'deleted', deleted_at: timestamp };
  assert.equal(isUserListed(legacyDeleted), false);
  assert.equal(isUserListed(original), true);
  assert.equal(isSoftDeletedBuyer(legacyDeleted), true);
  assert.equal(isSoftDeletedBuyer({ ...legacyDeleted, role: 'admin' }), false);
  const remainingRows = [original, legacyDeleted].filter(isUserListed);
  assert.deepEqual(remainingRows.map(row => row.username), ['buyer-one']);
  const afterDirectDelete = [original, legacyDeleted].filter(row => row.user_id !== original.user_id && isUserListed(row));
  assert.equal(afterDirectDelete.some(row => row.username === original.username || row.email === original.email), false);
  const legacyMatches = [legacyDeleted];
  const mockAuthEmails = new Set([legacyDeleted.email.toLowerCase()]);
  for (const row of legacyMatches.filter(isSoftDeletedBuyer)) mockAuthEmails.delete(row.email.toLowerCase());
  assert.equal(mockAuthEmails.has('buyer@example.invalid'), false, 'legacy Auth email is released before replacement creation');
  mockAuthEmails.add('buyer@example.invalid');
  assert.equal(mockAuthEmails.has('buyer@example.invalid'), true, 'replacement can claim the released email');
  assert.equal(isProtectedOwnerIdentity({ username: 'owner', email: 'owner@users.invalid' }), true);
  assert.equal(isProtectedOwnerIdentity({ username: 'some-name', email: 'MIN955379@GMAIL.COM' }), true);

  // Explicit protections: self, designated owner, all administrator roles, and last-admin guard.
  assert.match(targetProtectionError({ ...original, user_id: actor.user_id }, actor), /own account/);
  assert.match(targetProtectionError({ ...original, username: 'owner' }, actor), /owner account/);
  assert.match(targetProtectionError({ ...original, username: 'owner-copy', email: 'min955379@gmail.com' }, actor), /owner account/);
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
  const auditMigration = fs.readFileSync('./supabase/migrations/20261112152724_detach_admin_audit_actor_on_auth_delete.sql', 'utf8');
  const baseSchema = fs.readFileSync('./supabase/migrations/20261112063225_create_bluepeak_access_tables.sql', 'utf8');
  const gateway = fs.readFileSync('./api/gateway.js', 'utf8');
  const ui = fs.readFileSync('./admin-portal.js', 'utf8');
  const usersHtml = fs.readFileSync('./admin-users.html', 'utf8');

  assert.match(functionSource, /tokenClaims\.aal !== 'aal2'/);
  assert.match(functionSource, /actorProfile\.role !== 'admin'/);
  assert.match(functionSource, /actorSession\.revoked_at/);
  assert.match(functionSource, /disable-user/);
  assert.match(functionSource, /enable-user/);
  assert.match(functionSource, /delete-user/);
  assert.doesNotMatch(functionSource, /purge-deleted-user/);
  assert.match(functionSource, /ban_duration: '876000h'/);
  assert.match(functionSource, /ban_duration: 'none'/);
  assert.match(functionSource, /revokeSessions\(target\.user_id/);
  assert.match(functionSource, /isProfileEnabled\(target\)/);
  assert.match(functionSource, /enableableStatus = target\.access_status === 'revoked' \|\| target\.access_status === 'pending'/);
  assert.match(functionSource, /targetProtectionError\(target, actor, activeAdminCount\)/);
  assert.match(functionSource, /hasExactConfirmation\(`DELETE/);
  assert.match(functionSource, /db\.auth\.admin\.deleteUser\(target\.user_id\)/);
  const enableStart = functionSource.indexOf("if (action === 'enable-user')");
  const deleteStart = functionSource.indexOf("if (action === 'delete-user')", enableStart);
  const enableBlock = functionSource.slice(enableStart, deleteStart);
  assert.ok(enableBlock.indexOf('revokeSessions(') < enableBlock.indexOf("ban_duration: 'none'"), 'old sessions must be revoked before enabling the account');
  assert.ok(enableBlock.indexOf("ban_duration: 'none'") < enableBlock.indexOf('enableProfilePatch('), 'Auth is unbanned before profile activation');
  assert.match(functionSource, /isUserListed/);
  assert.match(functionSource, /isSoftDeletedBuyer/);
  assert.match(functionSource, /db\.auth\.admin\.deleteUser\(target\.user_id\)/);
  assert.match(functionSource, /message: 'Account permanently deleted\. Its username and email are available for reuse\.'/);
  assert.match(functionSource, /db\.from\('bp_active_sessions'\)\.delete\(\)\.eq\('user_id', target\.user_id\)/);
  assert.match(functionSource, /deleted_user_id: target\.user_id/);
  assert.match(functionSource, /const email = emailOk\(username\) \? username\.toLowerCase\(\) : emailFor\(username\)/);
  assert.match(functionSource, /const \[byUsername, byEmail\]/);
  assert.match(functionSource, /db\.auth\.admin\.deleteUser\(profile\.user_id\)/);
  const createStart = functionSource.indexOf("if (action === 'create-user')");
  const legacyPurge = functionSource.indexOf('db.auth.admin.deleteUser(profile.user_id)', createStart);
  const createAuth = functionSource.indexOf('db.auth.admin.createUser({', createStart);
  assert.ok(legacyPurge >= 0 && createAuth > legacyPurge, 'matching soft-deleted Auth identity must be purged before createUser retries the same email');
  const deleteBlock = functionSource.slice(functionSource.indexOf("if (action === 'delete-user')"), functionSource.indexOf("if (action === 'reset-user-password')"));
  assert.ok(deleteBlock.indexOf(".delete().eq('user_id', target.user_id)") < deleteBlock.indexOf('db.auth.admin.deleteUser(target.user_id)'), 'tracked app sessions are cleared before Auth deletion');
  assert.ok(deleteBlock.indexOf('db.auth.admin.deleteUser(target.user_id)') < deleteBlock.indexOf("audit(actor.user_id, 'delete_user', null"), 'audit snapshot is inserted after target deletion with a null target FK');

  assert.match(authSource, /p\.access_status!=='approved'\|\|p\.revoked_at/);
  assert.match(accessSource, /p\.access_status==='approved'/);
  assert.match(migration, /'revoked', 'deleted'/);
  assert.match(migration, /deleted_by uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  assert.match(auditMigration, /admin_user_id DROP NOT NULL/);
  assert.match(auditMigration, /FOREIGN KEY \(admin_user_id\)[\s\S]*?ON DELETE SET NULL/);
  assert.match(auditMigration, /actor_user_id_snapshot/);
  assert.match(auditMigration, /actor_username/);
  assert.match(functionSource, /actor_user_id_snapshot: adminId/);
  assert.match(functionSource, /actor_username: actor\?\.username \|\| null/);
  assert.match(functionSource, /if \(action === 'list-audit'\)/);
  assert.match(baseSchema, /bp_profiles \([\s\S]*?user_id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(baseSchema, /bp_active_sessions \([\s\S]*?user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(baseSchema, /user_id uuid references auth\.users\(id\) on delete set null/);
  assert.match(gateway, /'disable-user','enable-user','delete-user'/);
  assert.doesNotMatch(gateway, /purge-deleted-user/);
  assert.match(ui, /Delete User/);
  assert.match(ui, /Enable access/);
  assert.match(ui, /Disable access/);
  assert.doesNotMatch(ui, /Permanently purge|purge-deleted-user/);
  assert.match(ui, /Permanently delete this account/);
  assert.match(ui, /row\.remove\(\)/);
  assert.match(ui, /users\.filter\(user => user\.access_status !== 'deleted' && !user\.deleted_at\)/);
  assert.match(ui, /emailCell\.textContent = user\.email/);
  assert.match(usersHtml, /Delete User permanently removes the account after confirmation/);
  assert.doesNotMatch(usersHtml, /recoverable soft delete|Permanently purge|action\.purge/);

  const cleanupMigration = fs.readFileSync('./supabase/migrations/20261112160047_purge_legacy_soft_deleted_buyers.sql', 'utf8');
  assert.match(cleanupMigration, /role = 'buyer'/);
  assert.match(cleanupMigration, /access_status = 'deleted' OR profile\.deleted_at IS NOT NULL/);
  assert.match(cleanupMigration, /deleted_username_snapshot/);
  assert.match(cleanupMigration, /DELETE FROM auth\.users/);
  assert.match(cleanupMigration, /historical login\/audit records retain/);

  // No green-family UI colors except the exact universal bullish trading/chart palette.
  const zeroGreenFiles = ['index.html','admin-dashboard.html','admin-users.html','bluepeak-access-ui.js',
    'admin-portal.js','pattern-scanner.js','scan-watched-assets.js','api/gateway.js','bluepeak-design-system.css','favicon.svg'];
  const colorSource = zeroGreenFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(colorSource, /\b(?:green|emerald|lime|teal)\b|--green/i, 'named green-family colors are prohibited');
  const hsv = (r,g,b) => {const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;if(delta){if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h*=60;if(h<0)h+=360}return {h,s:max===0?0:delta/max,v:max}};
  const approvedChartGreens = new Set(['089981','26A69A','10B981']);
  for (const literal of colorSource.match(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?/g)||[]) {
    const hex=literal.slice(1,7),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255),{h,s,v}=hsv(...rgb);
    if(h>=75&&h<=170&&s>=.2&&v>=.18)assert.ok(approvedChartGreens.has(hex.toUpperCase()), `unapproved green-hued UI color literal: ${literal}`);
  }
  for (const match of colorSource.matchAll(/(rgba?|hsla?)\(([^)]*)\)/gi)) {
    const values=(match[2].match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);let hue,saturation,brightness;
    if(match[1].toLowerCase().startsWith('rgb')&&values.length>=3){({h:hue,s:saturation,v:brightness}=hsv(...values.slice(0,3).map(value=>Math.max(0,Math.min(255,value))/255)))}
    else if(match[1].toLowerCase().startsWith('hsl')&&values.length>=3){hue=((values[0]%360)+360)%360;saturation=values[1]/100;brightness=values[2]/100}
    else continue;
    if(hue>=75&&hue<=170&&saturation>=.2&&brightness>=.18)assert.ok(match[1].toLowerCase().startsWith('rgb')&&((values[0]===8&&values[1]===153&&values[2]===129)||(values[0]===16&&values[1]===185&&values[2]===129&&match[0].includes('.15'))), `unapproved green-hued functional color: ${match[0]}`);
  }

  console.log('PASS test-admin-user-management: disable/enable safeguards, immediate hard delete, FK/session cleanup, hidden deleted rows, soft-deleted collision cleanup/reuse, owner/self/last-admin protections, confirmation, MFA/AAL2, migration and approved chart-green palette contracts.');
})().catch(error => { console.error(error); process.exitCode = 1; });
