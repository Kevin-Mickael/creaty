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
    const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://creaty-strapi.railway.app/api";

    // Immediate UI response
    closeCookieBanner();
    sessionStorage.setItem("consentVerified", "true");
    loadGoogleAnalytics();

    try {
        await fetch(`${apiUrl}/consent/accept`, {
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
    sessionStorage.setItem("consentVerified", "declined");
    console.log("Cookies declined for this session.");
}

function closeCookieBanner() {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.classList.remove("show");
}

async function checkConsent() {
    const consentStatus = sessionStorage.getItem("consentVerified");

    if (consentStatus === "true") {
        loadGoogleAnalytics();
        return;
    }

    if (consentStatus === "declined") {
        return;
    }

    const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://creaty-strapi.railway.app/api";

    try {
        const response = await fetch(`${apiUrl}/consent/check`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.consented) {
                loadGoogleAnalytics();
                sessionStorage.setItem("consentVerified", "true");
            } else {
                showCookieBanner();
            }
        }
    } catch (error) {
        console.error("Error checking consent:", error);
    }
}

function showCookieBanner() {
    const cookieBanner = document.getElementById("cookie-banner");
    if (cookieBanner) {
        setTimeout(function () {
            // Only show if no choice was made in this session yet
            if (!sessionStorage.getItem("consentVerified")) {
                cookieBanner.classList.add("show");
            }
        }, 2000);
    }
}

// Existing Promo Logic
function showPromo() {
    const widget = document.getElementById("promo-widget");
    const trigger = document.getElementById("promo-trigger");
    if (widget) widget.classList.add("show");
    if (trigger) trigger.classList.remove("show");
}

function minimizePromo() {
    const widget = document.getElementById("promo-widget");
    const trigger = document.getElementById("promo-trigger");
    if (widget) widget.classList.remove("show");
    if (trigger) trigger.classList.add("show");
    localStorage.setItem("promoMinimized", "true");
}

async function fetchLatestNews() {
    const container = document.getElementById("promo-news-container");
    if (!container) return;
    try {
        const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://creaty-strapi.railway.app/api";
        const response = await fetch(`${apiUrl}/articles?populate=*&pagination[pageSize]=3&sort[0]=publishedAt:desc`);
        if (!response.ok) throw new Error("Failed to fetch");
        const { data: data } = await response.json();
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">Stay tuned for news!</p>';
            return;
        }
        let html = '<ul class="promo-news__list">';
        data.forEach(post => {
            const attrs = post.attributes || post;
            const date = new Date(attrs.publishedAt || attrs.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" });
            html += `\n                <li class="promo-news__item">\n                    <a href="/blog?slug=${attrs.slug || post.id}" class="promo-news__link">\n                        <h5 class="promo-news__post-title">${attrs.title}</h5>\n                        <span class="promo-news__date">${date}</span>\n                    </a>\n                </li>\n            `;
        });
        html += "</ul>";
        container.innerHTML = html;
    } catch (error) {
        console.error("Promo News Error:", error);
        container.innerHTML = '<p style="font-size: 1.2rem; color: rgba(255,255,255,0.5);">News currently unavailable.</p>';
    }
}

window.addEventListener("load", function () {
    // Check for cookie consent first
    checkConsent();

    const promoWidget = document.getElementById("promo-widget");
    const promoTrigger = document.getElementById("promo-trigger");
    if (promoWidget && promoTrigger) {
        setTimeout(function () {
            if (!localStorage.getItem("promoMinimized")) {
                showPromo();
            } else {
                promoTrigger.classList.add("show");
            }
            fetchLatestNews();
        }, 4000);
    }
});