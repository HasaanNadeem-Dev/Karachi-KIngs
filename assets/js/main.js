// Preloader Handler
window.addEventListener('load', () => {
    const preloader = document.querySelector('.kk-preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            document.body.classList.remove('no-scroll');
            
            // Remove from DOM after transition
            setTimeout(() => {
                preloader.remove();
            }, 800);
        }, 500); // Small buffer for visual comfort
    }
});

// Fallback: If page takes too long to load (e.g. broken image), force show content
setTimeout(() => {
    const preloader = document.querySelector('.kk-preloader');
    if (preloader) {
        preloader.classList.add('fade-out');
        document.body.classList.remove('no-scroll');
    }
}, 5000); // 5 second fallback

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Toggle icon
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }
});
