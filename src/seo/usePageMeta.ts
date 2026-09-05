/**
 * Head manager: applies unique title, meta description, canonical, Open Graph /
 * Twitter tags and per-page JSON-LD (WebPage + BreadcrumbList) on route change.
 * Idempotent — it updates existing tags in place rather than appending, so
 * navigating between routes never duplicates head elements.
 *
 * No dependency (react-helmet et al.) — this is ~40 lines of DOM.
 */
import { useEffect } from 'react'
import { PAGE_META, SITE_URL, SITE_NAME, SITE_DESCRIPTION, type PageMeta } from './siteConfig'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function usePageMeta(meta: PageMeta) {
  const url = SITE_URL + meta.path
  const image = `${SITE_URL}/og-image.png`

  useEffect(() => {
    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    upsertLink('canonical', url)

    // Open Graph
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} — ${meta.title}`)

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', image)

    // Per-page structured data: the page itself + breadcrumb trail.
    upsertJsonLd('ld-page', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': meta.pageType ?? 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: meta.title,
          description: meta.description,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: { '@id': `${SITE_URL}/#organization` },
          ...(meta.pageType === 'MedicalWebPage'
            ? { audience: { '@type': 'MedicalAudience', audienceType: 'Clinician' } }
            : {}),
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${url}#breadcrumb`,
          itemListElement: meta.breadcrumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: SITE_URL + c.path,
          })),
        },
      ],
    })
  }, [meta.title, meta.description, meta.path, meta.pageType, url, image, meta.breadcrumbs])
}

/** Convenience for the static pages that map 1:1 to PAGE_META keys. */
export function useStaticPageMeta(key: keyof typeof PAGE_META) {
  usePageMeta(PAGE_META[key])
}

export { SITE_DESCRIPTION }
