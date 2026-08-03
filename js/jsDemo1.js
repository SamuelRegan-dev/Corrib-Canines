// Demo 1 — hero slideshow, load/scroll reveals, contact form.

// Flags that JS is alive so the CSS can safely start .reveal elements hidden.
document.documentElement.classList.add('js');

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

reveals.forEach(el => observer.observe(el));

// The hero fades in on page load instead of waiting to be scrolled into view,
// title first and then each item in turn. Driven here rather than with CSS
// transition-delay, which would stay on the element and lag its hover too.
const HERO_SEQUENCE = [
    ['h1', 0],
    ['.insignia', 350],
    ['.hero-links .pill:nth-child(1)', 300],
    ['.hero-links .pill:nth-child(2)', 600],
    ['.hero-links .pill:nth-child(3)', 900],
    ['.socials', 1200],
];

function revealHero() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    HERO_SEQUENCE.forEach(([selector, delay]) => {
        const el = hero.querySelector(selector);
        if (!el) return;
        observer.unobserve(el);
        if (instant) {
            el.classList.add('visible');
        } else {
            setTimeout(() => el.classList.add('visible'), delay);
        }
    });

    // Anything in the hero the sequence didn't name still needs revealing.
    hero.querySelectorAll('.reveal').forEach(el => {
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
        // No offset needed: the header scrolls away rather than overlaying content.
        const target = document.getElementById(this.getAttribute('href').substring(1));
        if (target) {
            window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
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
