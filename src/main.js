/**
 * SystemPrintings — Main Entry Point
 * Orchestrates loading, 3D scene, intro animation, and page interactions.
 */

import './style.css';
import { initScene, startIntroAnimation } from './scene.js';

// ─── DOM Elements ─────────────────────────────────────────────────
const canvas = document.getElementById('bg');
const loader = document.getElementById('loader');
const loaderFill = document.querySelector('.loader-fill');
const overlay = document.getElementById('overlay');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const filterBtns = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');
const contactForm = document.getElementById('contactForm');

// ─── Init ─────────────────────────────────────────────────────────
// Module scripts are deferred, so DOM is ready when this runs
initScene(canvas, onLoadProgress);
setupNavigation();
setupProductFilters();
setupScrollReveal();
setupContactForm();

// ─── Load Progress ────────────────────────────────────────────────
let loadReported = false;

// Safety: if loading stalls for 12 seconds, force proceed
setTimeout(() => {
  if (!loadReported) {
    console.warn('Loading timeout — forcing proceed');
    onLoadProgress(100);
  }
}, 12000);

function onLoadProgress(percent) {
  if (loaderFill) {
    loaderFill.style.width = percent + '%';
  }

  if (percent >= 100 && !loadReported) {
    loadReported = true;
    // Small delay so user sees 100%
    setTimeout(() => {
      // Start the 3D intro animation
      startIntroAnimation(onIntroComplete);
      // Fade out loader
      loader.classList.add('hidden');
    }, 400);
  }
}

function onIntroComplete() {
  // Fade in the overlay (all page content)
  overlay.classList.add('visible');

  // Trigger hero reveal with stagger
  setTimeout(() => {
    document.querySelectorAll('#hero .hero-line, #hero .hero-sub, #hero .hero-actions')
      .forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, i * 150);
      });
  }, 200);
}

// ─── Navigation ───────────────────────────────────────────────────
function setupNavigation() {
  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // Navbar hide/show on scroll
  let lastScroll = 0;
  const navbar = document.getElementById('navbar');
  const heroSection = document.getElementById('hero');
  
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    
    // Navbar hide/show
    if (current > lastScroll && current > 200) {
      navbar.style.transform = 'translateY(-100%)';
    } else {
      navbar.style.transform = 'translateY(0)';
    }
    lastScroll = current;
    
    // Canvas fade: starts at 20% scroll through hero, fully faded by 50%
    const heroHeight = heroSection.offsetHeight;
    const scrollPercentInHero = Math.min(current / heroHeight, 1);
    
    let canvasOpacity = 1;
    if (scrollPercentInHero > 0.2) {
      // Fade from 20% to 50% (30% range)
      canvasOpacity = 1 - ((scrollPercentInHero - 0.2) / 0.3);
    }
    
    canvas.style.opacity = Math.max(0, Math.min(1, canvasOpacity));
  }, { passive: true });
}

// ─── Product Filters ──────────────────────────────────────────────
function setupProductFilters() {
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      productCards.forEach((card) => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

// ─── Scroll Reveal (IntersectionObserver) ─────────────────────────
function setupScrollReveal() {
  // Add .reveal class to all revealable elements
  const revealTargets = document.querySelectorAll(
    '.about-card, .product-card, .why-card, .section-header, .contact-form, .contact-info-card'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  revealTargets.forEach((el) => observer.observe(el));
}

// ─── Contact Form ─────────────────────────────────────────────────
function setupContactForm() {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);

    // Simple validation feedback
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = '✓ Inquiry Sent!';
    btn.style.background = '#25D366';
    btn.disabled = true;

    // Log for now (replace with actual API call)
    console.log('Contact form submission:', data);

    // Reset after 3s
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
      contactForm.reset();
    }, 3000);
  });
}
