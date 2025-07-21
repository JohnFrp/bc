import { getChannelInfo } from '../../lib/telegram'

export async function GET(Astro) {
  try {
    const request = Astro.request
    const url = new URL(request.url)
    
    // Get channel data with error handling
    const channel = await getChannelInfo(Astro, {
      before: Astro.params.cursor,
    }).catch(error => {
      console.error('Error fetching channel info:', error)
      return { posts: [] }
    })

    const posts = channel.posts || []
    
    // Generate XML with additional metadata
    const generateUrlEntry = (post) => {
      if (!post.id || !post.datetime) return ''
      
      const lastmod = new Date(post.datetime).toISOString()
      const loc = `${url.origin}/posts/${post.id}`
      
      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    ${post.changefreq ? `<changefreq>${post.changefreq}</changefreq>` : ''}
    ${post.priority ? `<priority>${post.priority}</priority>` : ''}
    ${post.images ? post.images.map(image => `
    <image:image>
      <image:loc>${url.origin}/static${image.url}</image:loc>
      ${image.title ? `<image:title>${image.title}</image:title>` : ''}
      ${image.caption ? `<image:caption>${image.caption}</image:caption>` : ''}
    </image:image>`).join('') : ''}
  </url>`
    }

    const xmlUrls = posts.map(generateUrlEntry).join('')

    // Proper XML declaration with namespace
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${xmlUrls}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
        'X-Sitemap-Version': '1.0',
        'X-Generated-At': new Date().toISOString()
      },
    })

  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>Failed to generate sitemap</message>
  <timestamp>${new Date().toISOString()}</timestamp>
</error>`, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  }
}
