// GXMBY Landing Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    
    // Smooth animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.social-link, .about-content');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Enhanced hover effects for social links
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // Add ripple effect on click
        link.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Dynamic audio visualizer
    const bars = document.querySelectorAll('.audio-visualizer .bar');
    let animationId;
    
    function animateBars() {
        bars.forEach((bar, index) => {
            const randomHeight = Math.random() * 30 + 10;
            const randomDelay = Math.random() * 0.5;
            bar.style.height = randomHeight + 'px';
            bar.style.animationDelay = randomDelay + 's';
        });
        
        animationId = setTimeout(animateBars, 200 + Math.random() * 300);
    }
    
    // Start visualizer animation
    animateBars();
    
    // Pause animation when page is not visible
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            clearTimeout(animationId);
        } else {
            animateBars();
        }
    });

    // Logo image interaction
    const logoImage = document.querySelector('.logo-image');
    if (logoImage) {
        logoImage.addEventListener('click', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
            setTimeout(() => {
                this.style.transform = 'scale(1) rotate(0deg)';
            }, 300);
        });
    }

    // Parallax effect for background
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.background-image');
        const speed = scrolled * 0.5;
        
        if (parallax) {
            parallax.style.transform = `scale(1.1) translateY(${speed}px)`;
        }
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);

    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        const focusableElements = document.querySelectorAll('.social-link, .footer-link a');
        const focusedIndex = Array.from(focusableElements).indexOf(document.activeElement);
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (focusedIndex + 1) % focusableElements.length;
                focusableElements[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = focusedIndex <= 0 ? focusableElements.length - 1 : focusedIndex - 1;
                focusableElements[prevIndex].focus();
                break;
            case 'Enter':
                if (document.activeElement.classList.contains('social-link')) {
                    document.activeElement.click();
                }
                break;
        }
    });

    // Performance optimization: Reduce animations on slower devices
    const isSlowDevice = navigator.hardwareConcurrency <= 2 || 
                        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isSlowDevice) {
        document.body.classList.add('reduced-animations');
        // Add CSS for reduced animations
        const style = document.createElement('style');
        style.textContent = `
            .reduced-animations * {
                animation-duration: 0.3s !important;
                transition-duration: 0.2s !important;
            }
            .reduced-animations .audio-visualizer {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Analytics tracking (privacy-friendly)
    function trackEvent(eventName, platform = null) {
        // This is a placeholder for analytics
        // You can integrate with privacy-friendly analytics like Plausible or Fathom
        console.log(`Event: ${eventName}`, platform ? `Platform: ${platform}` : '');
    }
    
    // Track social link clicks
    socialLinks.forEach(link => {
        link.addEventListener('click', function() {
            const platform = this.classList[1]; // Gets the platform class (soundcloud, spotify, etc.)
            trackEvent('social_link_click', platform);
        });
    });

    // Add loading state management
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
        
        // Trigger entrance animations
        setTimeout(() => {
            document.querySelector('.header').style.opacity = '1';
            document.querySelector('.header').style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            document.querySelector('.social-links').style.opacity = '1';
            document.querySelector('.social-links').style.transform = 'translateY(0)';
        }, 300);
        
        setTimeout(() => {
            document.querySelector('.about').style.opacity = '1';
            document.querySelector('.about').style.transform = 'translateY(0)';
        }, 500);
    });

    // Add error handling for failed image loads
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.style.display = 'none';
            console.warn('Failed to load image:', this.src);
        });
    });

    // Add copy to clipboard functionality for links
    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'absolute';
            textArea.style.left = '-999999px';
            document.body.prepend(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
            } catch (error) {
                console.error('Copy failed:', error);
            } finally {
                textArea.remove();
            }
        }
    }

    // Add context menu for copying links
    socialLinks.forEach(link => {
        link.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            copyToClipboard(this.href);
            
            // Show temporary feedback
            const originalText = this.querySelector('.link-text').textContent;
            this.querySelector('.link-text').textContent = 'Link Copied!';
            
            setTimeout(() => {
                this.querySelector('.link-text').textContent = originalText;
            }, 1500);
        });
    });

    // Add preload for critical resources
    function preloadResource(href, as) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
    }
    
    // Preload the background image for better performance
    preloadResource('./gxmby_1080x1080.jpg', 'image');
});

// Add CSS animation keyframes via JavaScript for the ripple effect
const rippleStyles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = rippleStyles;
document.head.appendChild(styleSheet);
