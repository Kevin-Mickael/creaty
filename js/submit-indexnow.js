/**
 * IndexNow Submitter for Creaty
 * Submits latest URLs to Bing/Yandex for instant indexing.
 * 
 * Usage: node js/submit-indexnow.js
 */

const https = require('https');

const CONFIG = {
    API_KEY: 'e8ab9a7677354c19a19f8defdb440706',
    SITE_URL: 'https://creatymu.org',
    STRAPI_API: 'https://admin.creatymu.org/api',
    SEARCH_ENGINE_ENDPOINT: 'ssl.bing.com' // IndexNow shared endpoint
};

async function getRecentUrls() {
    // 1. Always submit static pages
    const urls = [
        `${CONFIG.SITE_URL}/`,
        `${CONFIG.SITE_URL}/news`,
        `${CONFIG.SITE_URL}/legal`
    ];

    try {
        // 2. Fetch from Strapi (using native fetch in Node 18+)
        console.log('🔄 Fetching latest articles from Strapi...');
        const response = await fetch(`${CONFIG.STRAPI_API}/articles?sort[0]=updatedAt:desc&pagination[limit]=10&fields[0]=slug`);

        if (response.ok) {
            const { data } = await response.json();
            data.forEach(article => {
                // Use the clean URL format we established
                const slug = article.attributes?.slug || article.slug;
                urls.push(`${CONFIG.SITE_URL}/blog?slug=${slug}`);
            });
            console.log(`✅ Found ${data.length} recent articles.`);
        }
    } catch (error) {
        console.error('⚠️ Could not fetch articles (strapi might be down), submitting static pages only.');
    }

    return urls;
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

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);

        if (res.statusCode === 200 || res.statusCode === 202) {
            console.log('✅ Success! URLs submitted for indexing.');
        } else {
            console.log('❌ Error submitting to IndexNow.');
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            // console.log(`BODY: ${chunk}`); // Usually empty on success
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
    const urls = await getRecentUrls();
    submitToIndexNow(urls);
})();
