/**
 * Sitemap Generator for Creaty
 * Fetches article slugs from Strapi and generates XML sitemap
 * 
 * Usage (Node.js): node js/generate-sitemap.js
 * Usage (Browser): Call generateSitemap() - outputs to console
 * 
 * IMPORTANT SEO NOTE:
 * - Blog articles using /blog?slug=X are NOT indexable by Google as content is JS-rendered
 * - This sitemap only includes static, crawlable pages
 * - For article indexing, implement SSG/SSR or pre-rendered HTML pages
 * 
 * For production: Update CONFIG.SITE_URL and CONFIG.API_URL
 */

const SITEMAP_CONFIG = {
    API_URL: 'https://admin.creatymu.org/api', // Use production API for sitemap
    SITE_URL: 'https://creatymu.org'
};


const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
    { url: '/news', priority: '0.8', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
    { url: '/legal', priority: '0.3', changefreq: 'monthly', lastmod: '2025-12-30' }
];

async function generateSitemap() {
    try {
        console.log('🔄 Generating Sitemap for Creaty...');

        // Only include static pages - blog URLs with query params are NOT crawlable
        // Google cannot render JavaScript content on first crawl
        const allPages = [...staticPages];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${SITEMAP_CONFIG.SITE_URL}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        console.log('\n📄 Generated Sitemap:\n');
        console.log(xml);

        // In Node.js environment, write to file
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const outputPath = path.join(__dirname, '..', 'sitemap.xml');
                fs.writeFileSync(outputPath, xml, 'utf8');
                console.log(`\n✅ Sitemap saved to: ${outputPath}`);
            } catch (e) {
                console.log('\n⚠️  Could not write file (browser environment or permission issue)');
            }
        }

        // Show SEO recommendations
        console.log('\n📢 SEO RECOMMENDATIONS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ Blog articles with /blog?slug=X URLs are NOT included.');
        console.log('   Reason: Content is JavaScript-rendered, Google cannot index it.');
        console.log('');
        console.log('✅ SOLUTIONS for blog article indexing:');
        console.log('   1. Use Static Site Generation (SSG) to pre-render HTML');
        console.log('   2. Use clean URLs like /blog/article-slug/ with pre-rendered content');
        console.log('   3. Implement server-side rendering (SSR) with Node.js');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return xml;

    } catch (error) {
        console.error('❌ Error generating sitemap:', error.message);

        // Generate sitemap with static pages only
        console.log('\n📄 Generating static-only sitemap...\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${SITEMAP_CONFIG.SITE_URL}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        console.log(xml);
        return xml;
    }
}

// Auto-run in Node.js environment
if (typeof module !== 'undefined' && require.main === module) {
    generateSitemap();
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.generateSitemap = generateSitemap;
}
