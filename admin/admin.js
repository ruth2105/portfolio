document.addEventListener('DOMContentLoaded', () => {
  const bsModal = new bootstrap.Modal(document.getElementById('itemModal'));
  let currentSection = 'site';
  let modalContext = null;

  const token = localStorage.getItem('adminToken');
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  async function apiFetch(url, options = {}) {
    const headers = { ...authHeaders, ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('adminToken');
      location.reload();
    }
    return res;
  }

  // ── Navigation ──────────────────────────────────────────────
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = e.currentTarget.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(sec).classList.add('active');
      document.querySelectorAll('[data-section]').forEach(l => l.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentSection = sec;
      if (sec === 'site') loadSite();
      else if (sec === 'statement') loadStatement();
      else if (sec === 'gallery') loadGallery();
      else if (sec === 'exhibitions') loadExhibitions();
      else if (['events','projects','press'].includes(sec)) loadList(sec);
    });
  });

  // ── Helpers ──────────────────────────────────────────────────
  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '';
  function flash(id) {
    const el = document.getElementById(id);
    el.style.display = 'inline';
    setTimeout(() => el.style.display = 'none', 2500);
  }
  function imgPreview(inputEl, previewEl) {
    inputEl.addEventListener('change', () => {
      const f = inputEl.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => { previewEl.innerHTML = `<img src="${e.target.result}" style="height:70px;border-radius:6px;object-fit:cover">`; };
      r.readAsDataURL(f);
    });
  }

  // ── SITE SETTINGS ────────────────────────────────────────────
  async function loadSite() {
    const s = await fetch('/api/site').then(r => r.json());
    const f = document.getElementById('site-form');
    const set = (n, v) => { const el = f.querySelector(`[name="${n}"]`); if (el) el.value = v || ''; };
    set('name', s.name); set('nameAmharic', s.nameAmharic); set('title', s.title);
    set('location', s.location); set('instagram', s.instagram); set('email', s.email);
    set('phone', s.phone); set('heroHeading', s.heroHeading); set('heroQuote', s.heroQuote);
    set('heroImage', s.heroImage); set('contactNote', s.contactNote);
    document.getElementById('hero-img-name').textContent = s.heroImage || '';
    document.getElementById('bio-en').value = (s.bioParagraphs||[]).join('\n\n');
    document.getElementById('bio-am').value = (s.bioAmharic||[]).join('\n\n');
    document.getElementById('edu-raw').value = (s.education||[]).join('\n');
    document.getElementById('awards-raw').value = (s.awards||[]).join('\n');
    if (s.aboutImage) {
      document.getElementById('about-img-preview').innerHTML =
        `<img src="${s.aboutImage}" style="height:70px;border-radius:6px;object-fit:cover">`;
    }
    imgPreview(f.querySelector('[name="aboutImage"]'), document.getElementById('about-img-preview'));
  }

  document.getElementById('site-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData();
    const get = n => f.querySelector(`[name="${n}"]`)?.value.trim() || '';
    ['name','nameAmharic','title','location','instagram','email','phone',
     'heroHeading','heroQuote','heroImage','contactNote'].forEach(k => fd.append(k, get(k)));
    fd.append('bioParagraphs', JSON.stringify(document.getElementById('bio-en').value.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean)));
    fd.append('bioAmharic',    JSON.stringify(document.getElementById('bio-am').value.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean)));
    fd.append('education',     JSON.stringify(document.getElementById('edu-raw').value.split('\n').map(s=>s.trim()).filter(Boolean)));
    fd.append('awards',        JSON.stringify(document.getElementById('awards-raw').value.split('\n').map(s=>s.trim()).filter(Boolean)));
    const imgFile = f.querySelector('[name="aboutImage"]').files[0];
    if (imgFile) fd.append('aboutImage', imgFile);
    await apiFetch('/api/site', { method: 'PUT', body: fd });
    flash('site-msg');
  });

  // ── STATEMENT ────────────────────────────────────────────────
  async function loadStatement() {
    const s = await fetch('/api/site').then(r => r.json());
    document.getElementById('stmt-paras').value = (s.statementParagraphs||[]).join('\n\n');
    document.getElementById('stmt-quote').value = s.statementQuote || '';
  }

  document.getElementById('statement-form').addEventListener('submit', async e => {
    e.preventDefault();
    const paras = document.getElementById('stmt-paras').value.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
    const quote = document.getElementById('stmt-quote').value.trim();
    const fd = new FormData();
    fd.append('statementParagraphs', JSON.stringify(paras));
    fd.append('statementQuote', quote);
    await apiFetch('/api/site', { method: 'PUT', body: fd });
    flash('stmt-msg');
  });

  // ── GALLERY ──────────────────────────────────────────────────
  async function loadGallery() {
    const items = await fetch('/api/gallery').then(r => r.json());
    const c = document.getElementById('gallery-list');
    if (!items.length) { c.innerHTML = '<p class="empty-msg">No artworks yet.</p>'; return; }
    c.innerHTML = items.map(g => `
      <div class="card-item">
        <img src="${g.file}" class="thumb">
        <div style="flex:1">
          <h6>${g.title}</h6>
          <small>${[g.medium,g.dimensions,g.year].filter(Boolean).join(' · ')}</small>
        </div>
        <div class="d-flex gap-1">
          <button class="btn-icon text-primary" onclick="window._edit('gallery','${g._id}')"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-icon text-danger" onclick="window._del('gallery','${g._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>`).join('');
  }

  document.getElementById('add-gallery-btn').addEventListener('click', () => openModal('gallery'));

  // ── EXHIBITIONS ──────────────────────────────────────────────
  let currentExTab = 'group';
  document.querySelectorAll('.ex-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ex-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.ex-section').forEach(s => s.style.display = 'none');
      currentExTab = btn.dataset.tab;
      document.getElementById('ex-' + currentExTab).style.display = '';
      loadExList(currentExTab);
    });
  });

  async function loadExhibitions() { loadExList('group'); loadExList('solo'); loadExList('workshops'); }

  async function loadExList(tab) {
    const data = await fetch('/api/exhibitions').then(r => r.json());
    const items = data[tab] || [];
    const c = document.getElementById('exlist-' + tab);
    if (!items.length) { c.innerHTML = '<p class="empty-msg">None yet.</p>'; return; }
    c.innerHTML = items.map(e => `
      <div class="card-item">
        <div style="flex:1">
          <h6>${e.title}</h6>
          <small>${e.year} · ${e.venue}</small>
        </div>
        <div class="d-flex gap-1">
          <button class="btn-icon text-primary" onclick="window._editEx('${tab}','${e._id}')"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-icon text-danger" onclick="window._delEx('${tab}','${e._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>`).join('');
  }

  window.openExModal = async (tab, id = null) => {
    modalContext = { type: 'exhibition', tab, id };
    document.getElementById('modalTitle').textContent = (id ? 'Edit' : 'Add') + ' Exhibition';
    let ex = {};
    if (id) {
      const data = await fetch('/api/exhibitions').then(r => r.json());
      ex = (data[tab]||[]).find(i => i._id === id) || {};
    }
    document.getElementById('modalBody').innerHTML = `
      <div class="mb-3"><label class="form-label fw-semibold">Title *</label>
        <input type="text" class="form-control" id="f_title" value="${ex.title||''}" required></div>
      <div class="mb-3"><label class="form-label fw-semibold">Year</label>
        <input type="text" class="form-control" id="f_year" value="${ex.year||''}"></div>
      <div class="mb-3"><label class="form-label fw-semibold">Venue / Location</label>
        <input type="text" class="form-control" id="f_venue" value="${ex.venue||''}"></div>`;
    bsModal.show();
  };

  window._editEx = (tab, id) => window.openExModal(tab, id);
  window._delEx = async (tab, id) => {
    if (!confirm('Delete?')) return;
    await apiFetch(`/api/exhibitions/${tab}/${id}`, { method: 'DELETE' });
    loadExList(tab);
  };

  // ── DYNAMIC LISTS (events, projects, press) ──────────────────
  const listForms = {
    events: {
      title: 'Event',
      fields: [
        { id:'title',       label:'Event Title',    type:'text',     required:true },
        { id:'date',        label:'Date',            type:'date',     required:true },
        { id:'location',    label:'Location',        type:'text' },
        { id:'description', label:'Description',     type:'textarea' },
        { id:'link',        label:'Link (optional)', type:'url' },
        { id:'image',       label:'Image',           type:'file' }
      ]
    },
    projects: {
      title: 'Project',
      fields: [
        { id:'title',       label:'Project Title',   type:'text',     required:true },
        { id:'year',        label:'Year',             type:'text' },
        { id:'medium',      label:'Medium / Type',    type:'text' },
        { id:'description', label:'Description',      type:'textarea' },
        { id:'link',        label:'Link (optional)',  type:'url' },
        { id:'image',       label:'Image',            type:'file' }
      ]
    },
    press: {
      title: 'Press / Interview',
      fields: [
        { id:'title',       label:'Title / Headline',         type:'text', required:true },
        { id:'publication', label:'Publication / Platform',   type:'text', required:true },
        { id:'date',        label:'Date',                     type:'date' },
        { id:'location',    label:'Location',                 type:'text' },
        { id:'link',        label:'URL',                      type:'url' },
        { id:'image',       label:'Image',                    type:'file' }
      ]
    }
  };

  async function loadList(section) {
    const items = await fetch(`/api/${section}`).then(r => r.json());
    const c = document.getElementById(`${section}-list`);
    if (!items.length) { c.innerHTML = `<p class="empty-msg">No ${section} yet.</p>`; return; }
    c.innerHTML = items.map(item => `
      <div class="card-item">
        ${item.image ? `<img src="${item.image}" class="thumb">` : ''}
        <div style="flex:1">
          <h6>${item.title}</h6>
          <small>${item.date ? fmt(item.date) + ' · ' : ''}${item.publication||item.medium||item.location||''}
          ${item.description ? ' — ' + item.description.substring(0,80) + (item.description.length>80?'…':'') : ''}</small>
          ${item.link ? `<br><a href="${item.link}" target="_blank" class="small text-muted">${item.link}</a>` : ''}
        </div>
        <div class="d-flex gap-1">
          <button class="btn-icon text-primary" onclick="window._edit('${section}','${item._id}')"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-icon text-danger" onclick="window._del('${section}','${item._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>`).join('');
  }

  document.getElementById('add-events-btn').addEventListener('click', () => openModal('events'));
  document.getElementById('add-projects-btn').addEventListener('click', () => openModal('projects'));
  document.getElementById('add-press-btn').addEventListener('click', () => openModal('press'));

  // ── GALLERY MODAL ────────────────────────────────────────────
  const galleryFields = [
    { id:'title',      label:'Title',      type:'text', required:true },
    { id:'medium',     label:'Medium',     type:'text' },
    { id:'dimensions', label:'Dimensions', type:'text' },
    { id:'year',       label:'Year',       type:'text' },
    { id:'image',      label:'Image',      type:'file' }
  ];

  // ── Open Modal ───────────────────────────────────────────────
  async function openModal(type, id = null) {
    modalContext = { type, id };
    const isGallery = type === 'gallery';
    const config = isGallery ? { title: 'Artwork', fields: galleryFields } : listForms[type];
    document.getElementById('modalTitle').textContent = (id ? 'Edit ' : 'Add ') + config.title;

    let existing = {};
    if (id) {
      const endpoint = isGallery ? '/api/gallery' : `/api/${type}`;
      const items = await fetch(endpoint).then(r => r.json());
      existing = items.find(i => i._id === id) || {};
    }

    document.getElementById('modalBody').innerHTML = config.fields.map(f => {
      if (f.type === 'file') return `
        <div class="mb-3">
          <label class="form-label fw-semibold" style="font-size:.85rem">${f.label}</label>
          ${existing.image||existing.file ? `<div class="mb-1"><img src="${existing.image||existing.file}" style="height:60px;border-radius:5px;object-fit:cover"></div>` : ''}
          <input type="file" class="form-control" id="f_image" accept="image/*">
        </div>`;
      if (f.type === 'textarea') return `
        <div class="mb-3">
          <label class="form-label fw-semibold" style="font-size:.85rem">${f.label}${f.required?' <span class="text-danger">*</span>':''}</label>
          <textarea class="form-control" id="f_${f.id}" rows="3">${existing[f.id]||''}</textarea>
        </div>`;
      return `
        <div class="mb-3">
          <label class="form-label fw-semibold" style="font-size:.85rem">${f.label}${f.required?' <span class="text-danger">*</span>':''}</label>
          <input type="${f.type}" class="form-control" id="f_${f.id}" value="${existing[f.id]||''}" ${f.required?'required':''}>
        </div>`;
    }).join('');

    // live preview
    const imgEl = document.getElementById('f_image');
    if (imgEl) {
      imgEl.addEventListener('change', () => {
        const file = imgEl.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = e => {
          let p = document.getElementById('img-live-preview');
          if (!p) { p = document.createElement('img'); p.id='img-live-preview'; p.style='height:70px;border-radius:6px;object-fit:cover;margin-top:.4rem;display:block'; imgEl.after(p); }
          p.src = e.target.result;
        };
        r.readAsDataURL(file);
      });
    }
    bsModal.show();
  }

  // ── Save Modal ───────────────────────────────────────────────
  document.getElementById('modalSave').addEventListener('click', async () => {
    if (!modalContext) return;
    const { type, tab, id } = modalContext;

    // Exhibition save
    if (type === 'exhibition') {
      const body = {
        title: document.getElementById('f_title').value.trim(),
        year:  document.getElementById('f_year').value.trim(),
        venue: document.getElementById('f_venue').value.trim()
      };
      if (!body.title) { document.getElementById('f_title').classList.add('is-invalid'); return; }
      const url = id ? `/api/exhibitions/${tab}/${id}` : `/api/exhibitions/${tab}`;
      const method = id ? 'PUT' : 'POST';
      await apiFetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      bsModal.hide();
      loadExList(tab);
      return;
    }

    // Gallery / list save
    const isGallery = type === 'gallery';
    const fields = isGallery ? galleryFields : listForms[type].fields;
    const fd = new FormData();
    let valid = true;

    for (const f of fields) {
      if (f.type === 'file') {
        const file = document.getElementById('f_image')?.files[0];
        if (file) fd.append('image', file);
      } else {
        const el = document.getElementById(`f_${f.id}`);
        const val = el?.value.trim() || '';
        if (f.required && !val) { el.classList.add('is-invalid'); valid = false; }
        else { el?.classList.remove('is-invalid'); fd.append(f.id, val); }
      }
    }
    if (!valid) return;

    const endpoint = isGallery ? '/api/gallery' : `/api/${type}`;
    const url = id ? `${endpoint}/${id}` : endpoint;
    const method = id ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: fd });
    if (!res.ok) { alert('Save failed'); return; }
    bsModal.hide();
    if (isGallery) loadGallery();
    else loadList(type);
  });

  // ── Delete / Edit (global) ───────────────────────────────────
  window._del = async (type, id) => {
    if (!confirm('Delete this item?')) return;
    const endpoint = type === 'gallery' ? '/api/gallery' : `/api/${type}`;
    await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
    if (type === 'gallery') loadGallery();
    else loadList(type);
  };
  window._edit = (type, id) => openModal(type, id);

  // ── CHANGE PASSWORD ──────────────────────────────────────────
  document.getElementById('changePwBtn').addEventListener('click', async () => {
    const current = document.getElementById('currentPw').value;
    const newPw = document.getElementById('newPw').value;
    const confirm = document.getElementById('confirmPw').value;
    const msg = document.getElementById('pw-msg');

    if (newPw !== confirm) {
      msg.textContent = 'Passwords do not match'; msg.className = 'mt-2 small text-danger'; msg.style.display = 'block'; return;
    }
    if (newPw.length < 6) {
      msg.textContent = 'Password must be at least 6 characters'; msg.className = 'mt-2 small text-danger'; msg.style.display = 'block'; return;
    }

    // verify current password first
    const loginRes = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: current }) });
    if (!loginRes.ok) {
      msg.textContent = 'Current password is wrong'; msg.className = 'mt-2 small text-danger'; msg.style.display = 'block'; return;
    }

    const res = await apiFetch('/api/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ newPassword: newPw }) });
    if (res.ok) {
      // update stored token
      const newToken = Buffer.from(newPw).toString('base64');
      localStorage.setItem('adminToken', btoa(newPw));
      msg.textContent = 'Password updated successfully!'; msg.className = 'mt-2 small text-success'; msg.style.display = 'block';
      document.getElementById('currentPw').value = '';
      document.getElementById('newPw').value = '';
      document.getElementById('confirmPw').value = '';
    } else {
      msg.textContent = 'Failed to update password'; msg.className = 'mt-2 small text-danger'; msg.style.display = 'block';
    }
  });

  // ── Init ─────────────────────────────────────────────────────
  loadSite();
});
