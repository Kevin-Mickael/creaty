/**
 * Creaty Automation Server
 * 
 * This server acts as the bridge between Strapi (Backend) and the Static Site (Frontend).
 * It listens for Webhooks from Strapi and triggers static page generation + SEO submission.
 * 
 * Features:
 * - Listens on port 3000
 * - Endpoint: POST /webhook/strapi
 * - Debounces requests (waits 10s after last update before regenerating) to save resources
 * - Triggered on: entry.create, entry.update, entry.publish, entry.unpublish
 */

const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Debounce configuration
let regenerationTimeout = null;
const DEBOUNCE_DELAY = 10000; // Wait 10 seconds after last event

// Helper to run scripts
const runScript = (scriptName) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'js', scriptName);
        console.log(`▶️  Running ${scriptName}...`);

        exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error running ${scriptName}:`, error.message);
                return reject(error);
            }
            if (stderr) {
                // Determine if it's just a warning or error
                // console.warn(`⚠️  Stderr from ${scriptName}:`, stderr);
            }
            console.log(stdout);
            resolve(stdout);
        });
    });
};

// Regeneration Workflow
const triggerRegeneration = async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 STARTING AUTOMATED REGENERATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // 1. Generate Static HTML Pages for Articles
        await runScript('generate-static-blog.js');

        // 2. Update Sitemap is implicitly done by generate-static-blog.js, 
        //    but we run the dedicated sitemap script to be sure static pages are included
        //    (Actually generate-static-blog.js handles it all, so we can skip generate-sitemap.js if it's redundant)

        // 3. Submit to IndexNow (Instant SEO)
        await runScript('submit-indexnow.js');

        console.log('✅ REGENERATION COMPLETE! Site is up to date.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (err) {
        console.error('❌ REGENERATION FAILED:', err);
    }
};

// Webhook Endpoint
app.post('/webhook/strapi', (req, res) => {
    const event = req.body.event;
    const model = req.body.model;

    // Log the event
    console.log(`Query received: ${event} on ${model}`);

    // Filter relevant events
    // We only care about Articles being created, updated, published, or unpublished
    if (model !== 'article') {
        return res.status(200).send('Ignored: Not an article');
    }

    const relevantEvents = [
        'entry.create',
        'entry.update',
        'entry.publish',
        'entry.unpublish',
        'entry.delete'
    ];

    if (!relevantEvents.includes(event)) {
        return res.status(200).send(`Ignored: Event ${event} not relevant`);
    }

    console.log(`🔔 Relevant update detected: Article ${event}`);

    // Debounce logic
    if (regenerationTimeout) {
        clearTimeout(regenerationTimeout);
        console.log('⏳ New update received, resetting timer...');
    }

    regenerationTimeout = setTimeout(() => {
        triggerRegeneration();
        regenerationTimeout = null;
    }, DEBOUNCE_DELAY);

    res.status(200).send('Webhook received. Regeneration queued.');
});

// Serve static files (Optional: allows you to preview the site on this port)
app.use(express.static(__dirname));

// Start Server
app.listen(PORT, () => {
    console.log(`
🤖 Creaty Automation Server is Running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
guilening on: http://localhost:${PORT}
Webhook URL:  http://localhost:${PORT}/webhook/strapi

👉 Go to your Strapi Admin Panel > Settings > Webhooks
   Create a new Webhook:
   - Name: Creaty Automation
   - Url: http://localhost:${PORT}/webhook/strapi
   - Events: Select all Entry events (Create, Update, Delete, Publish, Unpublish)
   
   To test, publish an article in Strapi!
`);

    // Initial generation on startup (optional)
    // triggerRegeneration();
});
