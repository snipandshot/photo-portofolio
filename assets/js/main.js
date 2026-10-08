// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.textContent = open ? 'Close' : 'Menu';
  });
}

// Footer year
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Gallery filters
const figures = [...document.querySelectorAll('.gallery figure')];
const filterButtons = document.querySelectorAll('.filters button');

function applyFilter(category) {
  filterButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === category));
  figures.forEach(fig => {
    const show = category === 'all' || fig.dataset.category === category;
    fig.classList.toggle('is-hidden', !show);
  });
}
filterButtons.forEach(btn => btn.addEventListener('click', () => {
  applyFilter(btn.dataset.filter);
  history.replaceState(null, '', btn.dataset.filter === 'all' ? '#' : '#' + btn.dataset.filter);
}));
// Allow links like index.html#fashion from the nav
const hash = location.hash.slice(1);
if (hash && [...filterButtons].some(b => b.dataset.filter === hash)) applyFilter(hash);
window.addEventListener('hashchange', () => applyFilter(location.hash.slice(1) || 'all'));

// Lightbox
const lightbox = document.querySelector('.lightbox');
if (lightbox && figures.length) {
  const lbImg = lightbox.querySelector('img');
  const lbCount = lightbox.querySelector('.lb-count');
  let current = 0;
  let lastFocus = null;

  const visible = () => figures.filter(f => !f.classList.contains('is-hidden'));

  function show(index) {
    const list = visible();
    current = (index + list.length) % list.length;
    const img = list[current].querySelector('img');
    lbImg.src = img.dataset.full || img.src;
    lbImg.alt = img.alt;
    lbCount.textContent = `${current + 1} of ${list.length}`;
  }
  function open(fig) {
    lastFocus = document.activeElement;
    show(visible().indexOf(fig));
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lb-close').focus();
  }
  function close() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  figures.forEach(fig => {
    fig.tabIndex = 0;
    fig.addEventListener('click', () => open(fig));
    fig.addEventListener('keydown', e => { if (e.key === 'Enter') open(fig); });
  });
  lightbox.querySelector('.lb-close').addEventListener('click', close);
  lightbox.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });

  // Swipe on phones
  let startX = 0;
  lightbox.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
}
