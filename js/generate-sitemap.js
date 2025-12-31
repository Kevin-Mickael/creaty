/**
 * Sitemap Generator for Creaty
 * Fetches article slugs from Strapi and generates XML sitemap
 * 
 * Usage (Node.js): node js/generate-sitemap.js
 * Usage (Browser): Call generateSitemap() - outputs to console
 * 
 * For production: Update CONFIG.SITE_URL and CONFIG.API_URL
 */

const SITEMAP_CONFIG = {
    API_URL: 'https://admin.creatymu.org/api', // Use production API for sitemap
    SITE_URL: 'https://creatymu.org'
};


const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/news', priority: '0.8', changefreq: 'daily' },
    { url: '/legal', priority: '0.3', changefreq: 'monthly' }
];

async function generateSitemap() {
    try {
        console.log('🔄 Fetching articles from Strapi...');

        // Fetch all articles from Strapi
        const response = await fetch(`${SITEMAP_CONFIG.API_URL}/articles?fields[0]=slug&fields[1]=updatedAt&fields[2]=title`);

        if (!response.ok) {
            throw new Error(`Failed to fetch articles: ${response.status}`);
        }

        const { data } = await response.json();
        console.log(`✅ Found ${data.length} articles`);

        const articles = data.map(article => {
            const attrs = article.attributes || article;
            return {
                url: `/blog?slug=${attrs.slug || article.documentId || article.id}`,
                lastmod: attrs.updatedAt || new Date().toISOString(),
                priority: '0.7',
                changefreq: 'weekly'
            };
        });

        const allPages = [...staticPages, ...articles];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${SITEMAP_CONFIG.SITE_URL}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod.split('T')[0]}</lastmod>` : ''}
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

        return xml;

    } catch (error) {
        console.error('❌ Error generating sitemap:', error.message);

        // Generate sitemap with static pages only
        console.log('\n📄 Generating static-only sitemap...\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${SITEMAP_CONFIG.SITE_URL}${page.url}</loc>
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
