import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TODOS_LOS_ARTICULOS } from '../src/data/articulos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')
const SITE_URL = process.env.SITE_URL || 'https://tibumetrico.com'

const baseHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8')

function escaparHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inyectarSeoEnHtml(html, { title, description, canonical, type = 'website', jsonLd = null }) {
  let out = html
    .replace(/<title>.*?<\/title>/s, `<title>${escaparHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="description" content="${escaparHtml(description)}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/s,
      `<link rel="canonical" href="${escaparHtml(canonical)}" />`
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:type" content="${escaparHtml(type)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:title" content="${escaparHtml(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:description" content="${escaparHtml(description)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/s,
      `<meta property="og:url" content="${escaparHtml(canonical)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="twitter:title" content="${escaparHtml(title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s,
      `<meta name="twitter:description" content="${escaparHtml(description)}" />`
    )

  if (jsonLd) {
    const ldScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`
    out = out.replace('</head>', ldScript)
  }
  return out
}

function escribirPagina(rutaRelativa, meta) {
  const dirDestino = path.join(DIST_DIR, rutaRelativa)
  fs.mkdirSync(dirDestino, { recursive: true })
  fs.writeFileSync(path.join(dirDestino, 'index.html'), inyectarSeoEnHtml(baseHtml, meta), 'utf-8')
}

// 1. Paginas principales (/lvbp y /caribe)
escribirPagina('lvbp', {
  title: 'Power Ranking LVBP, WPA 2026 & Importados · TIBUMÉTRICO',
  description:
    'Tabla sabermétrica completa de la LVBP: Power Ranking 0-100, WPA acumulado, WPA/LI, filtro de importados y expedientes multi-liga.',
  canonical: `${SITE_URL}/lvbp`,
})

escribirPagina('caribe', {
  title: 'Power Ranking Serie del Caribe (4 Ligas) & Simulador · TIBUMÉTRICO',
  description:
    'Ranking unificado de las 32 franquicias de LVBP, LIDOM, LMP y LBPRC bajo una misma escala y simulador de duelos interligas.',
  canonical: `${SITE_URL}/caribe`,
})

// 2. Una pagina pre-renderizada por cada articulo (/articulo/<slug>)
const urlsSitemap = [
  { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
  { loc: `${SITE_URL}/lvbp`, priority: '0.9', changefreq: 'daily' },
  { loc: `${SITE_URL}/caribe`, priority: '0.9', changefreq: 'daily' },
]

for (const art of TODOS_LOS_ARTICULOS) {
  const canonical = `${SITE_URL}/articulo/${art.slug}`
  const description = art.seoDescription || art.bajada
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: art.titulo,
    description,
    datePublished: art.fechaISO || '2026-11-26',
    author: {
      '@type': 'Person',
      name: art.autor,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TIBUMÉTRICO',
    },
    mainEntityOfPage: canonical,
    keywords: art.keywords || '',
  }

  escribirPagina(path.join('articulo', art.slug), {
    title: `${art.titulo} · TIBUMÉTRICO`,
    description,
    canonical,
    type: 'article',
    jsonLd,
  })

  urlsSitemap.push({
    loc: canonical,
    lastmod: art.fechaISO || '2026-11-26',
    priority: '0.85',
    changefreq: 'weekly',
  })
}

// 3. Generar sitemap.xml y robots.txt
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsSitemap
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8')

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8')

console.log(`[SEO] Generadas ${TODOS_LOS_ARTICULOS.length} paginas de articulos + sitemap.xml y robots.txt`)

// Ruta estatica /publicar (oculta para buscadores)
const _fsPub = await import('node:fs')
_fsPub.mkdirSync('dist/publicar', { recursive: true })
const _htmlPub = _fsPub
  .readFileSync('dist/index.html', 'utf-8')
  .replace('content="index, follow"', 'content="noindex, nofollow"')
_fsPub.writeFileSync('dist/publicar/index.html', _htmlPub, 'utf-8')
console.log('[SEO] Ruta /publicar generada (noindex)')
