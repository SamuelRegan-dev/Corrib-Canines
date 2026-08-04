// Demo 1 — hero slideshow, load/scroll reveals, contact form.

// Flags that JS is alive so the CSS can safely start .reveal elements hidden.
document.documentElement.classList.add('js');

// ------------------------------------------------------- header + parallax
// Ported from java.js: the header fills in past 50px, and the hero image
// tracks scroll at half speed. Both run off one rAF-throttled listener.
const isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches;
const pageHeader = document.querySelector('header');
const brandLogo = document.querySelector('.brand');
const slidesLayer = document.querySelector('.slides');
const heroSection = document.querySelector('.hero');
let scrollTicking = false;

function updateScrollEffects() {
    const y = window.scrollY;

    if (pageHeader) pageHeader.classList.toggle('scrolled', y > 50);

    // Insignia only once the landing page is behind us.
    if (brandLogo && heroSection) {
        brandLogo.classList.toggle('visible', y > heroSection.offsetHeight * 0.8);
    }

    // Half-speed travel. .slides is 150% tall and hung 25% above the hero, so
    // it never drags an edge into view. translate3d is composited off the main
    // thread, which is why this one can run on phones too — see note below.
    if (slidesLayer) {
        slidesLayer.style.transform = 'translate3d(0, ' + (y * 0.5) + 'px, 0)';
    }

    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollEffects);
}, { passive: true });

updateScrollEffects();

// ------------------------------------------------------------ smooth scroll
// Ported from java.js. This eased wheel handling — not the parallax maths —
// is what gives index.html its floaty feel. Pointer devices only; touch
// already has native momentum and hijacking it makes things worse.
let targetScroll = window.scrollY;
let isNavigating = false;
// What the loop last left the page at, so we can tell our own scrolling apart
// from everyone else's.
let lastAppliedY = window.scrollY;

// Re-sync whenever the page moves by something that isn't this loop: the
// browser restoring scroll on reload, a scrollbar drag, arrow keys,
// find-in-page. Without this, targetScroll keeps its stale value and the loop
// hauls the page back there — which is the reload jump you were seeing.
function resyncScrollTarget() {
    targetScroll = window.scrollY;
    lastAppliedY = window.scrollY;
}

window.addEventListener('scroll', () => {
    if (Math.abs(window.scrollY - lastAppliedY) > 2) resyncScrollTarget();
}, { passive: true });

if (!isTouchDevice) {
    window.addEventListener('wheel', e => {
        if (isNavigating) return;
        e.preventDefault();
        targetScroll += e.deltaY * 1.5;
        targetScroll = Math.max(0, Math.min(targetScroll, document.body.scrollHeight - window.innerHeight));
    }, { passive: false });

    (function smoothScroll() {
        const diff = targetScroll - window.scrollY;
        // Deadband: below a pixel, stop nudging. Without this the loop keeps
        // issuing sub-pixel scrollBy calls forever and the page shivers.
        if (Math.abs(diff) > 0.5) {
            window.scrollBy(0, diff * 0.1);
            lastAppliedY = window.scrollY;
        }
        requestAnimationFrame(smoothScroll);
    })();
}

// Scroll restoration lands after this script parses, so re-read it — both to
// stop the drag-back and to put the parallax at the right offset immediately.
window.addEventListener('load', () => {
    resyncScrollTarget();
    updateScrollEffects();
});

// ------------------------------------------------------------ dropdown menu
const menuToggle = document.querySelector('.menu-toggle');
const menuDropdown = document.querySelector('.menu-dropdown');

function setMenu(open) {
    if (!menuToggle || !menuDropdown) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuDropdown.classList.toggle('open', open);
}

if (menuToggle && menuDropdown) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close on a link, an outside click, or Escape.
    menuDropdown.addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu')) setMenu(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });
}

// ---------------------------------------------------------------- slideshow
const slides = [...document.querySelectorAll('.slide')];
const nextBtn = document.querySelector('.slide-next');
const SLIDE_MS = 7000;
let current = 0;
let slideTimer;

function showSlide(index) {
    slides[current].classList.remove('is-active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('is-active');
}

function restartSlideTimer() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => showSlide(current + 1), SLIDE_MS);
}

if (slides.length > 1) {
    if (nextBtn) {
        // Advancing by hand resets the clock, so you never get a double-jump.
        nextBtn.addEventListener('click', () => {
            showSlide(current + 1);
            restartSlideTimer();
        });
    }
    restartSlideTimer();
} else if (nextBtn) {
    nextBtn.hidden = true;
}

// ------------------------------------------------------------------ reveals
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        // Also reveal anything already scrolled past — an anchor jump can land
        // below an element, which would otherwise never intersect and so would
        // stay invisible for good.
        const scrolledPast = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !scrolledPast) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
    });
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

// Everything except the hero. Hero elements are on screen from the start, so
// the observer would mark them visible the moment it runs — well before the
// load event fires — and the staggered entry would never be seen.
reveals.forEach(el => {
    if (el.closest('.hero')) return;
    observer.observe(el);
});

// The hero fades in on page load instead of waiting to be scrolled into view,
// title first and then each item in turn. Driven here rather than with CSS
// transition-delay, which would stay on the element and lag its hover too.
// Title, then the insignia 0.5s later, then each button 0.2s apart, then the
// social icons one at a time.
const HERO_SEQUENCE = [
    ['h1', 0],
    ['.insignia', 500],
    ['.hero-links .pill:nth-child(1)', 700],
    ['.hero-links .pill:nth-child(2)', 900],
    ['.hero-links .pill:nth-child(3)', 1100],
    ['.socials a:nth-child(1)', 1300],
    ['.socials a:nth-child(2)', 1500],
    ['.socials a:nth-child(3)', 1700],
    ['.menu-toggle', 1900],
];

function revealHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Queried from the document, not the hero — the hamburger lives in the
    // header but belongs to the same entry sequence.
    HERO_SEQUENCE.forEach(([selector, delay]) => {
        const el = document.querySelector(selector);
        if (!el) return;
        observer.unobserve(el);
        if (instant) {
            el.classList.add('visible');
        } else {
            setTimeout(() => el.classList.add('visible'), delay);
        }
    });

    // Anything in the hero the sequence didn't name still needs revealing.
    hero.querySelectorAll('.reveal, .icon-reveal').forEach(el => {
        if (el.classList.contains('visible')) return;
        if (HERO_SEQUENCE.some(([sel]) => el.matches(sel))) return;
        observer.unobserve(el);
        el.classList.add('visible');
    });
}

if (document.readyState === 'complete') {
    setTimeout(revealHero, 50);
} else {
    window.addEventListener('load', () => setTimeout(revealHero, 50));
}

// Smooth anchor navigation, matching index.html's behaviour.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        // The header is fixed again, so back off its height or it covers the
        // top of whatever we land on.
        const target = document.getElementById(this.getAttribute('href').substring(1));
        if (target) {
            const offset = pageHeader ? pageHeader.getBoundingClientRect().height : 0;
            const top = Math.max(0, target.offsetTop - offset);
            // Hand the smooth-scroll loop the same destination, or it will drag
            // the page straight back to where it thought we were.
            isNavigating = true;
            targetScroll = top;
            window.scrollTo({ top: top, behavior: 'smooth' });
            setTimeout(() => { isNavigating = false; }, 1000);
        }
    });
});

// ------------------------------------------------------------- contact form
// Same reCAPTCHA key and Netlify endpoint as index.html.
const contactForm = document.getElementById('contact-form');
const RECAPTCHA_KEY = '6LdN8ngsAAAAAPS2vcz2-iZj8Hzjg_5Euuyt57Y9';
let recaptchaLoaded = false;

function loadRecaptcha() {
    if (recaptchaLoaded) return;
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + RECAPTCHA_KEY;
    document.head.appendChild(script);
    recaptchaLoaded = true;
}

if (contactForm) {
    contactForm.addEventListener('focusin', loadRecaptcha, { once: true });

    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = this.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        const originalBg = submitBtn.style.background || '';

        function fail(text) {
            submitBtn.textContent = text;
            submitBtn.style.background = '#f44336';
        }

        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const payload = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            service: document.getElementById('service').value,
            message: document.getElementById('message').value,
        };

        const reset = () => setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.background = originalBg;
            submitBtn.disabled = false;
        }, 3000);

        try {
            payload.token = await grecaptcha.execute(RECAPTCHA_KEY, { action: 'contact' });
        } catch (err) {
            fail('Failed to send. Try again.');
            reset();
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/contact', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                submitBtn.textContent = 'Message Sent!';
                submitBtn.style.background = '#4CAF50';
                contactForm.reset();
            } else if (response.status === 429) {
                fail('Too many attempts, try later.');
            } else {
                fail('Failed to send. Try again.');
            }
        } catch (error) {
            fail('Failed to send. Try again.');
        } finally {
            reset();
        }
    });
}
