/**
 * news-home-loader.js
 * Dynamically fetches and renders the latest 3 news items on the home page.
 * Uses ApiClient for rate limiting and caching.
 */

document.addEventListener("DOMContentLoaded", () => {
    const newsSection = document.getElementById("latest-news");
    const newsGrid = document.getElementById("latest-news-grid");

    if (!newsSection || !newsGrid) return;

    const fetchHomeNews = async () => {
        try {
            const apiUrl = typeof CONFIG !== "undefined" ? CONFIG.API_URL : "https://admin.creatymu.org/api";

            // Build query for latest 3 articles with specific fields
            const query = new URLSearchParams({
                "fields[0]": "title",
                "fields[1]": "slug",
                "fields[2]": "publishedAt",
                "fields[3]": "description",
                "pagination[pageSize]": 3,
                "sort[0]": "publishedAt:desc"
            });

            const response = await ApiClient.fetch(`${apiUrl}/articles?${query.toString()}`);

            if (!response.ok) {
                throw new Error("Failed to fetch articles");
            }

            const { data } = await response.json();

            if (!data || data.length === 0) {
                // Keep hidden as per request: "quand il n' y a pas on affiche rien"
                newsSection.style.display = "none";
                return;
            }

            // Clear static placeholders
            newsGrid.innerHTML = "";

            data.forEach(post => {
                const attrs = post.attributes || post;
                const date = new Date(attrs.publishedAt || attrs.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                });

                // Get excerpt/description
                let excerpt = attrs.description || "";
                if (!excerpt && attrs.content) {
                    // Fallback to content parsing if needed, but we requested description
                }

                if (excerpt.length > 120) {
                    excerpt = excerpt.substring(0, 117) + "...";
                }

                const postUrl = `/blog/index.html?slug=${attrs.slug || post.id}`;

                const newsItemHTML = `
                    <div class="column">
                        <div class="news-preview" style="margin-bottom: 2rem;">
                            <h3 class="h5"><a href="${postUrl}">${attrs.title}</a></h3>
                            <p>${excerpt}</p>
                            <a href="${postUrl}" class="btn btn--stroke btn--small">Read More</a>
                        </div>
                    </div>
                `;
                newsGrid.insertAdjacentHTML("beforeend", newsItemHTML);
            });

            // Show the section now that we have content
            newsSection.style.display = "block";

        } catch (error) {
            console.error("Error loading home news:", error);
            // Hide section on error as well to avoid showing broken or empty area
            newsSection.style.display = "none";
        }
    };

    fetchHomeNews();
});
