/**
 * Blog Loader for Creaty.
 * Fetches blog posts from Strapi API and renders them in the blog grid.
 */

document.addEventListener('DOMContentLoaded', () => {
    const blogGrid = document.getElementById('blog-grid');
    const paginationList = document.getElementById('pagination-list');
    const blogPagination = document.getElementById('blog-pagination');

    if (!blogGrid) return;

    const fetchPosts = async (page = 1) => {
        try {
            // Strapi V4 pagination and population
            const response = await fetch(`${CONFIG.API_URL}/articles?populate=*&pagination[page]=${page}&pagination[pageSize]=6&sort[0]=pinned:desc&sort[1]=publishedAt:desc`);

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const { data, meta } = await response.json();

            if (data.length === 0) {
                blogGrid.innerHTML = '<div class="column lg-12"><p class="text-center">Aucun article trouvé pour le moment.</p></div>';
                blogPagination.style.display = 'none';
                return;
            }

            renderPosts(data);
            renderPagination(meta.pagination);
        } catch (error) {
            console.error('Error loading blog posts:', error);
            blogGrid.innerHTML = `
                <div class="column lg-12">
                    <div class="alert-box alert-box--error">
                        <p>Désolé, une erreur est survenue lors du chargement des articles. Veuillez réessayer plus tard.</p>
                    </div>
                </div>
            `;
        }
    };

    const renderPosts = (posts) => {
        blogGrid.innerHTML = '';

        posts.forEach(post => {
            // Strapi v5 uses direct properties, v4 uses .attributes
            const attrs = post.attributes || post;
            const postId = post.id || post.documentId;

            // Handle image URL for both v4 and v5
            let imageUrl = 'images/sample-image.jpg';
            if (attrs.image) {
                if (attrs.image.data?.attributes?.url) {
                    // Strapi v4 format
                    imageUrl = attrs.image.data.attributes.url.startsWith('http')
                        ? attrs.image.data.attributes.url
                        : CONFIG.STRAPI_BASE_URL + attrs.image.data.attributes.url;
                } else if (attrs.image.url) {
                    // Strapi v5 format
                    imageUrl = attrs.image.url.startsWith('http')
                        ? attrs.image.url
                        : CONFIG.STRAPI_BASE_URL + attrs.image.url;
                }
            }

            const date = new Date(attrs.publishedAt || attrs.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const postHTML = `
                <div class="column">
                    <article class="blog-post-card">
                        <img src="${imageUrl}" alt="${attrs.title}" class="blog-post-card__image">
                        <div class="blog-post-card__content">
                            <h3 class="blog-post-card__title">${attrs.title}</h3>
                            <div class="blog-post-card__meta-row">
                                <span class="blog-post-card__category">${attrs.category || 'NEWS'}</span>
                                ${attrs.pinned ? '<span class="blog-post-card__category" style="background: #000; color: #fff; border-color: #000;">PINNED</span>' : ''}
                                <span class="blog-post-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z"></path><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM5 20V9h14l.002 11H5z"></path></svg>
                                    ${date}
                                </span>
                                <span class="blog-post-card__meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M11 11H9v2h2v2l3-3-3-3v2z"></path></svg>
                                    SHARE
                                </span>
                            </div>
                            <p class="blog-post-card__excerpt">${attrs.description || (attrs.content ? attrs.content.substring(0, 120) : '')}...</p>
                            <a href="blog-single.html?slug=${attrs.slug || postId}" class="blog-post-card__link">READ MORE</a>
                        </div>
                    </article>
                </div>
            `;
            blogGrid.insertAdjacentHTML('beforeend', postHTML);
        });
    };

    const renderPagination = (pagination) => {
        const { page, pageCount } = pagination;
        if (pageCount <= 1) {
            blogPagination.style.display = 'none';
            return;
        }

        blogPagination.style.display = 'block';
        paginationList.innerHTML = '';

        // Previous button
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

        // Page numbers
        for (let i = 1; i <= pageCount; i++) {
            paginationList.innerHTML += `
                <li><a class="pgn__num ${i === page ? 'current' : ''}" href="#" data-page="${i}">${i}</a></li>
            `;
        }

        // Next button
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

        // Add event listeners to pagination links
        paginationList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const newPage = parseInt(link.getAttribute('data-page'));
                fetchPosts(newPage);
                window.scrollTo({ top: blogGrid.offsetTop - 100, behavior: 'smooth' });
            });
        });
    };

    // Initial fetch
    fetchPosts();
});
