document.addEventListener("DOMContentLoaded", () => {
    const blogGrid = document.getElementById("blog-grid");
    const paginationList = document.getElementById("pagination-list");
    const blogPagination = document.getElementById("blog-pagination");
    if (!blogGrid) return;

    const fetchPosts = async (page = 1) => {
        try {
            // Optimized API query: selected fields and targeted population
            const query = new URLSearchParams({
                "fields[0]": "title",
                "fields[1]": "slug",
                "fields[2]": "publishedAt",
                "fields[3]": "category",
                "fields[4]": "epingle",
                "fields[5]": "description",
                "populate[image][fields][0]": "url",
                "pagination[page]": page,
                "pagination[pageSize]": 6,
                "sort[0]": "epingle:desc",
                "sort[1]": "publishedAt:desc"
            });

            const response = await ApiClient.fetch(`${CONFIG.API_URL}/articles?${query.toString()}`);
            if (!response.ok) {
                throw new Error("Failed to fetch posts");
            }
            const { data, meta } = await response.json();

            if (data.length === 0) {
                blogGrid.innerHTML = '<div class="column lg-12"><p class="text-center">Aucun article trouvé pour le moment.</p></div>';
                blogPagination.style.display = "none";
                return;
            }

            renderPosts(data);
            renderPagination(meta.pagination);
        } catch (error) {
            console.error("Error loading blog posts:", error);
            blogGrid.innerHTML = `
                <div class="column lg-12">
                    <div class="alert-box alert-box--error">
                        <p>Désolé, une erreur est survenue lors du chargement des articles. Veuillez réessayer plus tard.</p>
                    </div>
                </div>
            `;
        }
    };

    const renderPosts = posts => {
        blogGrid.innerHTML = "";
        posts.forEach(post => {
            const attrs = post.attributes || post;
            const postId = post.id || post.documentId;
            let imageUrl = "/images/sample-image.jpg";

            if (attrs.image) {
                const imageData = attrs.image.data?.attributes || attrs.image;
                if (imageData?.url) {
                    imageUrl = imageData.url.startsWith("http") ? imageData.url : CONFIG.STRAPI_BASE_URL + imageData.url;
                }
            }

            const date = new Date(attrs.publishedAt || attrs.createdAt).toLocaleDateString("en-MU", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            const postHTML = `
                <div class="column">
                    <article class="blog-post-card">
                        <img src="${imageUrl}" alt="${attrs.title}" class="blog-post-card__image" loading="lazy">
                        <div class="blog-post-card__content">
                            <h3 class="blog-post-card__title">${attrs.title}</h3>
                            <div class="blog-post-card__meta-row">
                                <span class="blog-post-card__category">${attrs.category || "NEWS"}</span>
                                ${attrs.epingle ? '<span class="blog-post-card__category" style="background: #000; color: #fff; border-color: #000;">ÉPINGLÉ</span>' : ""}
                                <span class="blog-post-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2H7zM11 15h2v2H7zM15 15h2v2H7z"></path><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 20V9h14l.002 11H5z"></path></svg>
                                    ${date}
                                </span>
                            </div>
                            <p class="blog-post-card__excerpt">${getExcerpt(attrs)}</p>
                            <a href="/blog?slug=${attrs.slug || post.documentId || post.id}" class="blog-post-card__link">READ MORE</a>
                        </div>
                    </article>
                </div>
            `;
            blogGrid.insertAdjacentHTML("beforeend", postHTML);
        });
    };

    const renderPagination = pagination => {
        const { page, pageCount } = pagination;
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

        updatePaginationHead(page, pageCount);
        paginationList.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault();
                const newPage = parseInt(link.getAttribute("data-page"));
                fetchPosts(newPage);
                window.scrollTo({ top: blogGrid.offsetTop - 100, behavior: "smooth" });
            });
        });
    };

    const updatePaginationHead = (currentPage, totalPages) => {
        const existingNext = document.querySelector('link[rel="next"]');
        const existingPrev = document.querySelector('link[rel="prev"]');
        if (existingNext) existingNext.remove();
        if (existingPrev) existingPrev.remove();
        const baseUrl = window.location.origin + window.location.pathname;

        if (currentPage > 1) {
            const prevLink = document.createElement("link");
            prevLink.rel = "prev";
            prevLink.href = `${baseUrl}?page=${currentPage - 1}`;
            document.head.appendChild(prevLink);
        }
        if (currentPage < totalPages) {
            const nextLink = document.createElement("link");
            nextLink.rel = "next";
            nextLink.href = `${baseUrl}?page=${currentPage + 1}`;
            document.head.appendChild(nextLink);
        }
    };

    const getExcerpt = attrs => {
        if (attrs.description) return attrs.description;
        let text = "";
        if (Array.isArray(attrs.content)) {
            text = attrs.content
                .filter(block => block.type === "paragraph")
                .map(block => block.children.map(child => child.text).join(""))
                .join(" ");
        } else if (typeof attrs.content === "string") {
            text = attrs.content.replace(/[#*`_~\[\]]/g, "").replace(/<[^>]*>/g, "");
        }
        if (text.length > 120) {
            return text.substring(0, 117) + "...";
        }
        return text || "Read more...";
    };

    fetchPosts();
});