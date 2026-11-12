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

function addLoadError(tbody, error) {
  tbody.replaceChildren();
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
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
  loadingCell.colSpan = 5;
  loadingCell.textContent = 'Loading users…';
  loadingRow.append(loadingCell);
  tbody.append(loadingRow);

  try {
    const data = await api('list-users');
    const users = Array.isArray(data.users) ? data.users : [];
    tbody.replaceChildren();
    if (!users.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No accounts found.';
      row.append(cell);
      tbody.append(row);
      return;
    }

    for (const user of users) {
      const row = document.createElement('tr');
      for (const value of [user.username || '—', user.role || '—', user.access_status || '—', date(user.created_at)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      const actions = document.createElement('td');
      const wrapper = document.createElement('div');
      wrapper.className = 'row-actions';
      if (user.role === 'buyer' && user.access_status === 'approved') {
        const reset = document.createElement('button');
        reset.className = 'action';
        reset.textContent = 'Reset password';
        reset.onclick = async () => {
          if (!confirm(`Generate a new password for ${user.username}? Existing BluePeak sessions will be revoked.`)) return;
          try {
            const result = await api('reset-user-password', { username: user.username });
            notice.textContent = `One-time password for ${result.username}: ${result.temporary_password}\nCopy it now and share securely. It will not be shown again.`;
          } catch (error) {
            notice.textContent = error.message;
          }
        };
        const revoke = document.createElement('button');
        revoke.className = 'action danger';
        revoke.textContent = 'Revoke access';
        revoke.onclick = async () => {
          if (!confirm(`Revoke BluePeak access for ${user.username}?`)) return;
          try {
            await api('revoke-user', { username: user.username });
            notice.textContent = `Access revoked for ${user.username}.`;
            await loadUsers();
          } catch (error) {
            notice.textContent = error.message;
          }
        };
        wrapper.append(reset, revoke);
      } else {
        wrapper.textContent = '—';
      }
      actions.append(wrapper);
      row.append(actions);
      tbody.append(row);
    }
  } catch (error) {
    addLoadError(tbody, error);
  }
}

// The users page needs an explicit initial request; otherwise its static
// "Loading…" placeholder remains forever until a create/revoke action occurs.
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
    .then(data => { count.textContent = String((data.users || []).filter(user => user.role === 'buyer').length); })
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
