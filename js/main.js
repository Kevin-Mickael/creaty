/* ===================================================================
 * Booth 1.0.0 - Main JS
 *
 * ------------------------------------------------------------------- */

(function (html) {

    'use strict';

    const cfg = {

        // MailChimp URL
        mailChimpURL: 'https://facebook.us1.list-manage.com/subscribe/post?u=1abf75f6981256963a47d197a&amp;id=37c6d8f4d6'

    };


    /* preloader
     * -------------------------------------------------- */
    const ssPreloader = function () {

        const siteBody = document.querySelector('body');
        const preloader = document.querySelector('#preloader');
        if (!preloader) return;

        html.classList.add('ss-preload');

        window.addEventListener('load', function () {
            html.classList.remove('ss-preload');
            html.classList.add('ss-loaded');

            preloader.addEventListener('transitionend', function afterTransition(e) {
                if (e.target.matches('#preloader')) {
                    siteBody.classList.add('ss-show');
                    e.target.style.display = 'none';
                    preloader.removeEventListener(e.type, afterTransition);
                }
            });
        });

        window.addEventListener('beforeunload', function () {
            siteBody.classList.remove('ss-show');
        });

    }; // end ssPreloader


    /* move header
     * -------------------------------------------------- */
    const ssMoveHeader = function () {

        const hdr = document.querySelector('.s-header');
        const hero = document.querySelector('#intro');
        let triggerHeight;

        if (!(hdr && hero)) return;

        setTimeout(function () {
            triggerHeight = hero.offsetHeight - 170;
        }, 300);

        window.addEventListener('scroll', function () {

            let loc = window.scrollY;

            if (loc > triggerHeight) {
                hdr.classList.add('sticky');
            } else {
                hdr.classList.remove('sticky');
            }

            if (loc > triggerHeight + 20) {
                hdr.classList.add('offset');
            } else {
                hdr.classList.remove('offset');
            }

            if (loc > triggerHeight + 150) {
                hdr.classList.add('scrolling');
            } else {
                hdr.classList.remove('scrolling');
            }

        });

    }; // end ssMoveHeader


    /* mobile menu
     * ---------------------------------------------------- */
    const ssMobileMenu = function () {

        const toggleButton = document.querySelector('.s-header__menu-toggle');
        const mainNavWrap = document.querySelector('.s-header__nav');
        const siteBody = document.querySelector('body');

        if (!(toggleButton && mainNavWrap)) return;

        toggleButton.addEventListener('click', function (event) {
            event.preventDefault();
            toggleButton.classList.toggle('is-clicked');
            siteBody.classList.toggle('menu-is-open');
        });

        mainNavWrap.querySelectorAll('.s-header__nav a').forEach(function (link) {

            link.addEventListener("click", function (event) {

                // at 800px and below
                if (window.matchMedia('(max-width: 800px)').matches) {
                    toggleButton.classList.toggle('is-clicked');
                    siteBody.classList.toggle('menu-is-open');
                }
            });
        });

        window.addEventListener('resize', function () {

            // above 800px
            if (window.matchMedia('(min-width: 801px)').matches) {
                if (siteBody.classList.contains('menu-is-open')) siteBody.classList.remove('menu-is-open');
                if (toggleButton.classList.contains('is-clicked')) toggleButton.classList.remove('is-clicked');
            }
        });

    }; // end ssMobileMenu


    /* highlight active menu link on pagescroll
    * ------------------------------------------------------ */
    const ssScrollSpy = function () {

        const sections = document.querySelectorAll('.target-section');

        // Add an event listener listening for scroll
        window.addEventListener('scroll', navHighlight);

        function navHighlight() {

            // Get current scroll position
            let scrollY = window.pageYOffset;

            // Loop through sections to get height(including padding and border), 
            // top and ID values for each
            sections.forEach(function (current) {
                const sectionHeight = current.offsetHeight;
                const sectionTop = current.offsetTop - 50;
                const sectionId = current.getAttribute('id');

                /* If our current scroll position enters the space where current section 
                 * on screen is, add .current class to parent element(li) of the thecorresponding 
                 * navigation link, else remove it. To know which link is active, we use 
                 * sectionId variable we are getting while looping through sections as 
                 * an selector
                 */
                const navLink = document.querySelector('.s-header__nav a[href*=' + sectionId + ']');
                if (!navLink) return;

                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink.parentNode.classList.add('current');
                } else {
                    navLink.parentNode.classList.remove('current');
                }
            });
        }

    }; // end ssScrollSpy


    /* swiper
     * ------------------------------------------------------ */
    const ssSwiper = function () {

        const infoSwiper = new Swiper('.s-about__info-slider', {

            slidesPerView: 1,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                // when window width is > 400px
                401: {
                    slidesPerView: 1,
                    spaceBetween: 20
                },
                // when window width is > 700px
                701: {
                    slidesPerView: 2,
                    spaceBetween: 40
                },
                // when window width is > 1100px
                1101: {
                    slidesPerView: 3,
                    spaceBetween: 40
                }
            }
        });

        const screensSwiper = new Swiper('.s-about__screens-slider', {
            slidesPerView: 1,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            loop: true,
            speed: 1000,
            effect: 'slide'
        });

        const howtoSwiper = new Swiper('.s-about__howto-slider', {
            slidesPerView: 1,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                // when window width is > 600px
                601: {
                    slidesPerView: 2,
                    spaceBetween: 40
                }
            }
        });

    }; // end ssSwiper


    /* mailchimp form
     * ---------------------------------------------------- */
    const ssMailChimpForm = function () {

        const mcForm = document.querySelector('#mc-form');

        if (!mcForm) return;

        // Add novalidate attribute
        mcForm.setAttribute('novalidate', true);

        // Field validation
        function hasError(field) {

            // Don't validate submits, buttons, file and reset inputs, and disabled fields
            if (field.disabled || field.type === 'file' || field.type === 'reset' || field.type === 'submit' || field.type === 'button') return;

            // Get validity
            let validity = field.validity;

            // If valid, return null
            if (validity.valid) return;

            // If field is required and empty
            if (validity.valueMissing) return 'Please enter an email address.';

            // If not the right type
            if (validity.typeMismatch) {
                if (field.type === 'email') return 'Please enter a valid email address.';
            }

            // If pattern doesn't match
            if (validity.patternMismatch) {

                // If pattern info is included, return custom error
                if (field.hasAttribute('title')) return field.getAttribute('title');

                // Otherwise, generic error
                return 'Please match the requested format.';
            }

            // If all else fails, return a generic catchall error
            return 'The value you entered for this field is invalid.';

        };

        // Show status message
        function showStatus(message, isSuccess = false) {

            let errorMessage = mcForm.querySelector('.mc-status');
            if (!errorMessage) return;

            // Update status message
            if (isSuccess) {
                errorMessage.classList.remove('error-message');
                errorMessage.classList.add('success-message');
            } else {
                errorMessage.classList.remove('success-message');
                errorMessage.classList.add('error-message');
            }
            errorMessage.innerHTML = message;

        };

        // Submit the form 
        async function submitNewsletterForm(form) {

            const emailField = form.querySelector('#mce-EMAIL');
            const submitBtn = form.querySelector('input[type="submit"]');
            const statusEl = form.querySelector('.mc-status');

            if (!emailField || !submitBtn || !statusEl) return;

            const email = emailField.value;
            const originalBtnValue = submitBtn.value;

            // Reset status
            statusEl.innerHTML = 'Submitting...';
            statusEl.classList.remove('error-message', 'success-message');
            submitBtn.disabled = true;
            submitBtn.value = 'Submitting...';

            try {
                // Use CONFIG.API_URL from js/config.js
                const response = await fetch(`${CONFIG.API_URL}/newsletter/subscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showStatus(result.message || 'Thank you for subscribing!', true);
                    form.reset();
                } else {
                    const errorMsg = result.error?.message || result.message || 'An error occurred. Please try again.';
                    showStatus(errorMsg, false);
                }
            } catch (error) {
                console.error('Newsletter submission error:', error);
                showStatus('Connection error. Please try again later.', false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.value = originalBtnValue;
            }

        };

        // Check email field on submit
        mcForm.addEventListener('submit', function (event) {

            event.preventDefault();

            let emailField = event.target.querySelector('#mce-EMAIL');
            let error = hasError(emailField);

            if (error) {
                showStatus(error, false);
                emailField.focus();
                return;
            }

            submitNewsletterForm(this);

        }, false);

    }; // end ssMailChimpForm


    /* contact form
     * ---------------------------------------------------- */
    const ssContactForm = function () {

        const contactForm = document.querySelector('#contactForm');
        if (!contactForm) return;

        const contactMessage = document.querySelector('.contact-message');

        contactForm.addEventListener('submit', function (event) {

            event.preventDefault();

            const submitButton = contactForm.querySelector('#submit');
            const originalButtonValue = submitButton.value;

            submitButton.value = 'Sending...';
            submitButton.disabled = true;

            // Simulate form submission
            // In a real scenario, you would use fetch() or XMLHttpRequest to send data to a server
            setTimeout(function () {

                // For demonstration, we'll always show success unless there's a specific condition
                // You can change this logic to handle real server responses
                const isSuccess = true;

                if (isSuccess) {
                    contactMessage.innerHTML = `
                        <div class="alert-box alert-box--success">
                            <p>Your message has been sent. Thank you!</p>
                            <span class="alert-box__close"></span>
                        </div>
                    `;
                    contactForm.reset();
                } else {
                    contactMessage.innerHTML = `
                        <div class="alert-box alert-box--error">
                            <p>There was an error sending your message. Please try again.</p>
                            <span class="alert-box__close"></span>
                        </div>
                    `;
                }

                submitButton.value = originalButtonValue;
                submitButton.disabled = false;

                // Re-initialize alert boxes close functionality
                ssAlertBoxes();

            }, 1000);
        });

    }; // end ssContactForm


    /* video Lightbox
     * ------------------------------------------------------ */
    const ssVideoLightbox = function () {

        const videoLink = document.querySelector('.s-intro__content-video-btn');
        if (!videoLink) return;

        videoLink.addEventListener('click', function (event) {

            const vLink = this.getAttribute('href');
            const iframe = "<iframe src='" + vLink + "' frameborder='0'></iframe>";

            event.preventDefault();

            const instance = basicLightbox.create(iframe);
            instance.show()

        });

    }; // end ssVideoLightbox


    /* alert boxes
     * ------------------------------------------------------ */
    const ssAlertBoxes = function () {

        const boxes = document.querySelectorAll('.alert-box');

        boxes.forEach(function (box) {

            box.addEventListener('click', function (event) {
                if (event.target.matches('.alert-box__close')) {
                    event.stopPropagation();
                    event.target.parentElement.classList.add('hideit');

                    setTimeout(function () {
                        box.style.display = 'none';
                    }, 500)
                }
            });
        })

    }; // end ssAlertBoxes


    /* smoothscroll
     * ------------------------------------------------------ */
    const ssMoveTo = function () {

        const easeFunctions = {
            easeInQuad: function (t, b, c, d) {
                t /= d;
                return c * t * t + b;
            },
            easeOutQuad: function (t, b, c, d) {
                t /= d;
                return -c * t * (t - 2) + b;
            },
            easeInOutQuad: function (t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            },
            easeInOutCubic: function (t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t * t + b;
                t -= 2;
                return c / 2 * (t * t * t + 2) + b;
            }
        }

        const triggers = document.querySelectorAll('.smoothscroll');

        const moveTo = new MoveTo({
            tolerance: 0,
            duration: 1200,
            easing: 'easeInOutCubic',
            container: window
        }, easeFunctions);

        triggers.forEach(function (trigger) {
            moveTo.registerTrigger(trigger);
        });

    }; // end ssMoveTo


    /* pricing toggle
     * ------------------------------------------------------ */
    const ssPricingToggle = function () {

        const pricingSection = document.querySelector('#pricing');
        if (!pricingSection) return;

        pricingSection.addEventListener('click', function (event) {

            const btn = event.target.closest('.item-plan__show-more');

            if (btn) {

                event.preventDefault();

                const features = btn.previousElementSibling;

                if (features && features.classList.contains('item-plan__features')) {

                    features.classList.toggle('item-plan__features--expanded');
                    features.classList.toggle('item-plan__features--limited');

                    const btnText = btn.querySelector('span');

                    if (features.classList.contains('item-plan__features--expanded')) {
                        if (btnText) btnText.textContent = 'Show less';
                    } else {
                        if (btnText) btnText.textContent = 'Show more';
                    }
                }
            }
        });

    }; // end ssPricingToggle


    /* Initialize
     * ------------------------------------------------------ */
    (function ssInit() {

        ssPreloader();
        ssMoveHeader();
        ssMobileMenu();
        ssScrollSpy();
        ssSwiper();
        ssMailChimpForm();
        ssContactForm();
        ssVideoLightbox();
        ssAlertBoxes();
        ssMoveTo();
        ssPricingToggle();

    })();

})(document.documentElement);