/**
 * IndexNow Submitter for Creaty
 * Submits latest URLs to Bing/Yandex for instant indexing.
 * 
 * Usage: node js/submit-indexnow.js
 */

const https = require('https');
const http = require('http');

const CONFIG = {
    API_KEY: 'e8ab9a7677354c19a19f8defdb440706',
    SITE_URL: 'https://creatymu.org',
    STRAPI_API: 'https://admin.creatymu.org/api',
    SEARCH_ENGINE_ENDPOINT: 'ssl.bing.com' // IndexNow shared endpoint
};

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

async function getRecentUrls() {
    // 1. Always submit static pages
    const urls = [
        `${CONFIG.SITE_URL}/`,
        `${CONFIG.SITE_URL}/news/`,
        `${CONFIG.SITE_URL}/legal/`
    ];

    try {
        // 2. Fetch from Strapi (using native fetch in Node 18+)
        console.log('🔄 Fetching latest articles from Strapi...');
        const response = await fetchUrl(`${CONFIG.STRAPI_API}/articles?sort[0]=updatedAt:desc&pagination[limit]=10&fields[0]=slug`);

        if (response.ok) {
            const articles = response.data.data;
            articles.forEach(article => {
                // Use the new clean URL format with /articles/slug/
                const slug = article.attributes?.slug || article.slug;
                if (slug) {
                    urls.push(`${CONFIG.SITE_URL}/articles/${slug}/`);
                }
            });
            console.log(`✅ Found ${articles.length} recent articles.`);
        }
    } catch (error) {
        console.error('⚠️ Could not fetch articles (Strapi might be down), submitting static pages only.');
        console.error('   Error:', error.message);
    }

    return [...new Set(urls)];
}

function submitToIndexNow(urlList) {
    const data = JSON.stringify({
        host: "creatymu.org",
        key: CONFIG.API_KEY,
        keyLocation: `${CONFIG.SITE_URL}/${CONFIG.API_KEY}.txt`,
        urlList: urlList
    });

    const options = {
        hostname: 'api.indexnow.org',
        port: 443,
        path: '/indexnow',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': data.length
        }
    };

    console.log(`🚀 Submitting ${urlList.length} URLs to IndexNow...`);
    console.log('   URLs:', urlList);

    const req = https.request(options, (res) => {
        console.log(`\n📡 Response Status: ${res.statusCode}`);

        if (res.statusCode === 200 || res.statusCode === 202) {
            console.log('✅ Success! URLs submitted for indexing.');
            console.log('   Bing and Yandex will process these URLs shortly.');
        } else if (res.statusCode === 400) {
            console.log('❌ Bad Request - Check URL format and API key.');
        } else if (res.statusCode === 422) {
            console.log('❌ Unprocessable Entity - URL might not match the host.');
        } else {
            console.log('❌ Error submitting to IndexNow.');
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            if (chunk.trim()) {
                console.log(`   Body: ${chunk}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Request error: ${e.message}`);
    });

    req.write(data);
    req.end();
}

// Main execution
(async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 IndexNow URL Submitter for Creaty');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const urls = await getRecentUrls();
    submitToIndexNow(urls);
})();
