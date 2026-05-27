/* admin.js — login + full admin panel */

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}

const store = sessionStorage;
function getToken() { return store.getItem('adminToken') || ''; }
function authHeaders(extra) {
  return Object.assign({ 'Authorization': 'Bearer ' + getToken() }, extra || {});
}
async function apiFetch(url, options) {
  options = options || {};
  options.headers = Object.assign(authHeaders(), options.headers || {});
  const res = await fetch(url, options);
  if (res.status === 401) {
    store.removeItem('adminToken');
    alert('Session expired. Please login again.');
    location.reload();
  }
  return res;
}

const LOCKOUT_MS = 30000, MAX_ATTEMPTS = 5;
let loginAttempts = 0, lockoutUntil = 0;
function isLockedOut() { return Date.now() < lockoutUntil; }
function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}
function startLockoutTimer() {
  const el = document.getElementById('lockoutMsg');
  document.getElementById('loginBtn').disabled = true;
  const tick = () => {
    if (!isLockedOut()) {
      el.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
      loginAttempts = 0;
      return;
    }
    el.textContent = 'Too many attempts. Try again in ' + Math.ceil((lockoutUntil - Date.now()) / 1000) + 's.';
    el.style.display = 'block';
    setTimeout(tick, 1000);
  };
  tick();
}

async function doLogin() {
  if (isLockedOut()) { startLockoutTimer(); return; }
  const pwEl = document.getElementById('adminPassword');
  const pw = pwEl.value;
  if (!pw) return;
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'Logging in...';
  showLoginError('');
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    pwEl.value = '';
    if (res.ok) {
      const data = await res.json();
      store.setItem('adminToken', data.token);
      loginAttempts = 0;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      initDashboard();
    } else {
      loginAttempts++;
      let errMsg = 'Wrong password';
      try { const d = await res.json(); errMsg = d.message || errMsg; } catch {}
      if (res.status >= 500) errMsg = 'Server error (' + res.status + ')';
      if (res.status === 404) errMsg = 'API not found (404)';
      if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_MS;
        showLoginError(''); startLockoutTimer();
      } else {
        showLoginError(errMsg);
        document.getElementById('loginBtn').disabled = false;
        document.getElementById('loginBtn').textContent = 'Login';
      }
    }
  } catch (err) {
    showLoginError('Network error: ' + err.message);
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').textContent = 'Login';
  }
}

function makeToggle(inputId, btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', function() {
    const inp = document.getElementById(inputId);
    const hidden = inp.type === 'password';
    inp.type = hidden ? 'text' : 'password';
    btn.innerHTML = hidden ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  });
}

function checkStrength(val) {
  const fill = document.getElementById('pw-strength-fill');
  const label = document.getElementById('pw-strength-label');
  if (!fill) return;
  if (!val) { fill.style.width = '0'; label.textContent = ''; return; }
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct:'20%', color:'#ef4444', text:'Very weak' },
    { pct:'40%', color:'#f97316', text:'Weak' },
    { pct:'60%', color:'#eab308', text:'Fair' },
    { pct:'80%', color:'#22c55e', text:'Strong' },
    { pct:'100%', color:'#16a34a', text:'Very strong' }
  ];
  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('adminPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
  });
  makeToggle('adminPassword', 'loginTogglePw');
  document.getElementById('logoutBtn').addEventListener('click', async function(e) {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    store.removeItem('adminToken');
    location.reload();
  });
  document.getElementById('sidebarToggle').addEventListener('click', function() {
    const nav = document.getElementById('sidebarNav');
    const icon = document.getElementById('toggleIcon');
    nav.classList.toggle('open');
    icon.className = nav.classList.contains('open')
      ? 'bi bi-chevron-up text-secondary'
      : 'bi bi-chevron-down text-secondary';
  });
  const saved = getToken();
  if (saved) {
    fetch('/api/site', { headers: { Authorization: 'Bearer ' + saved } })
      .then(function(r) {
        if (r.ok) {
          document.getElementById('loginScreen').style.display = 'none';
          document.getElementById('adminDashboard').style.display = 'block';
          initDashboard();
        } else { store.removeItem('adminToken'); }
      })
      .catch(function() { store.removeItem('adminToken'); });
  }
});

function initDashboard() {
  const bsModal = new bootstrap.Modal(document.getElementById('itemModal'));
  let modalContext = null;
  const MAX_LENGTHS = {
    title:200, name:120, year:10, venue:200, medium:120,
    dimensions:80, location:200, publication:200, link:500,
    description:2000, heroHeading:200, heroQuote:400,
    contactNote:500, instagram:200, email:200, phone:30
  };
  function cap(key, value) { return String(value || '').trim().slice(0, MAX_LENGTHS[key] || 1000); }
  function flash(id) {
    const el = document.getElementById(id);
    el.style.display = 'inline';
    setTimeout(function() { el.style.display = 'none'; }, 2500);
  }

  document.querySelectorAll('[data-section]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sec = e.currentTarget.dataset.section;
      document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
      document.getElementById(sec).classList.add('active');
      document.querySelectorAll('[data-section]').forEach(function(l) { l.classList.remove('active'); });
      e.currentTarget.classList.add('active');
      if (sec === 'site') loadSite();
      else if (sec === 'statement') loadStatement();
      else if (sec === 'gallery') loadGallery();
      else if (sec === 'exhibitions') loadExhibitions();
      else if (sec === 'password') initPasswordSection();
      else if (['events','projects','press'].includes(sec)) loadList(sec);
      else if (sec === 'comments') loadComments();
      if (window.innerWidth < 768) {
        document.getElementById('sidebarNav').classList.remove('open');
        document.getElementById('toggleIcon').className = 'bi bi-chevron-down text-secondary';
      }
    });
  });

  async function loadSite() {
    const s = await apiFetch('/api/site').then(function(r) { return r.json(); });
    const f = document.getElementById('site-form');
    function set(n, v) { const el = f.querySelector('[name="' + n + '"]'); if (el) el.value = v || ''; }
    set('name', s.name); set('nameAmharic', s.nameAmharic); set('title', s.title);
    set('location', s.location); set('instagram', s.instagram); set('email', s.email);
    set('phone', s.phone); set('heroHeading', s.heroHeading); set('heroQuote', s.heroQuote);
    set('heroImage', s.heroImage); set('contactNote', s.contactNote);
    document.getElementById('hero-img-name').textContent = s.heroImage || '';
    document.getElementById('bio-en').value = (s.bioParagraphs || []).join('\n\n');
    document.getElementById('bio-am').value = (s.bioAmharic || []).join('\n\n');
    document.getElementById('edu-raw').value = (s.education || []).join('\n');
    document.getElementById('awards-raw').value = (s.awards || []).join('\n');
    if (s.aboutImage) {
      document.getElementById('about-img-preview').innerHTML =
        '<img src="' + esc(s.aboutImage) + '" style="height:70px;border-radius:6px;object-fit:cover" alt="">';
    }
    const cvEl = document.getElementById('cv-file-current');
    if (cvEl) {
      cvEl.innerHTML = s.cvFile
        ? '<a href="' + esc(s.cvFile) + '" target="_blank" class="small text-success"><i class="bi bi-file-earmark-pdf"></i> Current CV uploaded</a>'
        : '<span class="small text-muted">No CV uploaded yet</span>';
    }
  }

  document.getElementById('site-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData();
    function get(n) { return cap(n, f.querySelector('[name="' + n + '"]')?.value || ''); }
    ['name','nameAmharic','title','location','instagram','email','phone',
     'heroHeading','heroQuote','heroImage','contactNote'].forEach(function(k) { fd.append(k, get(k)); });
    fd.append('bioParagraphs', JSON.stringify(document.getElementById('bio-en').value.split(/\n{2,}/).map(function(s){return s.trim();}).filter(Boolean)));
    fd.append('bioAmharic',    JSON.stringify(document.getElementById('bio-am').value.split(/\n{2,}/).map(function(s){return s.trim();}).filter(Boolean)));
    fd.append('education',     JSON.stringify(document.getElementById('edu-raw').value.split('\n').map(function(s){return s.trim();}).filter(Boolean)));
    fd.append('awards',        JSON.stringify(document.getElementById('awards-raw').value.split('\n').map(function(s){return s.trim();}).filter(Boolean)));
    const imgFile = f.querySelector('[name="aboutImage"]').files[0];
    if (imgFile) fd.append('aboutImage', imgFile);
    const cvFile = f.querySelector('[name="cvFile"]') && f.querySelector('[name="cvFile"]').files[0];
    if (cvFile) fd.append('cvFile', cvFile);
    await apiFetch('/api/site', { method: 'PUT', body: fd });
    flash('site-msg');
    loadSite();
  });

  async function loadStatement() {
    const s = await apiFetch('/api/site').then(function(r) { return r.json(); });
    document.getElementById('stmt-paras').value = (s.statementParagraphs || []).join('\n\n');
    document.getElementById('stmt-quote').value = s.statementQuote || '';
  }

  document.getElementById('statement-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const paras = document.getElementById('stmt-paras').value.split(/\n{2,}/).map(function(s){return s.trim();}).filter(Boolean);
    const quote = document.getElementById('stmt-quote').value.trim().slice(0, 500);
    const fd = new FormData();
    fd.append('statementParagraphs', JSON.stringify(paras));
    fd.append('statementQuote', quote);
    await apiFetch('/api/site', { method: 'PUT', body: fd });
    flash('stmt-msg');
  });

  loadSite();
  loadPendingCount();

  async function loadGallery() {
    const items = await apiFetch('/api/gallery').then(function(r) { return r.json(); });
    const c = document.getElementById('gallery-list');
    if (!items.length) { c.innerHTML = '<p class="empty-msg">No artworks yet.</p>'; return; }
    c.innerHTML = '<p class="text-muted small mb-2"><i class="bi bi-grip-vertical"></i> Drag rows to reorder</p>' +
      items.map(function(g) {
        return '<div class="card-item" data-id="' + esc(g._id) + '" data-type="gallery" draggable="true" style="cursor:grab">' +
          '<i class="bi bi-grip-vertical text-muted me-1" style="font-size:1.1rem;flex-shrink:0"></i>' +
          '<img src="' + esc(g.file) + '" class="thumb" alt="' + esc(g.title) + '">' +
          '<div style="flex:1"><h6>' + esc(g.title) + '</h6>' +
          '<small>' + esc([g.medium, g.dimensions, g.year].filter(Boolean).join(' · ')) + '</small></div>' +
          '<div class="d-flex gap-1">' +
            '<button class="btn-icon text-primary action-edit" aria-label="Edit"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-icon text-danger action-del" aria-label="Delete"><i class="bi bi-trash"></i></button>' +
          '</div></div>';
      }).join('');
    initDragSort(c);
  }

  function initDragSort(container) {
    let dragging = null;
    container.querySelectorAll('.card-item[draggable]').forEach(function(el) {
      el.addEventListener('dragstart', function() {
        dragging = el;
        setTimeout(function() { el.style.opacity = '0.4'; }, 0);
      });
      el.addEventListener('dragend', function() {
        el.style.opacity = '';
        dragging = null;
        saveGalleryOrder(container);
      });
      el.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (!dragging || dragging === el) return;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) container.insertBefore(dragging, el);
        else container.insertBefore(dragging, el.nextSibling);
      });
    });
  }

  async function saveGalleryOrder(container) {
    const order = Array.from(container.querySelectorAll('.card-item[data-id]')).map(function(el, i) {
      return { id: el.dataset.id, sortOrder: i };
    });
    await apiFetch('/api/gallery/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order })
    });
  }

  document.getElementById('add-gallery-btn').addEventListener('click', function() { openModal('gallery'); });

  let currentExTab = 'group';
  document.querySelectorAll('.ex-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ex-tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.ex-section').forEach(function(s) { s.style.display = 'none'; });
      currentExTab = btn.dataset.tab;
      document.getElementById('ex-' + currentExTab).style.display = '';
      loadExList(currentExTab);
    });
  });

  async function loadExhibitions() {
    loadExList('group'); loadExList('solo'); loadExList('workshops');
  }

  async function loadExList(tab) {
    const data = await apiFetch('/api/exhibitions').then(function(r) { return r.json(); });
    const items = data[tab] || [];
    const c = document.getElementById('exlist-' + tab);
    if (!items.length) { c.innerHTML = '<p class="empty-msg">None yet.</p>'; return; }
    c.innerHTML = items.map(function(e) {
      return '<div class="card-item" data-id="' + esc(e._id) + '" data-tab="' + esc(tab) + '" data-type="exhibition">' +
        '<div style="flex:1"><h6>' + esc(e.title) + '</h6>' +
        '<small>' + esc(e.year) + ' · ' + esc(e.venue) + '</small></div>' +
        '<div class="d-flex gap-1">' +
          '<button class="btn-icon text-primary action-edit" aria-label="Edit"><i class="bi bi-pencil-square"></i></button>' +
          '<button class="btn-icon text-danger action-del" aria-label="Delete"><i class="bi bi-trash"></i></button>' +
        '</div></div>';
    }).join('');
  }

  document.querySelectorAll('.add-ex-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { openExModal(btn.dataset.tab); });
  });

  async function openExModal(tab, id) {
    modalContext = { type: 'exhibition', tab: tab, id: id || null };
    document.getElementById('modalTitle').textContent = (id ? 'Edit' : 'Add') + ' Exhibition';
    let ex = {};
    if (id) {
      const data = await apiFetch('/api/exhibitions').then(function(r) { return r.json(); });
      ex = (data[tab] || []).find(function(i) { return i._id === id; }) || {};
    }
    document.getElementById('modalBody').innerHTML =
      '<div class="mb-3"><label class="form-label fw-semibold">Title *</label>' +
      '<input type="text" class="form-control" id="f_title" maxlength="200" value="' + esc(ex.title || '') + '" required></div>' +
      '<div class="mb-3"><label class="form-label fw-semibold">Year</label>' +
      '<input type="text" class="form-control" id="f_year" maxlength="10" value="' + esc(ex.year || '') + '"></div>' +
      '<div class="mb-3"><label class="form-label fw-semibold">Venue / Location</label>' +
      '<input type="text" class="form-control" id="f_venue" maxlength="200" value="' + esc(ex.venue || '') + '"></div>';
    bsModal.show();
  }

  const listForms = {
    events: { title:'Event', fields:[
      {id:'title',label:'Event Title',type:'text',required:true,max:200},
      {id:'date',label:'Date',type:'date',required:true},
      {id:'location',label:'Location',type:'text',max:200},
      {id:'description',label:'Description',type:'textarea',max:2000},
      {id:'link',label:'Link (optional)',type:'url',max:500},
      {id:'image',label:'Image',type:'file'}
    ]},
    projects: { title:'Project', fields:[
      {id:'title',label:'Project Title',type:'text',required:true,max:200},
      {id:'year',label:'Year',type:'text',max:10},
      {id:'medium',label:'Medium / Type',type:'text',max:120},
      {id:'description',label:'Description',type:'textarea',max:2000},
      {id:'link',label:'Link (optional)',type:'url',max:500},
      {id:'image',label:'Image',type:'file'}
    ]},
    press: { title:'Press / Interview', fields:[
      {id:'title',label:'Title / Headline',type:'text',required:true,max:200},
      {id:'publication',label:'Publication / Platform',type:'text',required:true,max:200},
      {id:'date',label:'Date',type:'date'},
      {id:'location',label:'Location',type:'text',max:200},
      {id:'link',label:'URL',type:'url',max:500},
      {id:'image',label:'Image',type:'file'}
    ]}
  };

  const fmt = function(d) { return d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : ''; };

  async function loadList(section) {
    const items = await apiFetch('/api/' + section).then(function(r) { return r.json(); });
    const c = document.getElementById(section + '-list');
    if (!items.length) { c.innerHTML = '<p class="empty-msg">No ' + esc(section) + ' yet.</p>'; return; }
    c.innerHTML = items.map(function(item) {
      return '<div class="card-item" data-id="' + esc(item._id) + '" data-type="' + esc(section) + '">' +
        (item.image ? '<img src="' + esc(item.image) + '" class="thumb" alt="">' : '') +
        '<div style="flex:1"><h6>' + esc(item.title) + '</h6>' +
        '<small>' + (item.date ? esc(fmt(item.date)) + ' · ' : '') + esc(item.publication || item.medium || item.location || '') + '</small></div>' +
        '<div class="d-flex gap-1">' +
          '<button class="btn-icon text-primary action-edit" aria-label="Edit"><i class="bi bi-pencil-square"></i></button>' +
          '<button class="btn-icon text-danger action-del" aria-label="Delete"><i class="bi bi-trash"></i></button>' +
        '</div></div>';
    }).join('');
  }

  document.getElementById('add-events-btn').addEventListener('click', function() { openModal('events'); });
  document.getElementById('add-projects-btn').addEventListener('click', function() { openModal('projects'); });
  document.getElementById('add-press-btn').addEventListener('click', function() { openModal('press'); });

  document.addEventListener('click', async function(e) {
    const editBtn = e.target.closest('.action-edit');
    const delBtn  = e.target.closest('.action-del');
    if (!editBtn && !delBtn) return;
    const card = (editBtn || delBtn).closest('.card-item');
    if (!card) return;
    const id = card.dataset.id, type = card.dataset.type, tab = card.dataset.tab;
    if (editBtn) {
      if (type === 'exhibition') openExModal(tab, id);
      else openModal(type, id);
    }
    if (delBtn) {
      if (!confirm('Delete this item?')) return;
      if (type === 'exhibition') {
        await apiFetch('/api/exhibitions/' + tab + '/' + id, { method: 'DELETE' });
        loadExList(tab);
      } else {
        const endpoint = type === 'gallery' ? '/api/gallery' : '/api/' + type;
        await apiFetch(endpoint + '/' + id, { method: 'DELETE' });
        if (type === 'gallery') loadGallery(); else loadList(type);
      }
    }
  });

  const galleryFields = [
    {id:'title',label:'Title',type:'text',required:true,max:200},
    {id:'medium',label:'Medium',type:'text',max:120},
    {id:'dimensions',label:'Dimensions',type:'text',max:80},
    {id:'year',label:'Year',type:'text',max:10},
    {id:'image',label:'Image',type:'file'}
  ];

  async function openModal(type, id) {
    const isGallery = type === 'gallery';
    const config = isGallery ? { title:'Artwork', fields:galleryFields } : listForms[type];
    modalContext = { type:type, id:id || null };
    document.getElementById('modalTitle').textContent = (id ? 'Edit ' : 'Add ') + config.title;
    let existing = {};
    if (id) {
      const endpoint = isGallery ? '/api/gallery' : '/api/' + type;
      const items = await apiFetch(endpoint).then(function(r) { return r.json(); });
      existing = items.find(function(i) { return i._id === id; }) || {};
    }
    document.getElementById('modalBody').innerHTML = config.fields.map(function(f) {
      if (f.type === 'file') {
        const cur = existing.image || existing.file || '';
        return '<div class="mb-3"><label class="form-label fw-semibold" style="font-size:.85rem">' + esc(f.label) + '</label>' +
          '<div id="drop-zone" style="border:2px dashed #ccc;border-radius:8px;padding:1.5rem;text-align:center;cursor:pointer;background:#fafafa">' +
            (cur ? '<img id="upload-preview" src="' + esc(cur) + '" style="max-height:120px;border-radius:6px;object-fit:cover;margin-bottom:.75rem;display:block;margin:0 auto .75rem">' :
                   '<img id="upload-preview" style="max-height:120px;display:none;margin:0 auto .75rem">') +
            '<p id="drop-label" style="margin:0;color:#888;font-size:.82rem">' + (cur ? 'Drop new image or click to replace' : '<i class="bi bi-cloud-upload" style="font-size:1.5rem;display:block;margin-bottom:.4rem"></i>Drop image here or click to browse') + '</p>' +
          '</div>' +
          '<input type="file" id="f_image" accept="image/*" style="display:none"></div>';
      }
      if (f.type === 'textarea') {
        return '<div class="mb-3"><label class="form-label fw-semibold" style="font-size:.85rem">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
          '<textarea class="form-control" id="f_' + esc(f.id) + '" rows="3" maxlength="' + (f.max||2000) + '">' + esc(existing[f.id] || '') + '</textarea></div>';
      }
      return '<div class="mb-3"><label class="form-label fw-semibold" style="font-size:.85rem">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
        '<input type="' + esc(f.type) + '" class="form-control" id="f_' + esc(f.id) + '" value="' + esc(existing[f.id] || '') + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.required ? ' required' : '') + '></div>';
    }).join('');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('f_image');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', function() { fileInput.click(); });
      dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = '#c9a84c'; });
      dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = '#ccc'; });
      dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.style.borderColor = '#ccc'; if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); });
      fileInput.addEventListener('change', function() { if (fileInput.files[0]) handleImageFile(fileInput.files[0]); });
    }
    function handleImageFile(file) {
      if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
      if (file.size > 10*1024*1024) { alert('Image must be under 10 MB.'); return; }
      const reader = new FileReader();
      reader.onload = function(ev) {
        const preview = document.getElementById('upload-preview');
        preview.src = ev.target.result; preview.style.display = 'block';
        document.getElementById('drop-label').textContent = file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
        const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files;
      };
      reader.readAsDataURL(file);
    }
    bsModal.show();
  }

  document.getElementById('modalSave').addEventListener('click', async function() {
    if (!modalContext) return;
    const { type, tab, id } = modalContext;
    if (type === 'exhibition') {
      const body = {
        title: cap('title', document.getElementById('f_title').value),
        year:  cap('year',  document.getElementById('f_year').value),
        venue: cap('venue', document.getElementById('f_venue').value)
      };
      if (!body.title) { document.getElementById('f_title').classList.add('is-invalid'); return; }
      const url = id ? '/api/exhibitions/' + tab + '/' + id : '/api/exhibitions/' + tab;
      await apiFetch(url, { method: id ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      bsModal.hide(); loadExList(tab); return;
    }
    const isGallery = type === 'gallery';
    const fields = isGallery ? galleryFields : listForms[type].fields;
    const fd = new FormData();
    let valid = true;
    for (const f of fields) {
      if (f.type === 'file') {
        const file = document.getElementById('f_image')?.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
          if (file.size > 10*1024*1024) { alert('Image must be under 10 MB.'); return; }
          fd.append('image', file);
        }
      } else {
        const el = document.getElementById('f_' + f.id);
        const val = cap(f.id, el?.value || '');
        if (f.required && !val) { el?.classList.add('is-invalid'); valid = false; }
        else { el?.classList.remove('is-invalid'); fd.append(f.id, val); }
      }
    }
    if (!valid) return;
    const endpoint = isGallery ? '/api/gallery' : '/api/' + type;
    const url = id ? endpoint + '/' + id : endpoint;
    const res = await apiFetch(url, { method: id ? 'PUT' : 'POST', body: fd });
    if (!res.ok) { alert('Save failed'); return; }
    bsModal.hide();
    if (isGallery) loadGallery(); else loadList(type);
  });

  function initPasswordSection() {
    makeToggle('currentPw', 'toggleCurrentPw');
    makeToggle('newPw', 'toggleNewPw');
    makeToggle('confirmPw', 'toggleConfirmPw');
    document.getElementById('newPw').addEventListener('input', function() { checkStrength(this.value); });
    const oldBtn = document.getElementById('changePwBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', async function() {
      const current  = document.getElementById('currentPw').value;
      const newPw    = document.getElementById('newPw').value;
      const confirm  = document.getElementById('confirmPw').value;
      const msg = document.getElementById('pw-msg');
      function showErr(text) { msg.textContent = text; msg.className = 'mt-2 small text-danger'; msg.style.display = 'block'; }
      if (!current) { showErr('Enter your current password'); return; }
      if (!newPw)   { showErr('Enter a new password'); return; }
      if (newPw.length < 8) { showErr('Password must be at least 8 characters'); return; }
      if (!/[A-Z]/.test(newPw)) { showErr('Password must contain at least one uppercase letter'); return; }
      if (!/[0-9]/.test(newPw)) { showErr('Password must contain at least one number'); return; }
      if (newPw !== confirm) { showErr('Passwords do not match'); return; }
      const verifyRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: current })
      });
      if (!verifyRes.ok) { showErr('Current password is incorrect'); return; }
      const res = await apiFetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw })
      });
      if (res.ok) {
        msg.textContent = 'Password updated! Logging you out…';
        msg.className = 'mt-2 small text-success';
        msg.style.display = 'block';
        setTimeout(function() { store.removeItem('adminToken'); location.reload(); }, 2000);
      } else {
        const d = await res.json().catch(function() { return {}; });
        showErr(d.message || 'Failed to update password');
      }
    });
  }

  /* ── COMMENTS ── */
  let currentCommentFilter = 'pending';

  async function loadPendingCount() {
    try {
      const all = await apiFetch('/api/admin/comments').then(r => r.json());
      const pending = all.filter(c => !c.approved).length;
      const badge = document.getElementById('nav-pending-badge');
      if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline' : 'none'; }
    } catch {}
  }

  async function loadComments() {
    const all = await apiFetch('/api/admin/comments').then(r => r.json());
    const pending = all.filter(c => !c.approved).length;
    const pendingEl = document.getElementById('pending-count');
    if (pendingEl) pendingEl.textContent = pending + ' pending';
    document.querySelectorAll('.comment-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.comment-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentCommentFilter = btn.dataset.filter;
        renderComments(all, currentCommentFilter);
      });
    });
    renderComments(all, currentCommentFilter);
  }

  function renderComments(all, filter) {
    const c = document.getElementById('comments-list');
    let items = all;
    if (filter === 'pending')  items = all.filter(c => !c.approved);
    if (filter === 'approved') items = all.filter(c => c.approved);
    if (!items.length) { c.innerHTML = '<p class="empty-msg">No ' + filter + ' comments.</p>'; return; }
    c.innerHTML = items.map(function(cm) {
      const date = new Date(cm.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      return '<div class="card-item" style="flex-direction:column;align-items:stretch;gap:.5rem">' +
        '<div class="d-flex justify-content-between align-items-start">' +
          '<div><strong style="font-size:.88rem">' + esc(cm.name) + '</strong>' +
          '<span class="ms-2 badge ' + (cm.approved ? 'bg-success' : 'bg-warning text-dark') + '">' + (cm.approved ? 'Approved' : 'Pending') + '</span></div>' +
          '<small class="text-muted">' + esc(date) + '</small>' +
        '</div>' +
        '<small class="text-muted">On: <em>' + esc(cm.artworkTitle || cm.artworkId) + '</em></small>' +
        '<p style="font-size:.85rem;margin:0;color:#444">' + esc(cm.message) + '</p>' +
        '<div class="d-flex gap-2 mt-1">' +
          (!cm.approved ? '<button class="btn btn-sm btn-success comment-approve" data-id="' + esc(cm._id) + '">Approve</button>' : '') +
          '<button class="btn btn-sm btn-outline-danger comment-delete" data-id="' + esc(cm._id) + '">Delete</button>' +
        '</div></div>';
    }).join('');
    c.querySelectorAll('.comment-approve').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        await apiFetch('/api/admin/comments/' + btn.dataset.id + '/approve', { method: 'PUT' });
        loadComments(); loadPendingCount();
      });
    });
    c.querySelectorAll('.comment-delete').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Delete this comment?')) return;
        await apiFetch('/api/admin/comments/' + btn.dataset.id, { method: 'DELETE' });
        loadComments(); loadPendingCount();
      });
    });
  }

} /* end initDashboard */
