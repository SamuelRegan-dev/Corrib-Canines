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
  // Header background on scroll
  header.classList.toggle('scrolled', window.scrollY > 50);
  
  // Parallax effect
  if (parallax) {
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

// Custom smooth scroll with wheel
window.addEventListener('wheel', e => {
  if (isNavigating) return; // Don't interfere during anchor navigation
  
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

// Smooth anchor link navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href').substring(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      isNavigating = true;
      targetScroll = targetElement.offsetTop - 70;
      
      // Reset navigation flag after animation completes
      setTimeout(() => isNavigating = false, 1000);
    }
  });
});

// Initialize EmailJS
emailjs.init({publicKey: EMAILJS_CONFIG.publicKey});

// Handle form submission
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    const originalBg = submitBtn.style.background || '#ffd951';
    
    // Show loading state
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Send email using EmailJS
      emailjs.sendForm(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, this)
          .then(function(response) {
        console.log('SUCCESS!', response.status, response.text);
        
        // Show success message
        submitBtn.textContent = 'Message Sent!';
        submitBtn.style.background = '#4CAF50';
        
        // Reset form
        contactForm.reset();
        
        // Reset button after 3 seconds
        setTimeout(function() {
          submitBtn.textContent = originalText;
          submitBtn.style.background = originalBg;
          submitBtn.disabled = false;
        }, 3000);
      })
      .catch(function(error) {
        console.log('FAILED...', error);
        
        // Show error message
        submitBtn.textContent = 'Failed to send. Try again.';
        submitBtn.style.background = '#f44336';
        
        // Reset button after 3 seconds
        setTimeout(function() {
          submitBtn.textContent = originalText;
          submitBtn.style.background = originalBg;
          submitBtn.disabled = false;
        }, 3000);
      });
  });
}