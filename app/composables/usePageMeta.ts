import { SITE_URL } from "#shared/utils/site";

interface PageMeta {
  title: () => string;
  description: () => string;
  /**
   * A schema.org object describing the page's data, embedded as JSON-LD.
   * Search engines read it; people do not see it.
   */
  structuredData?: () => Record<string, unknown>;
}

/**
 * Title, description, link preview and structured data of a page. The
 * language-specific links (canonical, hreflang, og:locale) come from the
 * i18n module in app.vue.
 */
export function usePageMeta(meta: PageMeta) {
  const route = useRoute();
  const { t } = useI18n();
  const url = () => `${SITE_URL}${route.path === "/" ? "" : route.path}`;

  useSeoMeta({
    title: meta.title,
    description: meta.description,
    ogTitle: meta.title,
    ogDescription: meta.description,
    ogType: "website",
    ogSiteName: "Stromfenster",
    ogUrl: url,
    ogImage: `${SITE_URL}/og.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => t("share.imageAlt"),
    twitterCard: "summary_large_image",
  });

  if (meta.structuredData) {
    const data = meta.structuredData;
    useHead({
      script: [
        {
          key: "structured-data",
          type: "application/ld+json",
          // "<" is escaped so the JSON cannot close the script element.
          innerHTML: () => JSON.stringify(data()).replace(/</g, "\\u003c"),
        },
      ],
    });
  }
}

/** A schema.org Dataset for the data a page shows. */
export function datasetJsonLd(options: {
  name: string;
  description: string;
  url: string;
  language: string;
  temporalCoverage: string;
  variables: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: options.name,
    description: options.description,
    url: options.url,
    inLanguage: options.language,
    isAccessibleForFree: true,
    spatialCoverage: { "@type": "Place", name: "Germany" },
    temporalCoverage: options.temporalCoverage,
    variableMeasured: options.variables,
    isBasedOn: {
      "@type": "Dataset",
      name: "SMARD Strommarktdaten",
      url: "https://www.smard.de",
      creator: { "@type": "GovernmentOrganization", name: "Bundesnetzagentur" },
      license: "https://creativecommons.org/licenses/by/4.0/",
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: "https://stromfenster.plan-werk.workers.dev/",
    },
  };
}
