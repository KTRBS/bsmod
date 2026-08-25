const fs = require('fs');
const path = require('path');

const resourcesDir = path.join(__dirname, 'resources');
const templatePath = path.join(__dirname, 'template.html');
const sitemapPath = path.join(__dirname, 'sitemap.xml');

if (!fs.existsSync(templatePath)) {
    console.error('Error: template.html does not exist in the root directory.');
    process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf-8');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Sitemap header and root URL
let sitemapUrls = [
    `  <url>\n    <loc>https://ktr.brawlmods.com/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
];

fs.readdirSync(resourcesDir).forEach(codename => {
    const modDir = path.join(resourcesDir, codename);
    const jsonPath = path.join(modDir, 'version.json');
    
    if (!fs.existsSync(jsonPath)) return;

    try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // Format author names
        const authorsStr = data.authors && data.authors.length > 0
            ? data.authors.map(a => a.name).join(', ')
            : 'Unknown';

        // Title: Download {mod name} {version} by {author}
        const embedTitle = `Download ${data.name} v${data.version} by ${authorsStr}`;

        // Base Description
        let baseDesc = `Download ${data.name} v${data.version} by ${authorsStr} from ktr.brawlmods.com.`;

        // Read info_en.html if exists and append text
        const infoEnPath = path.join(modDir, 'info_en.html');
        if (fs.existsSync(infoEnPath)) {
            let infoHtml = fs.readFileSync(infoEnPath, 'utf-8');
            let cleanText = infoHtml
                .replace(/<[^>]*>?/gm, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (cleanText) {
                baseDesc += `\n\n${cleanText}`;
            }
        }

        // Truncate description to prevent Discord embed limit issues
        if (baseDesc.length > 300) {
            baseDesc = baseDesc.substring(0, 297) + '...';
        }

        // Fallback for ogImage
        const ogImageUrl = data.ogImage && data.ogImage.trim() !== ""
            ? data.ogImage
            : `https://ktr.brawlmods.com/resources/${codename}/icon.png`;

        // Replace placeholders
        let html = template
            .replace(/{{TITLE_NAME}}/g, embedTitle)
            .replace(/{{VERSION}}/g, data.version)
            .replace(/{{DESCRIPTION}}/g, baseDesc)
            .replace(/{{OG_IMAGE}}/g, ogImageUrl)
            .replace(/{{CODENAME}}/g, codename);

        // Create directory /mods/codename/ and write index.html
        const outputDir = path.join(__dirname, 'mods', codename);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, 'index.html'), html);

        // Add to Sitemap URLs
        sitemapUrls.push(`  <url>\n    <loc>https://ktr.brawlmods.com/mods/${codename}/</loc>\n    <lastmod>${data.lastUpdated || today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);

        console.log(`[Success] Generated /mods/${codename}/index.html`);
    } catch (e) {
        console.error(`[Error] Failed to process ${codename}:`, e);
    }
});

// Generate sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n\n')}\n</urlset>`;
fs.writeFileSync(sitemapPath, sitemapContent);
console.log('[Success] Generated sitemap.xml');
