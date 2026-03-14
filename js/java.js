const isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches

// Cache DOM elements for better performance
const header = document.querySelector('header');
const parallax = document.querySelector('.parallax');
const contactForm = document.getElementById('contact-form');

// Smooth scroll variables
let targetScroll = window.scrollY;
let isNavigating = false;

// Combined scroll handler with RAF for better performance
let ticking = false;

function updateScrollEffects() {
    header.classList.toggle('scrolled', window.scrollY > 50);

    if (parallax && !isTouchDevice) {
        parallax.style.backgroundPositionY = window.scrollY * 0.5 + 'px';
    }

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
    }
});

if (!isTouchDevice) {
    window.addEventListener('wheel', e => {
        if (isNavigating) return;
        e.preventDefault();
        targetScroll += e.deltaY * 1.5;
        targetScroll = Math.max(0, Math.min(targetScroll, document.body.scrollHeight - window.innerHeight));
    }, { passive: false });

    function smoothScroll() {
        const diff = targetScroll - window.scrollY;
        window.scrollBy(0, diff * 0.1);
        requestAnimationFrame(smoothScroll);
    }

    smoothScroll();
}

// Smooth anchor link navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            isNavigating = true;
            targetScroll = targetElement.offsetTop - 70;
            window.scrollTo({ top: targetElement.offsetTop - 70, behavior: 'smooth' });
            setTimeout(() => isNavigating = false, 1000);
        }
    });
});

// Handle form submission
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = this.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        const originalBg = submitBtn.style.background || '#ffd951';

        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const service = document.getElementById('service').value;
        const message = document.getElementById('message').value;

        // Get reCAPTCHA token
        let token;
        try {
            token = await grecaptcha.execute('6LdN8ngsAAAAAPS2vcz2-iZj8Hzjg_5Euuyt57Y9', { action: 'contact' });
        } catch (err) {
            submitBtn.textContent = 'Failed to send. Try again.';
            submitBtn.style.background = '#f44336';
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = originalBg;
                submitBtn.disabled = false;
            }, 3000);
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/contact', {
                method: 'POST',
                body: JSON.stringify({ name, email, phone, service, message, token }),
            });

            if (response.ok) {
                submitBtn.textContent = 'Message Sent!';
                submitBtn.style.background = '#4CAF50';
                contactForm.reset();
            } else if (response.status === 429) {
                submitBtn.textContent = 'Too many attempts, try later.';
                submitBtn.style.background = '#f44336';
            } else {
                submitBtn.textContent = 'Failed to send. Try again.';
                submitBtn.style.background = '#f44336';
            }
        } catch (error) {
            submitBtn.textContent = 'Failed to send. Try again.';
            submitBtn.style.background = '#f44336';
        } finally {
            setTimeout(function() {
                submitBtn.textContent = originalText;
                submitBtn.style.background = originalBg;
                submitBtn.disabled = false;
            }, 3000);
        }
    });
}