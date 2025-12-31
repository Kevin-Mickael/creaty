/**
 * Promo Widget & Cookie Banner Logic
 */

// Cookie Banner Logic
function acceptCookies() {
    localStorage.setItem('cookiesAccepted', 'true');
    closeCookieBanner();
}

function closeCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.classList.remove('show');
}

// Promo Widget Logic
function showPromo() {
    const widget = document.getElementById('promo-widget');
    const trigger = document.getElementById('promo-trigger');
    if (widget) widget.classList.add('show');
    if (trigger) trigger.classList.remove('show');
}

function minimizePromo() {
    const widget = document.getElementById('promo-widget');
    const trigger = document.getElementById('promo-trigger');
    if (widget) widget.classList.remove('show');
    if (trigger) trigger.classList.add('show');
    localStorage.setItem('promoMinimized', 'true');
}

async function fetchLatestNews() {
    const container = document.getElementById('promo-news-container');
    if (!container) return;

    try {
        // Use CONFIG if available, fallback to hardcoded if not (should be available)
        const apiUrl = (typeof CONFIG !== 'undefined') ? CONFIG.API_URL : 'https://creaty-strapi.railway.app/api';

        const response = await fetch(`${apiUrl}/articles?populate=*&pagination[pageSize]=3&sort[0]=publishedAt:desc`);
        if (!response.ok) throw new Error('Failed to fetch');
        const { data } = await response.json();

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">Stay tuned for news!</p>';
            return;
        }

        let html = '<ul class="promo-news__list">';
        data.forEach(post => {
            const attrs = post.attributes || post;
            const date = new Date(attrs.publishedAt || attrs.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short'
            });
            html += `
                <li class="promo-news__item">
                    <a href="/blog?slug=${attrs.slug || post.id}" class="promo-news__link">
                        <h5 class="promo-news__post-title">${attrs.title}</h5>
                        <span class="promo-news__date">${date}</span>
                    </a>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Promo News Error:', error);
        container.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">News currently unavailable.</p>';
    }
}

// Initialize on load
window.addEventListener('load', function () {
    // Cookie banner delay
    const cookieBanner = document.getElementById('cookie-banner');
    if (cookieBanner && !localStorage.getItem('cookiesAccepted')) {
        setTimeout(function () {
            cookieBanner.classList.add('show');
        }, 2000);
    }

    // Promo widget delay
    const promoWidget = document.getElementById('promo-widget');
    const promoTrigger = document.getElementById('promo-trigger');

    if (promoWidget && promoTrigger) {
        setTimeout(function () {
            if (!localStorage.getItem('promoMinimized')) {
                showPromo();
            } else {
                promoTrigger.classList.add('show');
            }
            fetchLatestNews();
        }, 4000);
    }
});
