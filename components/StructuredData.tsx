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
        'Hardware Wallet',
        'Crypto Protection',
        'FPV Drones',
        'Sim Racing',
        'Cyber Security',
        'Privacy Tools',
        'YubiKey',
        'VPN Router',
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name:    'Catalogo Selezione di Punta KITWER26',
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
          urlTemplate: 'https://kitwer26.com/?cat={search_term_string}',
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
        { '@type': 'ListItem', position: 1, name: 'Crypto Wallets', url: 'https://kitwer26.com/?cat=Crypto+Wallets' },
        { '@type': 'ListItem', position: 2, name: 'FPV Drones',     url: 'https://kitwer26.com/?cat=FPV+Drones'    },
        { '@type': 'ListItem', position: 3, name: 'Sim Racing',     url: 'https://kitwer26.com/?cat=Sim+Racing'    },
        { '@type': 'ListItem', position: 4, name: 'Cyber Security', url: 'https://kitwer26.com/?cat=Cyber+Security'},
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
