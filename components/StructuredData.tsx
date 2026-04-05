/**
 * StructuredData — JSON-LD Digital Passport
 *
 * Iniettato nel <head> via layout.tsx.
 * Copre: Organization + OnlineStore, WebSite (Sitelinks SearchBox), ItemList.
 * Renderizzato server-side → zero JS bundle impact.
 */
export default function StructuredData() {
  const graph = [
    // ── Organization + OnlineStore ─────────────────────────────────────────
    {
      '@type': ['Organization', 'OnlineStore'],
      '@id':   'https://kitwer26.com/#organization',
      name:    'KITWER26',
      url:     'https://kitwer26.com',
      logo: {
        '@type':   'ImageObject',
        '@id':     'https://kitwer26.com/#logo',
        url:       'https://kitwer26.com/icon.png',
        width:     512,
        height:    512,
        caption:   'KITWER26',
      },
      image: { '@id': 'https://kitwer26.com/#logo' },
      description:
        'Protocolli di sicurezza e asset hardware per operazioni ad alta precisione.',
      slogan:   "Asset di Sicurezza e Tecnologia d'Élite",
      areaServed: ['IT', 'DE', 'FR', 'ES', 'US'],
      foundingLocation: { '@type': 'Country', name: 'Italia' },
      knowsAbout: [
        'Tactical Gear',
        'Night Vision Technology',
        'Stealth Computing',
        'Security Assets',
        'Hardware Wallet',
        'Crypto Protection',
        'Sim Racing',
        'Energy Resilience',
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name:    "Catalogo Asset d'Élite KITWER26",
        url:     'https://kitwer26.com',
      },
      contactPoint: {
        '@type':           'ContactPoint',
        contactType:       'customer support',
        availableLanguage: ['Italian', 'English'],
        url:               'https://kitwer26.com',
      },
    },

    // ── WebSite — Sitelinks SearchBox ──────────────────────────────────────
    {
      '@type':     'WebSite',
      '@id':       'https://kitwer26.com/#website',
      url:         'https://kitwer26.com',
      name:        'KITWER26',
      description: "Protocolli di Sicurezza & Asset d'Élite",
      publisher:   { '@id': 'https://kitwer26.com/#organization' },
      inLanguage:  ['it-IT', 'en-US', 'de-DE', 'fr-FR', 'es-ES'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type':     'EntryPoint',
          urlTemplate: 'https://kitwer26.com/?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },

    // ── ItemList — categorie per rich results Google ───────────────────────
    {
      '@type': 'ItemList',
      '@id':   'https://kitwer26.com/#product-categories',
      name:    "Categorie Asset d'Élite",
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hardware Wallet',        url: 'https://kitwer26.com/#security'   },
        { '@type': 'ListItem', position: 2, name: 'Faraday Bag & EMP Shield', url: 'https://kitwer26.com/#privacy'   },
        { '@type': 'ListItem', position: 3, name: "Sim Racing d'Élite",     url: 'https://kitwer26.com/#simracing'  },
        { '@type': 'ListItem', position: 4, name: 'Visione Notturna',       url: 'https://kitwer26.com/#tactical'   },
        { '@type': 'ListItem', position: 5, name: 'Bundle Esclusivi',       url: 'https://kitwer26.com/#bundles'    },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
