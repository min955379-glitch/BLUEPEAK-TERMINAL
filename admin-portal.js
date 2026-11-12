const $ = selector => document.querySelector(selector);
const notice = $('#notice');

async function api(action, extra = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({ error: 'Invalid server response' }));
    if (response.status === 401 || response.status === 403) {
      location.replace('/admin');
      throw new Error(data.error || 'Admin verification is required.');
    }
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection, then retry.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function date(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(+parsed) ? '—' : parsed.toLocaleString();
}

function statusLabel(user) {
  if (user.access_status === 'deleted' || user.deleted_at) return 'Deleted';
  if (user.access_status === 'approved' && !user.revoked_at) return 'Active';
  if (user.access_status === 'revoked' || user.revoked_at) return 'Disabled';
  return 'Pending';
}

function statusClass(label) {
  return ({ Active: 'status-active', Disabled: 'status-disabled', Deleted: 'status-deleted', Pending: 'status-pending' })[label] || 'status-protected';
}

function makeAction(label, className, handler) {
  const button = document.createElement('button');
  button.className = `action ${className || ''}`.trim();
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await handler();
    } catch (error) {
      if (notice) notice.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function addLoadError(tbody, error) {
  tbody.replaceChildren();
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.setAttribute('role', 'status');
  cell.append(document.createTextNode(`Could not load users: ${error.message} `));
  const retry = document.createElement('button');
  retry.className = 'action';
  retry.type = 'button';
  retry.textContent = 'Retry';
  retry.addEventListener('click', () => loadUsers());
  cell.append(retry);
  row.append(cell);
  tbody.append(row);
}

async function loadUsers() {
  const tbody = $('#users');
  if (!tbody) return;
  tbody.replaceChildren();
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 6;
  loadingCell.textContent = 'Loading users…';
  loadingRow.append(loadingCell);
  tbody.append(loadingRow);

  try {
    const data = await api('list-users');
    const users = Array.isArray(data.users) ? data.users.filter(user => user.access_status !== 'deleted' && !user.deleted_at) : [];
    tbody.replaceChildren();
    if (!users.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'No accounts found.';
      row.append(cell);
      tbody.append(row);
      return;
    }

    for (const user of users) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.className = 'user-name';
      nameCell.textContent = user.username || '—';
      const emailCell = document.createElement('td');
      emailCell.className = 'email';
      emailCell.textContent = user.email || '—';
      const roleCell = document.createElement('td');
      roleCell.textContent = user.role || '—';
      const statusCell = document.createElement('td');
      const label = statusLabel(user);
      const pill = document.createElement('span');
      pill.className = `status-pill ${statusClass(label)}`;
      pill.textContent = label;
      statusCell.append(pill);
      const dateCell = document.createElement('td');
      dateCell.textContent = date(user.created_at);
      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const isBuyer = user.role === 'buyer';
      const ownerNamed = user.username?.toLowerCase() === 'owner' || user.email?.toLowerCase() === 'min955379@gmail.com';
      if (isBuyer && !ownerNamed && label !== 'Deleted') {
        actions.append(makeAction('Reset password', '', async () => {
          if (!confirm(`Reset the password for ${user.username} (${user.email || 'email unavailable'})? Existing BluePeak sessions will be revoked.`)) return;
          const result = await api('reset-user-password', { username: user.username });
          notice.textContent = `One-time password for ${result.username}: ${result.temporary_password}\nCopy it now and share it securely; it will not be shown again.`;
        }));

        if (label === 'Active') {
          actions.append(makeAction('Disable access', 'disable', async () => {
            if (!confirm(`Disable ${user.username} (${user.email || 'email unavailable'})? Their current sessions will be revoked. Their account and data will be kept, and access can be restored later.`)) return;
            const result = await api('disable-user', { username: user.username });
            notice.textContent = `Access disabled for ${user.username}.${result.warning ? ` ${result.warning}` : ''}`;
            await loadUsers();
          }));
        } else if (label === 'Disabled' || label === 'Pending') {
          actions.append(makeAction('Enable access', 'enable', async () => {
            const result = await api('enable-user', { username: user.username });
            notice.textContent = `Access restored for ${user.username}. They can sign in with their existing password.${result.warning ? ` ${result.warning}` : ''}`;
            await loadUsers();
          }));
        } else {
          const pending = document.createElement('span');
          pending.className = 'status-pill status-pending';
          pending.textContent = 'Awaiting admin review';
          actions.append(pending);
        }

        actions.append(makeAction('Delete User', 'danger', async () => {
          const email = user.email || 'email unavailable';
          if (!confirm(`Permanently delete this account?\n\nName: ${user.username}\nEmail: ${email}\n\nThis immediately removes the Supabase Auth account, profile, and active sessions. Historical audit/login records may remain with the user reference detached. The username and email will be available for reuse. This cannot be undone.`)) return;
          const result = await api('delete-user', { username: user.username, confirmation: `DELETE ${user.username}` });
          row.remove();
          notice.textContent = `Permanently deleted ${user.username}; the username and email are available for reuse.${result.warning ? ` ${result.warning}` : ''}`;
          await loadUsers();
        }));
      } else {
        const protectedLabel = document.createElement('span');
        protectedLabel.className = 'status-pill status-protected';
        protectedLabel.textContent = ownerNamed || user.role === 'admin' ? 'Protected account' : '—';
        actions.append(protectedLabel);
      }

      actionsCell.append(actions);
      row.append(nameCell, emailCell, roleCell, statusCell, dateCell, actionsCell);
      tbody.append(row);
    }
  } catch (error) {
    addLoadError(tbody, error);
  }
}

if ($('#users')) loadUsers();

const form = $('#create-form');
if (form) form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#create-button');
  const username = form.elements.username.value;
  const password = form.elements.password.value;
  button.disabled = true;
  try {
    const result = await api('create-user', { username, password });
    notice.textContent = `Created ${result.username}. Save the password you entered and share it securely; it cannot be viewed later.`;
    form.reset();
    await loadUsers();
  } catch (error) {
    notice.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const count = $('#user-count');
if (count) {
  api('list-users')
    .then(data => { count.textContent = String((data.users || []).filter(user => user.role === 'buyer' && user.access_status === 'approved' && !user.revoked_at && !user.deleted_at).length); })
    .catch(error => { if (notice) notice.textContent = error.message; });
}

const signout = $('#signout');
if (signout) signout.onclick = async () => {
  signout.disabled = true;
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    location.replace('/admin');
  }
};
