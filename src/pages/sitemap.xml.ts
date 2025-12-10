import type { APIRoute } from 'astro';

const routes = ['/', '/company', '/services', '/industries', '/careers', '/contact-us'];

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href ?? '';
  const urls = routes
    .map((p) => `  <url>\n    <loc>${base.replace(/\/$/, '')}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.7'}</priority>\n  </url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
};

