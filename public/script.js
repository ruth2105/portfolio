/* ── Theme Toggle ── */
(function () {
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.body.classList.add('light');

  btn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
  });
})();

/* ── Custom Cursor (desktop only) ── */
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

const isTouch = window.matchMedia('(hover: none)').matches;
if (!isTouch) {
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, .gallery-item, .filter-btn, .ex-tab').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ── Mobile menu ── */
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');
hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  hamburger.classList.toggle('active');
});
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
  });
});

/* ── Active nav on scroll ── */
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
});

/* ── Reveal on scroll ── */
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
reveals.forEach(el => revealObserver.observe(el));

/* ── Gallery filter ── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-item').forEach(item => {
      const show = filter === 'all' || item.classList.contains(filter);
      item.style.opacity       = show ? '1' : '0';
      item.style.pointerEvents = show ? 'auto' : 'none';
      item.style.transform     = show ? 'scale(1)' : 'scale(0.95)';
      item.style.transition    = 'opacity 0.4s, transform 0.4s';
    });
  });
});

/* ── Exhibition tabs ── */
document.querySelectorAll('.ex-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ex-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ex-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

/* ── Lightbox ── */
(function () {
  const lightbox = document.getElementById('lightbox');

  /* ── Close ── */
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  window.addEventListener('popstate', () => { if (lightbox.classList.contains('active')) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   document.getElementById('lightboxPrev').click();
    if (e.key === 'ArrowRight')  document.getElementById('lightboxNext').click();
  });

  /* ── Load comments — exposed globally so index.html can call it ── */
  window.loadLightboxComments = async function (artworkId) {
    const list = document.getElementById('lcList');
    const note = document.getElementById('lcNote');
    note.textContent = '';

    /* store artworkId on the form so the submit handler can read it */
    document.getElementById('lcForm').dataset.artworkId = artworkId || '';

    if (!artworkId) {
      list.innerHTML = '<p class="lc-empty">No artwork selected.</p>';
      return;
    }

    list.innerHTML = '<p class="lc-empty">Loading…</p>';
    try {
      const comments = await fetch('/api/comments/' + artworkId).then(r => r.json());
      if (!Array.isArray(comments) || !comments.length) {
        list.innerHTML = '<p class="lc-empty">No comments yet. Be the first.</p>';
      } else {
        list.innerHTML = comments.map(c => `
          <div class="lc-item">
            <div class="lc-item-header">
              <span class="lc-name">${escHtml(c.name)}</span>
              <span class="lc-date">${new Date(c.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
            </div>
            <p class="lc-message">${escHtml(c.message)}</p>
          </div>`).join('');
      }
    } catch {
      list.innerHTML = '<p class="lc-empty">Could not load comments.</p>';
    }
  };

  /* ── Post comment ── */
  document.getElementById('lcForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const artworkId    = this.dataset.artworkId;
    const artworkTitle = document.getElementById('lightboxTitle').textContent;
    const name         = document.getElementById('lcName').value.trim();
    const message      = document.getElementById('lcMessage').value.trim();
    const note         = document.getElementById('lcNote');
    const btn          = this.querySelector('.lc-submit');

    if (!artworkId) {
      note.textContent = 'Error: artwork not identified. Please close and reopen the image.';
      note.style.color = '#f87171';
      return;
    }
    if (!name || !message) return;

    btn.disabled    = true;
    btn.textContent = 'Posting…';

    try {
      const res  = await fetch('/api/comments/' + artworkId, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, message, artworkTitle })
      });
      const data = await res.json();
      if (res.ok) {
        note.textContent = '✓ Comment submitted — it will appear after review.';
        note.style.color = '#4ade80';
        document.getElementById('lcName').value    = '';
        document.getElementById('lcMessage').value = '';
      } else {
        note.textContent = data.message || 'Failed to post.';
        note.style.color = '#f87171';
      }
    } catch {
      note.textContent = 'Network error. Please try again.';
      note.style.color = '#f87171';
    }

    btn.disabled    = false;
    btn.textContent = 'Post Comment';
  });

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();

/* ── Bio language toggle ── */
document.querySelectorAll('.bio-lang').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bio-lang').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const lang = btn.dataset.lang;
    document.querySelector('.bio-en').style.display = lang === 'en' ? 'block' : 'none';
    document.querySelector('.bio-am').style.display = lang === 'am' ? 'block' : 'none';
  });
});

/* ── EmailJS config ── */
const EMAILJS_SERVICE_ID  = 'service_7vou6xh';
const EMAILJS_TEMPLATE_ID = 'template_xkdh9qq';

/* ── Contact form ── */
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const name    = document.getElementById('senderName').value.trim();
  const email   = document.getElementById('senderEmail').value.trim();
  const subject = document.getElementById('messageSubject').value.trim();
  const message = document.getElementById('messageContent').value.trim();
  const msgDiv  = document.getElementById('formMessage');
  const btn     = this.querySelector('.btn-submit');

  if (!name || !email || !subject || !message) {
    msgDiv.textContent  = 'Please fill in all fields.';
    msgDiv.className    = 'form-message error';
    msgDiv.style.display = 'block';
    return;
  }

  btn.textContent = 'Sending…';
  btn.disabled    = true;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    from_name:  name,
    from_email: email,
    subject:    subject,
    message:    message,
  }).then(() => {
    msgDiv.textContent   = 'Message sent. Thank you!';
    msgDiv.className     = 'form-message success';
    msgDiv.style.display = 'block';
    this.reset();
    btn.textContent = 'Send Message';
    btn.disabled    = false;
    setTimeout(() => { msgDiv.style.display = 'none'; }, 6000);
  }).catch(err => {
    console.error('EmailJS error:', err);
    msgDiv.textContent   = 'Something went wrong. Please email directly: Estifsolomon17@gmail.com';
    msgDiv.className     = 'form-message error';
    msgDiv.style.display = 'block';
    btn.textContent = 'Send Message';
    btn.disabled    = false;
  });
});
