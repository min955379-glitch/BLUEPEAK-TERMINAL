export const DELETED_STATUS = 'deleted';

export function isProfileEnabled(profile) {
  return profile?.access_status === 'approved' && !profile.revoked_at && !profile.deleted_at;
}

export function targetProtectionError(target, actor, activeAdminCount = 0) {
  if (!target) return 'User not found.';
  if (target.user_id === actor?.user_id) return 'You cannot manage your own account here.';
  if (target.username?.toLowerCase() === 'owner' || target.email?.toLowerCase() === 'min955379@gmail.com') {
    return 'The designated owner account is protected.';
  }
  if (target.role === 'admin') {
    return activeAdminCount <= 1
      ? 'The last active administrator is protected.'
      : 'Administrator accounts cannot be changed in customer user management.';
  }
  if (target.role !== 'buyer') return 'Only customer accounts can be managed here.';
  return null;
}

export function disableProfilePatch(now) {
  return {
    access_status: 'revoked',
    revoked_at: now,
    revoked_reason: 'Administrator disabled access',
  };
}

export function enableProfilePatch(actorId, now) {
  return {
    access_status: 'approved',
    approved_at: now,
    approved_by: actorId,
    revoked_at: null,
    revoked_reason: null,
  };
}

export function hasExactConfirmation(expected, provided) {
  return typeof provided === 'string' && provided === expected;
}


export function isUserListed(profile) {
  return profile?.access_status !== 'deleted' && !profile?.deleted_at;
}

export function isSoftDeletedBuyer(profile) {
  return profile?.role === 'buyer' && (profile.access_status === 'deleted' || Boolean(profile.deleted_at));
}

export function isProtectedOwnerIdentity(profile) {
  return profile?.username?.toLowerCase() === 'owner' || profile?.email?.toLowerCase() === 'min955379@gmail.com';
}
