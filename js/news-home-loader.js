/**
 * news-home-loader.js
 * Dynamically renders the latest 3 news items on the home page.
 * Uses local static JSON database for maximum speed and reliability.
 * No direct Strapi dependency on frontend.
 */

document.addEventListener("DOMContentLoaded", () => {
    const newsSection = document.getElementById("latest-news");
    const newsGrid = document.getElementById("latest-news-grid");

    if (!newsSection || !newsGrid) return;

    const fetchHomeNews = async () => {
        try {
            // Fetch from static JSON generated at build time
            const response = await fetch('/js/articles.json');

            if (!response.ok) {
                // If json missing or error, hide section silently
                newsSection.style.display = "none";
                return;
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                newsSection.style.display = "none";
                return;
            }

            // Clear placeholders
            newsGrid.innerHTML = "";

            // Display latest 3 articles
            // They are already sorted by generation script, but we can safety slice
            data.slice(0, 3).forEach(post => {
                const date = new Date(post.publishedAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                });

                let excerpt = post.description || "";
                if (excerpt.length > 120) {
                    excerpt = excerpt.substring(0, 117) + "...";
                }

                // USE CLEAN STATIC URLS
                const postUrl = `/articles/${post.slug}/`;

                const newsItemHTML = `
                    <div class="column">
                        <div class="news-preview" style="margin-bottom: 2rem;">
                            <h3 class="h5"><a href="${postUrl}">${post.title}</a></h3>
                            <p>${excerpt}</p>
                            <a href="${postUrl}" class="btn btn--stroke btn--small">Read More</a>
                        </div>
                    </div>
                `;
                newsGrid.insertAdjacentHTML("beforeend", newsItemHTML);
            });

            // Show section
            newsSection.style.display = "block";

        } catch (error) {
            console.error("Error loading home news:", error);
            newsSection.style.display = "none";
        }
    };

    fetchHomeNews();
});
