/* main.js - Vanilla JS site behavior
   Features:
   - Theme toggle (dark/light) with persistence
   - Mobile nav toggle
   - FAQ accordions
   - Exit-intent / timed Telegram popup
   - GA4 tracking for Telegram CTA clicks (gtag)
   - Contact form validation
*/

(() => {
  'use strict';

  // ==============================
  // Configuration
  // ==============================
  const TELEGRAM_URL = 'https://t.me/+P7efOIgccWMwYWM9';

  const GA_EVENT = {
    name: 'join_telegram',
    params: {
      event_category: 'funnel'
    }
  };

  const THEME_KEY = 'sti_theme'; // 'light' | 'dark'

  // ==============================
  // Helpers
  // ==============================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeGtagEvent(label, location) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', GA_EVENT.name, {
      ...GA_EVENT.params,
      event_label: label || 'telegram_cta',
      cta_location: location || 'unknown'
    });
  }

  function openTelegram(location) {
    safeGtagEvent('join_telegram', location);
    window.location.href = TELEGRAM_URL;
  }

  // ==============================
  // Theme (dark/light)
  // ==============================
  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }

    // fallback to OS preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');

    const btn = $('#themeToggle');
    if (btn) {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  function persistTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }

  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      persistTheme(next);
    });
  }

  // ==============================
  // Mobile Nav
  // ==============================
  const navToggle = $('#navToggle');
  const nav = $('#siteNav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? 'none' : 'flex';
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) {
        nav.style.display = 'flex';
        navToggle.setAttribute('aria-expanded', 'true');
      } else {
        nav.style.display = 'none';
        navToggle.setAttribute('aria-expanded', 'false');
      }
    }, { passive: true });
  }

  // ==============================
  // Telegram CTA tracking
  // ==============================
  $$('[data-telegram-cta]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const location = el.getAttribute('data-telegram-cta') || 'unknown';

      if (el.tagName.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey || e.button === 1)) {
        safeGtagEvent('join_telegram', location);
        return;
      }

      if (el.tagName.toLowerCase() === 'a') e.preventDefault();
      openTelegram(location);
    });
  });

  // ==============================
  // Accordions
  // ==============================
  $$('[data-accordion]').forEach((acc) => {
    const items = $$('[data-acc-item]', acc);
    items.forEach((item) => {
      const btn = $('[data-acc-btn]', item);
      const panel = $('[data-acc-panel]', item);
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const isOpen = panel.getAttribute('data-open') === 'true';
        panel.setAttribute('data-open', String(!isOpen));
        btn.setAttribute('aria-expanded', String(!isOpen));
        const icon = btn.querySelector('[data-acc-icon]');
        if (icon) icon.textContent = isOpen ? '+' : '–';
      });
    });
  });

  // ==============================
  // Exit intent / timed popup
  // ==============================
  const modalBackdrop = $('#tgModalBackdrop');
  const modalClose = $('#tgModalClose');
  const modalNoThanks = $('#tgModalNoThanks');
  const modalJoin = $('#tgModalJoin');

  function openModal(reason) {
    if (!modalBackdrop) return;
    modalBackdrop.setAttribute('data-open', 'true');
    modalBackdrop.setAttribute('data-reason', reason || 'unknown');
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.setAttribute('data-open', 'false');
  }

  function hasShownModal() {
    try { return sessionStorage.getItem('tg_modal_shown') === '1'; } catch { return false; }
  }

  function markShown() {
    try { sessionStorage.setItem('tg_modal_shown', '1'); } catch { /* ignore */ }
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalNoThanks) modalNoThanks.addEventListener('click', closeModal);

  if (modalJoin) {
    modalJoin.addEventListener('click', (e) => {
      e.preventDefault();
      const reason = modalBackdrop ? modalBackdrop.getAttribute('data-reason') : 'popup';
      openTelegram(`exit_popup_${reason}`);
    });
  }

  window.setTimeout(() => {
    if (hasShownModal()) return;
    markShown();
    openModal('timer_15s');
  }, 15000);

  document.addEventListener('mouseout', (e) => {
    if (hasShownModal()) return;
    if (e.clientY <= 0 && window.innerWidth >= 900) {
      markShown();
      openModal('exit_intent');
    }
  }, { passive: true });

  // ==============================
  // Contact form validation
  // ==============================
  const contactForm = $('#contactForm');
  const statusBox = $('#contactStatus');

  function setStatus(type, msg) {
    if (!statusBox) return;
    statusBox.className = 'form-status ' + (type || '');
    statusBox.textContent = msg;
    statusBox.hidden = false;
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = $('#name')?.value?.trim();
      const email = $('#email')?.value?.trim();
      const message = $('#message')?.value?.trim();

      if (!name || name.length < 2) return setStatus('err', 'Please enter your name (at least 2 characters).');
      if (!email || !isEmail(email)) return setStatus('err', 'Please enter a valid email address.');
      if (!message || message.length < 10) return setStatus('err', 'Please write a message (at least 10 characters).');

      setStatus('ok', 'Thanks! Your message is validated. For fastest support, message the Telegram channel admin.');
      contactForm.reset();
    });
  }

  // ==============================
  // Ensure Telegram anchors use the real URL
  // ==============================
  $$('a[data-telegram-href]').forEach((a) => {
    a.setAttribute('href', TELEGRAM_URL);
    a.setAttribute('rel', 'noopener');
  });
})();
