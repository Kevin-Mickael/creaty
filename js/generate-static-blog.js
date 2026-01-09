/**
 * Static Blog Page Generator for Creaty
 * 
 * This script generates static HTML pages for blog articles from Strapi.
 * This is essential for SEO as Google cannot index JavaScript-rendered content.
 * 
 * Features:
 * - MDX/Markdown support for description and content
 * - Video as background hero, image for SEO only
 * - Folder per article for better organization
 * - Cascade delete when article is removed
 * - Only adds new articles, preserves existing ones
 * 
 * Usage: node js/generate-static-blog.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG = {
    API_URL: process.env.STRAPI_API_URL || 'http://localhost:1337/api',
    SITE_URL: 'https://creatymu.org',
    OUTPUT_DIR: path.join(__dirname, '..', 'articles')
};

// ===== MARKDOWN PARSER =====
function parseMarkdown(text) {
    if (!text) return '';

    let html = String(text)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    // Headers (with or without space after #)
    html = html.replace(/^#{4}\s*(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s*(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s*(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s*(.+)$/gm, '<h1>$1</h1>');

    // Bold and italic (handle multiline with [\s\S])
    html = html.replace(/\*\*\*(.+?)\*\*\*/gs, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
    html = html.replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');

    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Paragraphs (double newline)
    html = html.replace(/\n\n+/g, '</p><p>');

    // Single newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}

// ===== HTML TEMPLATE =====
function generateArticleHTML(article) {
    const attrs = article.attributes || article;
    const slug = attrs.slug || article.documentId || article.id;
    const title = attrs.title || 'Article';
    const rawDescription = attrs.description || title;
    const description = rawDescription.replace(/<[^>]*>/g, '').substring(0, 160); // Plain text for SEO
    const descriptionHtml = parseMarkdown(rawDescription); // Rendered MDX for display
    const content = formatContent(attrs.content);
    const publishedAt = attrs.publishedAt || new Date().toISOString();
    const updatedAt = attrs.updatedAt || publishedAt;
    const category = attrs.category || 'NEWS';
    const author = attrs.author || 'Creaty Team';
    const readTime = attrs.readTime || estimateReadTime(content);

    // Image handling (for SEO meta tags only)
    let imageUrl = 'https://creatymu.org/images/og-image.png';
    if (attrs.image) {
        const imageData = attrs.image.data?.attributes || attrs.image;
        if (imageData?.url) {
            imageUrl = imageData.url.startsWith('http') ? imageData.url : `https://res.cloudinary.com/dvfbakbsf${imageData.url}`;
        }
    }

    // Video handling (for hero background)
    let videoUrl = null;
    if (attrs.video) {
        const videoData = attrs.video.data?.attributes || attrs.video;
        if (videoData?.url) {
            videoUrl = videoData.url.startsWith('http') ? videoData.url : `https://res.cloudinary.com/dvfbakbsf${videoData.url}`;
        }
    }

    const formattedDate = new Date(publishedAt).toLocaleDateString('en-MU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Video hero section styles
    const videoHeroStyles = videoUrl ? `
        .article-hero { position: relative; width: 100%; height: 60vh; min-height: 400px; max-height: 700px; overflow: hidden; border-radius: 20px; margin-bottom: var(--vspace-3); }
        .article-hero__video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; width: auto; height: auto; transform: translate(-50%, -50%); object-fit: cover; z-index: 1; }
        .article-hero__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%); z-index: 2; }
        .article-hero__content { position: absolute; bottom: 0; left: 0; right: 0; padding: 3rem; z-index: 3; color: #fff; text-align: center; }
        .article-hero__content .article-header__title { color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .article-hero__content .article-header__meta { color: rgba(255,255,255,0.9); }
        .article-hero__content .article-header__category { border-color: rgba(255,255,255,0.5); color: #fff; }
    ` : '';

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
    ${videoUrl ? `<meta property="og:video" content="${videoUrl}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="${videoUrl ? 'player' : 'summary_large_image'}">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    ${videoUrl ? `<meta name="twitter:player" content="${videoUrl}">` : ''}

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
        }${videoUrl ? `,
        "video": {
            "@type": "VideoObject",
            "name": "${escapeHtml(title).replace(/"/g, '\\"')}",
            "description": "${escapeHtml(description).replace(/"/g, '\\"')}",
            "thumbnailUrl": "${imageUrl}",
            "uploadDate": "${publishedAt}",
            "contentUrl": "${videoUrl}"
        }` : ''}
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
        .article-description { max-width: 100%; margin: 0 auto var(--vspace-3); font-size: 1.6rem; line-height: 1.7; color: #555; font-style: italic; text-align: center; }
        .article-content { max-width: 100%; margin: 0 auto; font-size: 1.8rem; line-height: 1.8; text-align: justify; color: var(--color-text-dark); }
        .article-content p { margin-bottom: 2rem; }
        .article-content h2 { margin-top: 3rem; margin-bottom: 1.5rem; }
        .article-content h3 { margin-top: 2.5rem; margin-bottom: 1rem; }
        .article-content ul, .article-content ol { margin-left: 2rem; margin-bottom: 2rem; }
        .article-content blockquote { border-left: 4px solid #333; padding-left: 2rem; margin: 2rem 0; font-style: italic; color: #555; }
        .article-content code { background: #f4f4f4; padding: 0.2rem 0.5rem; border-radius: 4px; font-family: monospace; }
        .article-back { display: inline-flex; align-items: center; gap: 1rem; font-weight: 700; margin-bottom: var(--vspace-2); }
        .article-back svg { width: 20px; height: 20px; }
        .s-header.sticky { position: fixed !important; opacity: 1 !important; visibility: visible !important; background-color: var(--color-gray-19) !important; transform: translateY(0) !important; top: 0 !important; }
        .s-header__inner { opacity: 1 !important; transform: translateY(0) !important; }
        ${videoHeroStyles}
        @media screen and (max-width: 600px) { .article-header__title { font-size: 2.8rem; } .article-header__meta { flex-direction: column; gap: 1rem; } .article-hero { height: 40vh; min-height: 300px; } }
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
                     <p style="font-size: 1.2rem; text-transform: uppercase; color: #888; font-family: var(--font-sans); letter-spacing: 1px; margin-bottom: 2rem;">
                        <a href="/" style="color: #555; text-decoration: none;">Home</a> <span style="margin: 0 5px;">&gt;</span> <a href="/news" style="color: #555; text-decoration: none;">News</a> <span style="margin: 0 5px;">&gt;</span> <span style="color: #e31b6d; font-weight: 600; overflow-wrap: break-word;">${escapeHtml(title)}</span>
                    </p>
                </div>
            </div>
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

            ${videoUrl ? `
            <!-- Video Hero Background -->
            <div class="row">
                <div class="column lg-12">
                    <div class="article-hero">
                        <video class="article-hero__video" autoplay muted loop playsinline poster="${imageUrl}">
                            <source src="${videoUrl}" type="video/mp4">
                        </video>
                        <div class="article-hero__overlay"></div>
                        <div class="article-hero__content">
                            <span class="article-header__category">${escapeHtml(category)}</span>
                            <h1 class="article-header__title">${escapeHtml(title)}</h1>
                            <div class="article-header__meta">
                                <span>${formattedDate}</span>
                                <span>By ${escapeHtml(author)}</span>
                                <span>${readTime} min read</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ` : `
            <!-- Standard Header (no video) -->
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
            `}

            <!-- Description (MDX rendered) -->
            <div class="row">
                <div class="column lg-12">
                    <div class="article-description">
                        ${descriptionHtml}
                    </div>
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

        <!-- CTA Section -->
        <section style="padding: 6rem 0; background-color: #ffffff;">
            <div class="row">
                <!-- Contact CTA -->
                <div class="column lg-6 stack-on-900" style="margin-bottom: 3rem;">
                    <div style="background: #050505; color: #ffffff; padding: 4rem; border-radius: 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s ease;">
                        <div>
                            <h3 style="color: #ffffff; margin-bottom: 1.5rem; font-size: 2.8rem; letter-spacing: -0.02em;">Ready to Start?</h3>
                            <p style="font-size: 1.8rem; line-height: 1.6; color: rgba(255,255,255,0.7); margin-bottom: 3rem; font-weight: 300;">
                                You're not here for nothing. You're here to create something, and now it's your turn. Your first step starts with a message, get in touch with us today.
                            </p>
                        </div>
                        <a href="/#contact" class="btn btn--primary" style="background: #ffffff; color: #000000; border: none; align-self: flex-start; font-weight: 600; padding: 1.2rem 3rem; display: inline-flex; justify-content: center; align-items: center; text-align: center;">Get in Touch</a>
                    </div>
                </div>
                
                <!-- Pricing CTA -->
                <div class="column lg-6 stack-on-900" style="margin-bottom: 3rem;">
                    <div style="background: #f4f4f4; color: #000000; padding: 4rem; border-radius: 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(0,0,0,0.05); transition: transform 0.3s ease;">
                        <div>
                            <h3 style="color: #000000; margin-bottom: 1.5rem; font-size: 2.8rem; letter-spacing: -0.02em;">Find Your Plan</h3>
                            <p style="font-size: 1.8rem; line-height: 1.6; color: #555555; margin-bottom: 3rem; font-weight: 300;">
                                You're almost there. Take a look at our pricing and find the perfect plan to launch your project today.
                            </p>
                        </div>
                        <a href="/#pricing" class="btn btn--primary" style="background: #000000; color: #ffffff; border: none; align-self: flex-start; font-weight: 600; padding: 1.2rem 3rem; display: inline-flex; justify-content: center; align-items: center; text-align: center;">View Pricing</a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Related News Section -->
        <section style="padding: var(--vspace-4) 0; background-color: #fafafa; margin-top: 4rem;">
            <div class="row">
                <div class="column lg-12 text-center">
                    <h3 class="h2" style="margin-bottom: 3rem;">Latest News & Insights</h3>
                </div>
            </div>
            <div id="related-news-grid" class="row block-lg-one-third block-tab-one-half block-stack">
                <!-- Dynamically populated by promo.js -->
                 <p class="text-center w-full" style="width: 100%; text-align: center; color: #888;">Loading latest news...</p>
            </div>
        </section>

        <!-- Footer -->
        <footer id="colophon" class="s-footer footer">
            <div class="row s-footer__top">
                <div class="column lg-12 text-center">
                    <h2 class="text-display-1">
                        Sign Up to Our Newsletter.
                    </h2>
                    <p class="lead">
                        Subscribe for updates, special offers and more.
                    </p>
                </div>
                <div class="column lg-12 s-footer__subscribe">
                    <div class="subscribe-form">
                        <form id="mc-form" class="mc-form">
                            <input type="email" name="EMAIL" id="mce-EMAIL" class="u-fullwidth text-center"
                                placeholder="Your Email Address" required>
                            <input type="submit" name="subscribe" value="Subscribe"
                                class="btn btn--primary u-fullwidth">
                            <div class="mc-status"></div>
                        </form>
                    </div>
                </div>
            </div>
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
                        <span>Created by <a href="https://creativfolio.com/" title="Web Design & Branding Mauritius">Création de Site Web & Portfolio</a></span>
                    </div>
                </div>
            </div>
        </footer>

    </div>

        <!-- Cookie Banner -->
        <div id="cookie-banner" class="cookie-banner" style="display: none;">
            <div class="cookie-banner__icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" />
                    <circle cx="9" cy="9" r="0.5" fill="currentColor" />
                    <circle cx="15" cy="10" r="0.5" fill="currentColor" />
                    <circle cx="10" cy="14" r="0.5" fill="currentColor" />
                    <circle cx="14" cy="15" r="0.5" fill="currentColor" />
                </svg>
            </div>
            <div class="cookie-banner__content">
                <h4>We Value Your Privacy</h4>
                <p>We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept", you
                    consent to our use of cookies. <a href="/legal" class="link-primary-underline"
                        title="Read our Legal & Privacy Policy">Learn more about our Terms & Privacy Policy</a></p>
                <div class="cookie-banner__buttons">
                    <button class="cookie-banner__btn cookie-banner__btn--accept"
                        onclick="acceptCookies()">Accept</button>
                    <button class="cookie-banner__btn cookie-banner__btn--decline"
                        onclick="declineCookies()">Decline</button>
                </div>
            </div>
        </div>

        <!-- Promo Widget -->
        <div id="promo-widget" class="promo-widget" style="display: none;">
            <div class="promo-widget__close" onclick="minimizePromo()">
                <svg viewBox="0 0 24 24">
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </div>
            <div class="promo-widget__icon-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            </div>
            <h4>Ready for a Digital Upgrade?</h4>
            <p>
                Stop dreaming about it. Whether you need a slick website or a mobile app that works, let's make it real.
            </p>
            <a href="https://creativfolio.com" target="_blank" class="promo-widget__btn">
                Visit Creativfolio
            </a>

            <div class="promo-news">
                <span class="promo-news__title">Latest News</span>
                <div id="promo-news-container">
                    <p class="text-loading">Loading latest updates...</p>
                </div>
            </div>
        </div>

        <!-- Promo Trigger Icon -->
        <div id="promo-trigger" class="promo-trigger" onclick="showPromo()" style="display: none;">
            <svg viewBox="0 0 24 24">
                <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
        </div>

    <script src="/js/plugins.js"></script>
    <script src="/js/config.js"></script>
    <script src="/js/api-client.js"></script>
    <script src="/js/promo.js"></script>
    <script src="/js/main.js"></script>
</body>
</html>`;
}

// ===== HELPER FUNCTIONS =====
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

    let html = '';

    // Handle Strapi blocks format
    if (Array.isArray(content)) {
        html = content.map(block => {
            if (block.type === 'paragraph') {
                // Construct text from children, preserving existing bold/italic marks from Strapi if any
                const text = block.children?.map(child => {
                    let t = child.text || '';
                    // If Strapi already handled styling, apply it, but generally we expect raw MDX text
                    if (child.bold) t = `<strong>${t}</strong>`;
                    if (child.italic) t = `<em>${t}</em>`;
                    if (child.underline) t = `<u>${t}</u>`;
                    if (child.strikethrough) t = `<s>${t}</s>`;
                    if (child.code) t = `<code>${t}</code>`;
                    return t;
                }).join('') || '';

                // Parse MDX syntax in the text (headers, lists, etc.)
                const parsed = parseMarkdown(text);

                // If parsed content is a block element (Heading, List Item, Blockquote), return as is
                // Otherwise wrap in paragraph
                if (/^<(h[1-6]|li|blockquote|ul|ol|hr)/i.test(parsed)) {
                    return parsed;
                }

                // Don't wrap empty lines or just line breaks in paragraphs if not needed
                if (parsed === '<br>') return parsed;

                return `<p>${parsed}</p>`;
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
                const url = block.image.url?.startsWith('http') ? block.image.url : `https://res.cloudinary.com/dvfbakbsf${block.image.url}`;
                return `<img src="${url}" alt="${block.image.alternativeText || ''}" style="max-width:100%; border-radius: 8px; margin: 2rem 0;">`;
            }
            return '';
        }).join('\n');
    }
    // Handle string content
    else if (typeof content === 'string') {
        html = parseMarkdown(content);
        if (!/^<(h|ul|ol|p|div|blockquote)/i.test(html)) {
            html = `<p>${html}</p>`;
        }
    } else {
        return '<p>Content format not supported.</p>';
    }

    // Post-processing: Merge consecutive <li> items into <ul> if they aren't already
    // This handles the case where * lists became <li>...</li> orphan lines
    html = html.replace(/(<li.*?>[\s\S]*?<\/li>\s*)+/g, (match) => {
        // If it's already inside a list, don't wrap? 
        // Simple regex might match inside existing UL but that would result in <ul><ul>...</ul></ul> which is valid but ugly.
        // Better: parseMarkdown already wrapped them if they were in string, but block loop produces separate lines.
        // We assume orphaned LIs here.
        return `<ul>${match}</ul>`;
    });

    // Cleanup nested ULs if any (<ul><ul>...</ul></ul> -> <ul>...</ul>)
    html = html.replace(/<ul>\s*<ul>/g, '<ul>').replace(/<\/ul>\s*<\/ul>/g, '</ul>');

    return html;
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
                    try {
                        resolve({ ok: true, data: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Delete folder recursively
function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(file => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
        return true;
    }
    return false;
}

// ===== MAIN FUNCTION =====
async function generateStaticPages() {
    console.log('🚀 Static Blog Page Generator for Creaty');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // Create output directory
        if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
            fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
            console.log(`📁 Created directory: ${CONFIG.OUTPUT_DIR}\n`);
        }

        // Get existing article folders (to preserve and track)
        const existingFolders = new Set(
            fs.readdirSync(CONFIG.OUTPUT_DIR)
                .filter(f => fs.statSync(path.join(CONFIG.OUTPUT_DIR, f)).isDirectory())
        );
        console.log(`📂 Found ${existingFolders.size} existing article folders\n`);

        // Fetch all articles from Strapi
        console.log('🔄 Fetching articles from Strapi...');
        const apiUrl = `${CONFIG.API_URL}/articles?populate[0]=image&populate[1]=video&sort[0]=publishedAt:desc`;
        const response = await fetchUrl(apiUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        const articles = response.data.data;
        console.log(`✅ Found ${articles.length} articles in Strapi\n`);

        // Track slugs from Strapi
        const strapiSlugs = new Set();
        const generatedUrls = [];
        const articlesData = [];

        for (const article of articles) {
            const attrs = article.attributes || article;
            const slug = attrs.slug || article.documentId || article.id;
            strapiSlugs.add(slug);

            // Collect data for static JSON
            articlesData.push({
                title: attrs.title,
                slug: slug,
                category: attrs.category || 'NEWS',
                publishedAt: attrs.publishedAt,
                description: attrs.description,
                image: attrs.image?.data?.attributes?.url || attrs.image?.url || null,
                video: attrs.video?.data?.attributes?.url || attrs.video?.url || null,
                epingle: attrs.epingle
            });

            // Create folder for article (folder name = slug)
            const articleDir = path.join(CONFIG.OUTPUT_DIR, slug);
            if (!fs.existsSync(articleDir)) {
                fs.mkdirSync(articleDir, { recursive: true });
                console.log(`📁 Created folder: ${slug}/`);
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

        // CASCADE DELETE: Remove folders for articles deleted in Strapi
        // BUT preserve legacy articles (not from Strapi)
        console.log('\n🔍 Checking for deleted Strapi articles...');

        // Read existing articles.json to get legacy articles
        const jsonPath = path.join(__dirname, 'articles.json');
        let legacyArticles = [];
        if (fs.existsSync(jsonPath)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                legacyArticles = existingData.filter(a => a.source === 'legacy');
                console.log(`📚 Found ${legacyArticles.length} legacy articles to preserve`);
            } catch (e) {
                console.log('⚠️  Could not read existing articles.json');
            }
        }

        // Get legacy slugs to protect them from deletion
        const legacySlugs = new Set(legacyArticles.map(a => a.slug));

        let deletedCount = 0;
        for (const folder of existingFolders) {
            // Only delete if: not in Strapi AND not a legacy article
            if (!strapiSlugs.has(folder) && !legacySlugs.has(folder)) {
                const folderPath = path.join(CONFIG.OUTPUT_DIR, folder);
                if (deleteFolderRecursive(folderPath)) {
                    console.log(`🗑️  Deleted: ${folder}/ (removed from Strapi)`);
                    deletedCount++;
                }
            }
        }
        if (deletedCount === 0) {
            console.log('✓ No Strapi articles to delete');
        } else {
            console.log(`\n🗑️  Deleted ${deletedCount} Strapi article folder(s)`);
        }

        // Mark Strapi articles with source
        const strapiArticlesWithSource = articlesData.map(a => ({ ...a, source: 'strapi' }));

        // Merge: Strapi articles + legacy articles (excluding duplicates)
        const allArticles = [
            ...strapiArticlesWithSource,
            ...legacyArticles.filter(legacy => !strapiSlugs.has(legacy.slug))
        ];

        // Sort by epingle (pinned first) then by publishedAt (newest first)
        allArticles.sort((a, b) => {
            if (a.epingle && !b.epingle) return -1;
            if (!a.epingle && b.epingle) return 1;
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });

        // Save merged articles.json
        fs.writeFileSync(jsonPath, JSON.stringify(allArticles, null, 2), 'utf8');
        console.log(`\n💾 Saved ${allArticles.length} articles (${strapiArticlesWithSource.length} Strapi + ${legacyArticles.length} legacy)`);

        // Build sitemap URLs for ALL articles (Strapi + legacy)
        const allArticleUrls = allArticles.map(article => ({
            url: `/articles/${article.slug}/`,
            lastmod: (article.publishedAt || new Date().toISOString()).split('T')[0],
            priority: '0.7',
            changefreq: 'weekly'
        }));

        // Update sitemap
        console.log('\n🔄 Updating sitemap.xml...');
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
            { url: '/news', priority: '0.8', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
            { url: '/legal', priority: '0.3', changefreq: 'monthly', lastmod: '2025-12-30' }
        ];

        const allPages = [...staticPages, ...allArticleUrls];
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
        console.log(`✅ Sitemap updated with ${allPages.length} URLs\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Generated ${generatedUrls.length} Strapi article pages`);
        console.log(`📚 Preserved ${legacyArticles.length} legacy articles`);
        console.log(`🗑️  Deleted ${deletedCount} orphan folders`);
        console.log(`🗺️  Sitemap has ${allPages.length} URLs`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n⚠️  Make sure Strapi is running and accessible.');
    }
}

// Run
generateStaticPages();

