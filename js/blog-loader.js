/**
 * blog-loader.js
 * Renders the blog/news list from a static JSON database.
 * Supports client-side pagination.
 * 
 * 100% Static - No direct Strapi dependency.
 */

document.addEventListener("DOMContentLoaded", () => {
    const blogGrid = document.getElementById("blog-grid");
    const paginationList = document.getElementById("pagination-list");
    const blogPagination = document.getElementById("blog-pagination");
    const ARTICLES_PER_PAGE = 6;

    if (!blogGrid) return;

    let allArticles = [];

    const fetchPosts = async () => {
        try {
            const response = await fetch(`/js/articles.json?v=${new Date().getTime()}`);

            if (!response.ok) {
                throw new Error("Failed to load static articles database");
            }

            allArticles = await response.json();

            if (!allArticles || allArticles.length === 0) {
                blogGrid.innerHTML = '<div class="column lg-12"><p class="text-center">Aucun article trouvé pour le moment.</p></div>';
                if (blogPagination) blogPagination.style.display = "none";
                return;
            }

            // Sort by pinned then date (if not already sorted in JSON)
            // The generator usually sorts by date, but let's ensure pinned are top
            allArticles.sort((a, b) => {
                // Pinned first
                if (a.epingle && !b.epingle) return -1;
                if (!a.epingle && b.epingle) return 1;
                // Then by date desc
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            });

            // Initial render (page 1)
            renderPage(1);

        } catch (error) {
            console.error("Error loading blog posts:", error);
            blogGrid.innerHTML = `
                <div class="column lg-12">
                    <div class="alert-box alert-box--error">
                        <p>Désolé, les articles ne sont pas disponibles pour le moment.</p>
                    </div>
                </div>
            `;
        }
    };

    const renderPage = (page) => {
        const start = (page - 1) * ARTICLES_PER_PAGE;
        const end = start + ARTICLES_PER_PAGE;
        const pageArticles = allArticles.slice(start, end);
        const totalPages = Math.ceil(allArticles.length / ARTICLES_PER_PAGE);

        renderPosts(pageArticles);
        if (blogPagination) {
            renderPagination(page, totalPages);
        }
    };

    const renderPosts = posts => {
        blogGrid.innerHTML = "";
        posts.forEach(post => {
            // Static JSON structure
            // image might be full URL already from generator
            let imageUrl = post.image || "/images/sample-image.jpg";

            const date = new Date(post.publishedAt).toLocaleDateString("en-MU", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            // Clean URL from static generator
            const postUrl = `/articles/${post.slug}/`;

            const postHTML = `
                <div class="column">
                    <article class="blog-post-card">
                        <img src="${imageUrl}" alt="${post.title}" class="blog-post-card__image" loading="lazy">
                        <div class="blog-post-card__content">
                            <h3 class="blog-post-card__title">${post.title}</h3>
                            <div class="blog-post-card__meta-row">
                                <span class="blog-post-card__category">${post.category || "NEWS"}</span>
                                ${post.epingle ? '<span class="blog-post-card__category" style="background: #000; color: #fff; border-color: #000;">ÉPINGLÉ</span>' : ""}
                                <span class="blog-post-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2H7zM11 15h2v2H7zM15 15h2v2H7z"></path><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 20V9h14l.002 11H5z"></path></svg>
                                    ${date}
                                </span>
                            </div>
                            <p class="blog-post-card__excerpt">${getExcerpt(post)}</p>
                            <a href="${postUrl}" class="blog-post-card__link">READ MORE</a>
                        </div>
                    </article>
                </div>
            `;
            blogGrid.insertAdjacentHTML("beforeend", postHTML);
        });
    };

    const renderPagination = (page, pageCount) => {
        if (pageCount <= 1) {
            blogPagination.style.display = "none";
            return;
        }
        blogPagination.style.display = "block";
        paginationList.innerHTML = "";

        if (page > 1) {
            paginationList.innerHTML += `
                <li>
                    <a class="pgn__prev" href="#" data-page="${page - 1}">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.25 6.75L4.75 12L10.25 17.25"></path>
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.25 12H5"></path>
                        </svg>
                    </a>
                </li>
            `;
        }

        for (let i = 1; i <= pageCount; i++) {
            paginationList.innerHTML += `
                <li><a class="pgn__num ${i === page ? "current" : ""}" href="#" data-page="${i}">${i}</a></li>
            `;
        }

        if (page < pageCount) {
            paginationList.innerHTML += `
                <li>
                    <a class="pgn__next" href="#" data-page="${page + 1}">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.75 6.75L19.25 12L13.75 17.25"></path>
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 12H4.75"></path>
                        </svg>
                    </a>
                </li>
            `;
        }

        paginationList.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault();
                const newPage = parseInt(link.getAttribute("data-page"));
                renderPage(newPage);
                window.scrollTo({ top: blogGrid.offsetTop - 100, behavior: "smooth" });
            });
        });
    };

    // Simple helper if description is truncated in JSON, or reuse logic
    const getExcerpt = post => {
        if (post.description) return post.description;
        return "Read more...";
    };

    fetchPosts();
});