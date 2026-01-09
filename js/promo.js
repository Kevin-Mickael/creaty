/**
 * Cookie and Analytics Management
 * Optimized for HttpOnly cookie consent via Strapi
 */

const GA_ID = 'G-SGEM349PX5';

function loadGoogleAnalytics() {
    if (window.gaLoaded) return;

    // Update Google Consent Mode
    if (window.gtag) {
        window.gtag('consent', 'update', {
            'analytics_storage': 'granted',
            'ad_storage': 'granted'
        });
    }

    window.gaLoaded = true;
    console.log('Google Analytics consent granted.');
}

async function acceptCookies() {
    const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://admin.creatymu.org/api";

    // Immediate UI response
    closeCookieBanner();
    localStorage.setItem("consentVerified", "true");
    loadGoogleAnalytics();

    try {
        await ApiClient.fetch(`${apiUrl}/consent/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
    } catch (error) {
        console.error("Error accepting cookies (background):", error);
    }
}

function declineCookies() {
    closeCookieBanner();
    // Persist decline Choice for the session to avoid re-prompting
    localStorage.setItem("consentVerified", "declined");
    console.log("Cookies declined for this session.");
}

function closeCookieBanner() {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.classList.remove("show");
}

async function checkConsent() {
    const consentStatus = localStorage.getItem("consentVerified");

    if (consentStatus === "true") {
        loadGoogleAnalytics();
        return;
    }

    if (consentStatus === "declined") {
        return;
    }

    const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://admin.creatymu.org/api";

    try {
        const response = await ApiClient.fetch(`${apiUrl}/consent/check`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.consented) {
                loadGoogleAnalytics();
                localStorage.setItem("consentVerified", "true");
            } else {
                showCookieBanner();
            }
        }
    } catch (error) {
        console.error("Error checking consent:", error);
        // Fallback: Ensure banner is shown if API fails and no choice has been made
        showCookieBanner();
    }
}


function showCookieBanner() {
    const cookieBanner = document.getElementById("cookie-banner");
    if (cookieBanner) {
        setTimeout(function () {
            // Only show if no choice was made in this session yet
            if (!localStorage.getItem("consentVerified")) {
                cookieBanner.style.display = ''; // Remove inline display: none
                // Small delay to ensure display change applies before transition
                requestAnimationFrame(() => {
                    cookieBanner.classList.add("show");
                });
            }
        }, 2000);
    }
}

// Existing Promo Logic
function showPromo() {
    const widget = document.getElementById("promo-widget");
    const trigger = document.getElementById("promo-trigger");

    if (widget) {
        widget.style.display = ''; // Remove inline display: none
        // Force reflow
        void widget.offsetWidth;
        widget.classList.add("show");
    }
    if (trigger) {
        trigger.classList.remove("show");
        // We can add display: none back to trigger if we want, but CSS handles it via transition usually? 
        // Actually trigger has translateX(100%), so it hides offscreen. 
        // But if we want to be safe we can leave it.
    }
}

function minimizePromo() {
    const widget = document.getElementById("promo-widget");
    const trigger = document.getElementById("promo-trigger");

    if (widget) {
        widget.classList.remove("show");
    }

    if (trigger) {
        trigger.style.display = ''; // Remove inline display: none
        // Force reflow
        void trigger.offsetWidth;
        trigger.classList.add("show");
    }

    localStorage.setItem("promoMinimized", "true");
}


async function fetchLatestNews() {
    const promoContainer = document.getElementById("promo-news-container");
    const mainGrid = document.getElementById("latest-news-grid");
    const relatedGrid = document.getElementById("related-news-grid");

    if (!promoContainer && !mainGrid && !relatedGrid) return;

    try {
        // Use static JSON for speed and consistency
        const response = await fetch(`/js/articles.json?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Failed to fetch articles");

        let articles = await response.json();

        // Ensure sorted by date (newest first)
        articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        // Take top 3
        const latestArticles = articles.slice(0, 3);

        // Filter out current article for the "Related/Latest" section on article pages
        const currentPath = window.location.pathname;
        const relatedArticles = articles.filter(post => !currentPath.includes(post.slug)).slice(0, 3);


        // 1. Update Promo Widget (Side)
        if (promoContainer) {
            if (latestArticles.length === 0) {
                promoContainer.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">Stay tuned for news!</p>';
            } else {
                let html = '<ul class="promo-news__list">';
                latestArticles.forEach(post => {
                    const date = new Date(post.publishedAt).toLocaleDateString("en-US", { day: "numeric", month: "short" });
                    html += `
                        <li class="promo-news__item">
                            <a href="/articles/${post.slug}/" class="promo-news__link">
                                <h5 class="promo-news__post-title">${post.title}</h5>
                                <span class="promo-news__date">${date}</span>
                            </a>
                        </li>
                    `;
                });
                html += "</ul>";
                promoContainer.innerHTML = html;
            }
        }

        // 2. Update Main Home Grid (with Images)
        if (mainGrid && latestArticles.length > 0) {
            let gridHtml = '';
            latestArticles.forEach(post => {
                const desc = post.description ? (post.description.length > 100 ? post.description.substring(0, 100) + '...' : post.description) : '';
                const imageUrl = post.image || '/images/default-news.jpg';

                gridHtml += `
                    <div class="column">
                        <div class="news-preview" style="margin-bottom: 2rem;">
                            <div class="news-preview__image" style="margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9;">
                                <a href="/articles/${post.slug}/" style="display: block; width: 100%; height: 100%;">
                                     <img src="${imageUrl}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                                </a>
                            </div>
                            <h3 class="h5"><a href="/articles/${post.slug}/">${post.title}</a></h3>
                            <p>${desc}</p>
                            <a href="/articles/${post.slug}/" class="btn btn--stroke btn--small">Read More</a>
                        </div>
                    </div>
                `;
            });
            mainGrid.innerHTML = gridHtml;
        }

        // 3. Update Related News Grid (Article Pages)
        if (relatedGrid) {
            let gridHtml = '';
            if (relatedArticles.length === 0) {
                gridHtml = '<div class="column"><p>No other recent news.</p></div>';
            } else {
                relatedArticles.forEach(post => {
                    const imageUrl = post.image || '/images/default-news.jpg';
                    const date = new Date(post.publishedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

                    gridHtml += `
                        <div class="column">
                            <div class="news-preview" style="margin-bottom: 3rem;">
                                <div class="news-preview__image" style="margin-bottom: 1.5rem; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    <a href="/articles/${post.slug}/" style="display: block; width: 100%; height: 100%;">
                                         <img src="${imageUrl}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
                                    </a>
                                </div>
                                <span style="font-size: 1.1rem; text-transform: uppercase; color: #999; letter-spacing: 1px; display: block; margin-bottom: 0.5rem;">${date}</span>
                                <h3 class="h5" style="margin-top: 0; min-height: 3rem;"><a href="/articles/${post.slug}/">${post.title}</a></h3>
                                <a href="/articles/${post.slug}/" class="btn btn--stroke btn--small" style="margin-top: 0.5rem;">Read Article</a>
                            </div>
                        </div>
                    `;
                });
            }
            relatedGrid.innerHTML = gridHtml;
        }

    } catch (error) {
        console.error("Promo News Error:", error);
        if (promoContainer) promoContainer.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">News updating...</p>';
    }
}

window.addEventListener("load", function () {
    // Check for cookie consent first
    if (typeof checkConsent === 'function') checkConsent();

    const promoWidget = document.getElementById("promo-widget");
    const promoTrigger = document.getElementById("promo-trigger");

    // Logic for Promo Widget Animation
    if (promoWidget && promoTrigger) {
        if (!localStorage.getItem("promoMinimized")) {
            showPromo();
        } else {
            promoTrigger.style.display = ''; // Remove inline display: none
            // Force reflow
            void promoTrigger.offsetWidth;
            promoTrigger.classList.add("show");
        }
    }

    // Always attempt to fetch news (it will exit safely if no containers found)
    fetchLatestNews();
});