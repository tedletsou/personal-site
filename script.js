const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Animate the actual card height rather than imposing a maximum on its content.
const disclosureAnimations = new WeakMap();
document.querySelectorAll('.js-publication-card, .js-news-card').forEach((card, index) => {
  const details = card.querySelector('.js-publication-details, .js-news-details');
  const controls = card.querySelectorAll('.js-publication-surface, .js-publication-toggle, .js-news-surface, .js-news-toggle');
  const authors = card.querySelector('.js-publication-authors');
  if (!details) return;
  details.id = `card-details-${index}`;
  controls.forEach(control => {
    control.setAttribute('aria-controls', details.id);
    control.addEventListener('click', () => {
      const before = card.getBoundingClientRect().height;
      disclosureAnimations.get(card)?.cancel();
      const open = !card.classList.contains('is-open');
      details.hidden = !open;
      card.classList.toggle('is-open', open);
      controls.forEach(button => {
        button.setAttribute('aria-expanded', String(open));
        if (button.matches('.js-publication-toggle, .js-news-toggle')) {
          button.textContent = open ? '−' : '+';
          button.setAttribute('aria-label', open ? 'Collapse details' : 'Expand details');
        }
      });
      if (authors) authors.textContent = open ? authors.dataset.fullAuthors : authors.dataset.shortAuthors;
      const after = card.getBoundingClientRect().height;
      if (!motion.matches) {
        const animation = card.animate([
          {height: `${before}px`, minHeight: '0px', overflow: 'hidden'},
          {height: `${after}px`, minHeight: '0px', overflow: 'hidden'}
        ], {duration: 340, easing: 'cubic-bezier(.22,1,.36,1)'});
        disclosureAnimations.set(card, animation);
        if (open) details.animate([{opacity: 0}, {opacity: 1}], {duration: 300});
      }
    });
  });
});
const filters = [...document.querySelectorAll('.publication-filter')];
const year = document.querySelector('.publication-year-select');
const cards = [...document.querySelectorAll('.js-publication-card')];
const status = document.querySelector('.publication-status');
function applyFilters() {
  const theme = document.querySelector('.publication-filter.is-active')?.dataset.theme || 'all';
  const selectedYear = year?.value || 'all';
  let count = 0;
  cards.forEach(card => {
    card.hidden = !((theme === 'all' || card.dataset.themes.split(' ').includes(theme)) && (selectedYear === 'all' || card.dataset.year === selectedYear));
    if (!card.hidden) count++;
  });
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
  if (status) status.textContent = count ? `${count} ${count === 1 ? 'paper' : 'papers'}` : 'No papers match these filters. Try another theme or year.';
}
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.toggle('is-active', item === button));
  applyFilters();
}));
year?.addEventListener('change', applyFilters);
applyFilters();
// Honor motion preferences even if they change while the page is open.
function updateMotion() {
  document.querySelectorAll('video').forEach(video => {
    if (motion.matches) video.pause();
    else video.play().catch(() => {});
  });
}
motion.addEventListener('change', updateMotion);
updateMotion();

// Use the tallest collapsed card as the shared base size, recalculated on reflow.
function sizePublicationCards() {
  const grid = document.querySelector('.publication-grid');
  if (!grid) return;
  grid.style.removeProperty('--publication-card-height');
  const heights = cards.filter(card => !card.hidden).map(card => {
    const surface = card.querySelector('.publication-card__surface');
    const authors = card.querySelector('.js-publication-authors');
    const original = authors.textContent;
    authors.textContent = authors.dataset.shortAuthors;
    const height = surface.getBoundingClientRect().height + card.querySelector('.publication-card__footer').getBoundingClientRect().height + 2;
    authors.textContent = original;
    return height;
  });
  grid.style.setProperty('--publication-card-height', `${Math.ceil(Math.max(0, ...heights))}px`);
}
let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {sizePublicationCards(); measureScramble();});
});
document.fonts.ready.then(() => {sizePublicationCards(); measureScramble();});
filters.forEach(button => button.addEventListener('click', sizePublicationCards));
year?.addEventListener('change', sizePublicationCards);
sizePublicationCards();

// Restore per-letter font changes while keeping widths responsive and stable.
const fontPool = ['Inter', 'Archivo', 'IBM Plex Sans', 'Manrope', 'Space Grotesk'];
const title = document.querySelector('.hero__title');
const titleLines = [];
if (title) {
  title.setAttribute('aria-label', title.textContent.trim().replace(/\s+/g, ' '));
  title.querySelectorAll('.hero__title-line').forEach(line => {
    const text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    for (const char of text) {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = char === ' ' ? 'scramble-space' : 'scramble-char';
      line.appendChild(span);
    }
    titleLines.push(line);
  });
}
function measureScramble() {
  if (!title) return;
  title.style.removeProperty('font-size');
  const style = getComputedStyle(title);
  const size = parseFloat(style.fontSize);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  let maxLine = 0;
  titleLines.forEach(line => {
    let width = 0;
    line.querySelectorAll('span').forEach(span => {
      if (span.classList.contains('scramble-space')) {width += .24 * size; return;}
      const maxWidth = Math.max(...fontPool.map(font => {
        context.font = `${style.fontWeight} ${size}px "${font}"`;
        return context.measureText(span.textContent).width;
      }));
      span.style.width = `${maxWidth / size}em`;
      width += maxWidth;
    });
    maxLine = Math.max(maxLine, width);
  });
  const available = title.parentElement.clientWidth;
  if (maxLine > available) title.style.fontSize = `${size * available / maxLine * .99}px`;
}
let scrambleTimer;
function updateScramble() {
  clearInterval(scrambleTimer);
  const chars = title?.querySelectorAll('.scramble-char') || [];
  if (motion.matches || document.hidden) {
    chars.forEach(char => char.style.fontFamily = 'Inter, sans-serif');
    return;
  }
  scrambleTimer = setInterval(() => chars.forEach(char => {
    char.style.fontFamily = `"${fontPool[Math.floor(Math.random() * fontPool.length)]}", sans-serif`;
  }), 180);
}
motion.addEventListener('change', updateScramble);
document.addEventListener('visibilitychange', updateScramble);
measureScramble();
updateScramble();

function sizeNewsCards() {
  const grid = document.querySelector('.news-carousel__track');
  if (!grid) return;
  grid.style.setProperty('--news-card-height', '0px');
  const heights = [...grid.querySelectorAll('.news-carousel__item:not(.news-strip--featured)')].map(card => {
    const details = card.querySelector('.js-news-details');
    const wasHidden = details?.hidden;
    if (details) details.hidden = true;
    const height = card.getBoundingClientRect().height;
    if (details) details.hidden = wasHidden;
    return height;
  });
  grid.style.setProperty('--news-card-height', `${Math.ceil(Math.max(0, ...heights))}px`);
}
window.addEventListener('resize', sizeNewsCards);
document.fonts.ready.then(sizeNewsCards);
sizeNewsCards();

// Native transitions preserve normal links, browser history, and scroll behavior.
const hasPageTransitions = 'onpageswap' in window && 'onpagereveal' in window;
if (hasPageTransitions) {
  ['pageswap', 'pagereveal'].forEach(type => window.addEventListener(type, event => {
    // Skipping a transition rejects its ready promise; handle that expected outcome.
    event.viewTransition?.ready.catch(() => {});
    if (motion.matches) event.viewTransition?.skipTransition();
  }));
} else {
  // A short content fade provides the same feel on browsers without page transitions.
  const main = document.querySelector('main');
  let navigationPending = false;
  let pageAnimation;
  function revealPage() {
    navigationPending = false;
    pageAnimation?.cancel();
    if (main && !motion.matches) {
      pageAnimation = main.animate([
        {opacity: 0, transform: 'translateY(8px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 280, easing: 'cubic-bezier(.22,1,.36,1)'});
    }
  }
  window.addEventListener('pageshow', revealPage);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!main || motion.matches || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !link ||
        link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || !destination.pathname.endsWith('.html') ||
        destination.pathname === location.pathname) return;
    event.preventDefault();
    if (navigationPending) return;
    navigationPending = true;
    pageAnimation?.cancel();
    pageAnimation = main.animate([{opacity: 1}, {opacity: 0}],
      {duration: 120, easing: 'ease-out', fill: 'forwards'});
    pageAnimation.finished.then(() => location.assign(destination.href)).catch(() => {});
  });
}
