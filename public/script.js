/* ── Custom Cursor ── */
const cursor = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
});

function animateRing() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top = ringY + 'px';
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a, button, .gallery-item, .filter-btn, .ex-tab').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ── Mobile menu ── */
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
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
      item.style.opacity = show ? '1' : '0';
      item.style.pointerEvents = show ? 'auto' : 'none';
      item.style.transform = show ? 'scale(1)' : 'scale(0.95)';
      item.style.transition = 'opacity 0.4s, transform 0.4s';
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
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  let images = [], current = 0;

  document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.gallery-item');
    images = Array.from(items).map(item => ({
      src: item.querySelector('img').src,
      caption: item.querySelector('h4')?.textContent || ''
    }));
    items.forEach((item, i) => {
      item.addEventListener('click', () => open(i));
    });
  });

  function open(i) {
    current = i;
    lightboxImg.src = images[i].src;
    lightboxCaption.textContent = images[i].caption;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({ lightbox: true }, '');
  }
  function close() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
  function prev() { current = (current - 1 + images.length) % images.length; open(current); }
  function next() { current = (current + 1) % images.length; open(current); }

  document.getElementById('lightboxClose').addEventListener('click', close);
  document.getElementById('lightboxPrev').addEventListener('click', prev);
  document.getElementById('lightboxNext').addEventListener('click', next);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  window.addEventListener('popstate', e => {
    if (lightbox.classList.contains('active')) close();
  });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
})();

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
    msgDiv.textContent = 'Please fill in all fields.';
    msgDiv.className = 'form-message error';
    msgDiv.style.display = 'block';
    return;
  }

  btn.textContent = 'Sending...';
  btn.disabled = true;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    from_name:  name,
    from_email: email,
    subject:    subject,
    message:    message,
  }).then(() => {
    msgDiv.textContent = 'Message sent. Thank you!';
    msgDiv.className = 'form-message success';
    msgDiv.style.display = 'block';
    this.reset();
    btn.textContent = 'Send Message';
    btn.disabled = false;
    setTimeout(() => { msgDiv.style.display = 'none'; }, 6000);
  }).catch(err => {
    console.error('EmailJS error:', err);
    msgDiv.textContent = 'Something went wrong. Please email directly: Estifsolomon17@gmail.com';
    msgDiv.className = 'form-message error';
    msgDiv.style.display = 'block';
    btn.textContent = 'Send Message';
    btn.disabled = false;
  });
});
