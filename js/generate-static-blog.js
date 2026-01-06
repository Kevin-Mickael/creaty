/**
 * Static Blog Page Generator for Creaty
 * 
 * This script generates static HTML pages for blog articles from Strapi.
 * This is essential for SEO as Google cannot index JavaScript-rendered content.
 * 
 * Usage: node js/generate-static-blog.js
 * 
 * What it does:
 * 1. Fetches all articles from Strapi API
 * 2. Generates individual HTML pages for each article in /articles/[slug]/index.html
 * 3. Updates the sitemap with clean URLs
 * 
 * Run this script:
 * - After publishing a new article in Strapi
 * - As part of your deployment pipeline
 * - Via cron job for automatic updates
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG = {
    API_URL: 'https://admin.creatymu.org/api',
    SITE_URL: 'https://creatymu.org',
    OUTPUT_DIR: path.join(__dirname, '..', 'articles')
};

// HTML template for static article pages
function generateArticleHTML(article) {
    const attrs = article.attributes || article;
    const slug = attrs.slug || article.documentId || article.id;
    const title = attrs.title || 'Article';
    const description = attrs.description || title;
    const content = formatContent(attrs.content);
    const publishedAt = attrs.publishedAt || new Date().toISOString();
    const updatedAt = attrs.updatedAt || publishedAt;
    const category = attrs.category || 'NEWS';
    const author = attrs.author || 'Creaty Team';
    const readTime = attrs.readTime || estimateReadTime(content);

    // Image handling
    let imageUrl = 'https://creatymu.org/images/og-image.png';
    if (attrs.image) {
        const imageData = attrs.image.data?.attributes || attrs.image;
        if (imageData?.url) {
            imageUrl = imageData.url.startsWith('http') ? imageData.url : `https://admin.creatymu.org${imageData.url}`;
        }
    }

    const formattedDate = new Date(publishedAt).toLocaleDateString('en-MU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Creaty Digital Agency Mauritius</title>

    <!-- SEO Meta Tags -->
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${escapeHtml(author)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${CONFIG.SITE_URL}/articles/${slug}/">

    <!-- OpenGraph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${CONFIG.SITE_URL}/articles/${slug}/">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:locale" content="en_MU">
    <meta property="og:site_name" content="Creaty">
    <meta property="article:published_time" content="${publishedAt}">
    <meta property="article:modified_time" content="${updatedAt}">
    <meta property="article:author" content="${escapeHtml(author)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Schema.org Article -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${escapeHtml(title).replace(/"/g, '\\"')}",
        "description": "${escapeHtml(description).replace(/"/g, '\\"')}",
        "image": "${imageUrl}",
        "author": {
            "@type": "Organization",
            "name": "Creaty",
            "url": "https://creatymu.org"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Creaty",
            "logo": {
                "@type": "ImageObject",
                "url": "https://creatymu.org/images/creaty.logo.svg"
            }
        },
        "datePublished": "${publishedAt}",
        "dateModified": "${updatedAt}",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "${CONFIG.SITE_URL}/articles/${slug}/"
        }
    }
    </script>

    <!-- Schema.org Breadcrumb -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://creatymu.org"
        }, {
            "@type": "ListItem",
            "position": 2,
            "name": "News",
            "item": "https://creatymu.org/news"
        }, {
            "@type": "ListItem",
            "position": 3,
            "name": "${escapeHtml(title).replace(/"/g, '\\"')}",
            "item": "${CONFIG.SITE_URL}/articles/${slug}/"
        }]
    }
    </script>

    <!-- Favicons -->
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#ffffff">

    <!-- CSS -->
    <link rel="stylesheet" href="/css/vendor.css">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@1,400;1,700&display=swap">

    <style>
        .s-article { padding-top: var(--vspace-5); padding-bottom: var(--vspace-5); }
        .article-header { text-align: center; margin-bottom: var(--vspace-4); }
        .article-header__category { display: inline-block; padding: 0.6rem 2rem; border: 1px solid #ccc; border-radius: 50px; font-size: 1.2rem; text-transform: uppercase; letter-spacing: .15rem; margin-bottom: 2rem; }
        .article-header__title { font-size: 4rem; margin-bottom: 2rem; line-height: 1.2; }
        .article-header__meta { display: flex; justify-content: center; gap: 3rem; font-size: 1.4rem; color: #666; flex-wrap: wrap; }
        .article-featured-image { width: 100%; max-height: 600px; object-fit: cover; border-radius: 20px; margin-bottom: var(--vspace-3); }
        .article-content { max-width: 800px; margin: 0 auto; font-size: 1.8rem; line-height: 1.8; text-align: justify; color: var(--color-text-dark); }
        .article-content p { margin-bottom: 2rem; }
        .article-content h2 { margin-top: 3rem; margin-bottom: 1.5rem; }
        .article-content h3 { margin-top: 2.5rem; margin-bottom: 1rem; }
        .article-content ul, .article-content ol { margin-left: 2rem; margin-bottom: 2rem; }
        .article-back { display: inline-flex; align-items: center; gap: 1rem; font-weight: 700; margin-bottom: var(--vspace-2); }
        .article-back svg { width: 20px; height: 20px; }
        .s-header.sticky { position: fixed !important; opacity: 1 !important; visibility: visible !important; background-color: var(--color-gray-19) !important; transform: translateY(0) !important; top: 0 !important; }
        .s-header__inner { opacity: 1 !important; transform: translateY(0) !important; }
        @media screen and (max-width: 600px) { .article-header__title { font-size: 2.8rem; } .article-header__meta { flex-direction: column; gap: 1rem; } }
    </style>

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-SGEM349PX5"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-SGEM349PX5');
    </script>
</head>

<body id="top">

    <div id="page" class="s-pagewrap">

        <!-- Header -->
        <header class="s-header sticky offset scrolling">
            <div class="row s-header__inner">
                <div class="s-header__block">
                    <div class="s-header__logo">
                        <a class="logo" href="/">
                            <img src="/images/creaty.logo.svg" alt="Creaty - Digital Agency Mauritius" width="120" height="34">
                        </a>
                    </div>
                    <a class="s-header__menu-toggle" href="#0"><span>Menu</span></a>
                </div>
                <nav class="s-header__nav">
                    <ul>
                        <li><a href="/#intro">Intro</a></li>
                        <li><a href="/#about">About</a></li>
                        <li><a href="/#pricing">Pricing</a></li>
                        <li><a href="/#faq">FAQ</a></li>
                        <li class="current"><a href="/news">News</a></li>
                        <li><a href="/legal">Terms & Conditions</a></li>
                    </ul>
                </nav>
                <div class="s-header__cta">
                    <a href="/#contact" class="btn btn--primary s-header__cta-btn">Contact us</a>
                </div>
            </div>
        </header>

        <!-- Article Content -->
        <section id="content" class="s-content s-article">
            <div class="row">
                <div class="column lg-12">
                    <a href="/news" class="article-back">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10.25 6.75L4.75 12L10.25 17.25M19.25 12H5"></path>
                        </svg>
                        Back to News
                    </a>
                </div>
            </div>

            <div class="row article-header">
                <div class="column lg-12 text-center">
                    <span class="article-header__category">${escapeHtml(category)}</span>
                    <h1 class="article-header__title">${escapeHtml(title)}</h1>
                    <div class="article-header__meta">
                        <span>${formattedDate}</span>
                        <span>By ${escapeHtml(author)}</span>
                        <span>${readTime} min read</span>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="column lg-12">
                    <img class="article-featured-image" src="${imageUrl}" alt="${escapeHtml(title)}">
                </div>
            </div>

            <div class="row">
                <div class="column lg-12">
                    <div class="article-content">
                        ${content}
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer id="colophon" class="s-footer footer">
            <div class="row s-footer__bottom">
                <div class="column lg-5 md-6 stack-on-900">
                    <div class="footer__logo">
                        <a href="/"><img src="/images/creaty.logo.svg" alt="Creaty" width="120" height="34"></a>
                    </div>
                    <p>Behind every brand Mauritius loves is a strategy they never see. That's Creaty.</p>
                </div>
                <div class="column lg-6 stack-on-900 end">
                    <ul class="s-footer__site-links">
                        <li><a href="/#intro">Intro</a></li>
                        <li><a href="/#about">About</a></li>
                        <li><a href="/#pricing">Pricing</a></li>
                        <li><a href="/news">News</a></li>
                        <li><a href="/legal">Terms & Conditions</a></li>
                    </ul>
                    <p class="s-footer__contact">
                        Do you have a question? <a href="mailto:support@creatymu.org">support@creatymu.org</a>
                    </p>
                    <div class="ss-copyright">
                        <span>© Creaty 2025 — Operated by <b>Creativfolio Ltd</b>, registered in Mauritius</span>
                    </div>
                </div>
            </div>
        </footer>

    </div>

    <script src="/js/plugins.js"></script>
    <script src="/js/main.js"></script>
</body>
</html>`;
}

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatContent(content) {
    if (!content) return '<p>No content available.</p>';

    // Handle Strapi blocks format
    if (Array.isArray(content)) {
        return content.map(block => {
            if (block.type === 'paragraph') {
                const text = block.children?.map(child => {
                    let t = child.text || '';
                    if (child.bold) t = `<strong>${t}</strong>`;
                    if (child.italic) t = `<em>${t}</em>`;
                    if (child.underline) t = `<u>${t}</u>`;
                    if (child.strikethrough) t = `<s>${t}</s>`;
                    if (child.code) t = `<code>${t}</code>`;
                    return t;
                }).join('') || '';
                return `<p>${text}</p>`;
            }
            if (block.type === 'heading') {
                const level = block.level || 2;
                const text = block.children?.map(c => c.text).join('') || '';
                return `<h${level}>${text}</h${level}>`;
            }
            if (block.type === 'list') {
                const tag = block.format === 'ordered' ? 'ol' : 'ul';
                const items = block.children?.map(item => {
                    const text = item.children?.map(c => c.children?.map(cc => cc.text).join('') || c.text || '').join('') || '';
                    return `<li>${text}</li>`;
                }).join('') || '';
                return `<${tag}>${items}</${tag}>`;
            }
            if (block.type === 'quote') {
                const text = block.children?.map(c => c.children?.map(cc => cc.text).join('') || c.text || '').join('') || '';
                return `<blockquote>${text}</blockquote>`;
            }
            if (block.type === 'image' && block.image) {
                const url = block.image.url?.startsWith('http') ? block.image.url : `https://admin.creatymu.org${block.image.url}`;
                return `<img src="${url}" alt="${block.image.alternativeText || ''}" style="max-width:100%; border-radius: 8px; margin: 2rem 0;">`;
            }
            return '';
        }).join('\n');
    }

    // Handle string content (markdown or plain text)
    if (typeof content === 'string') {
        // Basic markdown conversion
        let html = content
            .replace(/\r\n/g, '\n')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^\- (.+)$/gm, '<li>$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return `<p>${html}</p>`;
    }

    return '<p>Content format not supported.</p>';
}

function estimateReadTime(content) {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
}

// Fetch with built-in https/http
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ ok: true, data: JSON.parse(data) });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Main function
async function generateStaticPages() {
    console.log('🚀 Static Blog Page Generator for Creaty');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // Create output directory
        if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
            fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
            console.log(`📁 Created directory: ${CONFIG.OUTPUT_DIR}\n`);
        }

        // Fetch all articles
        console.log('🔄 Fetching articles from Strapi...');
        const apiUrl = `${CONFIG.API_URL}/articles?populate=image&sort[0]=publishedAt:desc`;
        const response = await fetchUrl(apiUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        const articles = response.data.data;
        console.log(`✅ Found ${articles.length} articles\n`);

        // Generate static pages
        const generatedUrls = [];

        for (const article of articles) {
            const attrs = article.attributes || article;
            const slug = attrs.slug || article.documentId || article.id;

            // Create directory for article
            const articleDir = path.join(CONFIG.OUTPUT_DIR, slug);
            if (!fs.existsSync(articleDir)) {
                fs.mkdirSync(articleDir, { recursive: true });
            }

            // Generate HTML
            const html = generateArticleHTML(article);
            const outputPath = path.join(articleDir, 'index.html');
            fs.writeFileSync(outputPath, html, 'utf8');

            console.log(`📄 Generated: /articles/${slug}/index.html`);
            generatedUrls.push({
                url: `/articles/${slug}/`,
                lastmod: (attrs.updatedAt || attrs.publishedAt || new Date().toISOString()).split('T')[0],
                priority: '0.7',
                changefreq: 'weekly'
            });
        }

        // Update sitemap
        console.log('\n🔄 Updating sitemap.xml...');

        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
            { url: '/news', priority: '0.8', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
            { url: '/legal', priority: '0.3', changefreq: 'monthly', lastmod: '2025-12-30' }
        ];

        const allPages = [...staticPages, ...generatedUrls];

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${CONFIG.SITE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
        console.log(`✅ Sitemap updated: ${sitemapPath}\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Successfully generated ${generatedUrls.length} static article pages`);
        console.log(`📍 Location: ${CONFIG.OUTPUT_DIR}`);
        console.log(`🗺️  Sitemap updated with ${allPages.length} URLs`);
        console.log('');
        console.log('📢 NEXT STEPS:');
        console.log('   1. Deploy these files to your hosting');
        console.log('   2. Submit sitemap in Google Search Console');
        console.log('   3. Request indexing for new pages');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n⚠️  Make sure the Strapi API is running and accessible.');
    }
}

// Run
generateStaticPages();
