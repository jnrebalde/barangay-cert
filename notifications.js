/* BarangayCert shared notification page behavior. Uses server-persisted notifications. */
(() => {
  const isAdmin = location.pathname.toLowerCase().includes('admin-notifications');
  const listSelector = isAdmin ? '.admin-notification-list' : '.notification-card';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };
  const iconFor = (type) => ({ new_request: '📄', resident_registered: '👤', request_submitted: '✓', request_status: '🔔', account_status: '✓' }[type] || '🔔');

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      location.href = isAdmin ? 'admin-login.html' : 'resident-login.html';
      throw new Error('Please sign in again.');
    }
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  }

  function setAdminSummary(notifications) {
    const cards = document.querySelectorAll('.summary-grid .summary-card');
    const unread = notifications.filter(n => !n.read).length;
    const counts = [
      notifications.filter(n => n.type === 'new_request').length,
      notifications.filter(n => n.type === 'resident_registered').length,
      notifications.filter(n => /Ready for Pickup/i.test(`${n.title} ${n.message}`)).length,
      unread
    ];
    cards.forEach((card, index) => {
      const heading = card.querySelector('h3');
      if (heading) heading.textContent = String(counts[index] ?? 0);
    });
  }

  function renderAdmin(notifications) {
    const list = document.querySelector(listSelector);
    if (!list) return;
    if (!notifications.length) {
      list.innerHTML = '<div class="admin-notification-empty"><strong>No notifications yet</strong><p>New document requests, resident registrations, and status updates will appear here.</p></div>';
      return;
    }
    list.innerHTML = notifications.map(n => `
      <article class="admin-notification-item" style="padding:16px;border-bottom:1px solid #e5e7eb;${n.read ? '' : 'background:#f0f7ff;'}">
        <div style="display:flex;gap:12px;align-items:flex-start"><span aria-hidden="true">${iconFor(n.type)}</span><div style="flex:1">
          <strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.message)}</p>
          <small>${escapeHtml(dateLabel(n.createdAt))}${n.read ? ' · Read' : ' · Unread'}</small>
          <div style="margin-top:8px;display:flex;gap:12px;align-items:center">${n.link ? `<a href="${escapeHtml(n.link)}">View details</a>` : ''}${n.read ? '' : `<button type="button" data-read="${escapeHtml(n.id)}">Mark as read</button>`}</div>
        </div></div>
      </article>`).join('');
  }

  function renderResident(notifications) {
    const card = document.querySelector(listSelector);
    if (!card) return;
    card.innerHTML = `
      <div class="notification-header"><div class="notification-title"><div class="notification-header-icon">🔔</div><div><h2>All Notifications</h2><p>Total: ${notifications.length} · Unread: ${notifications.filter(n => !n.read).length}</p></div></div><button type="button" id="markAllNotificationsRead">Mark All as Read</button></div>
      ${notifications.length ? notifications.map(n => `
        <article class="notification-item" style="${n.read ? 'opacity:.78;' : 'background:#f0f7ff;'}">
          <div class="notification-icon ${n.read ? 'submitted' : 'ready'}">${iconFor(n.type)}</div>
          <div class="notification-text"><p><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.message)}</p><span>◷ ${escapeHtml(dateLabel(n.createdAt))}${n.read ? ' · Read' : ' · Unread'}</span>
          <div style="margin-top:8px;display:flex;gap:12px">${n.link ? `<a href="${escapeHtml(n.link)}">View details</a>` : ''}${n.read ? '' : `<button type="button" data-read="${escapeHtml(n.id)}">Mark as read</button>`}</div></div>
        </article>`).join('') : '<div class="notification-item"><div class="notification-text"><strong>No notifications yet</strong><p>Updates about your account and document requests will appear here.</p></div></div>'}`;
  }

  async function load() {
    const list = document.querySelector(listSelector);
    if (!list) return;
    list.innerHTML = '<p style="padding:16px">Loading notifications…</p>';
    try {
      const data = await api('/api/notifications');
      const notifications = Array.isArray(data.notifications) ? data.notifications : [];
      if (isAdmin) { setAdminSummary(notifications); renderAdmin(notifications); }
      else renderResident(notifications);
    } catch (error) {
      if (error.message !== 'Please sign in again.') list.innerHTML = `<p style="padding:16px">${escapeHtml(error.message || 'Unable to load notifications.')}</p>`;
    }
  }

  document.addEventListener('click', async (event) => {
    const readButton = event.target.closest('[data-read]');
    const readAllButton = event.target.closest('#markAllNotificationsRead, .section-header a');
    if (!readButton && !readAllButton) return;
    if (readAllButton && readAllButton.matches('.section-header a')) event.preventDefault();
    try {
      if (readButton) await api(`/api/notifications/${encodeURIComponent(readButton.dataset.read)}/read`, { method: 'PATCH' });
      else await api('/api/notifications/read-all', { method: 'PATCH' });
      await load();
    } catch (error) { alert(error.message || 'Unable to update notifications.'); }
  });
  document.addEventListener('DOMContentLoaded', load);
})();
