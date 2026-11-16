import { addDays } from "../../shared/utils/berlin-time.ts";
import { FIRST_FULL_DAY, SITE_URL } from "../../shared/utils/site.ts";

interface Page {
  de: string;
  en: string;
}

/** The pages to list: the start page, the methodology, and every complete day up to `lastDay`. */
export function sitemapPages(lastDay: string): Page[] {
  const pages: Page[] = [
    { de: "/", en: "/en" },
    { de: "/methodik", en: "/en/methodology" },
  ];
  for (let day = lastDay; day >= FIRST_FULL_DAY; day = addDays(day, -1)) {
    pages.push({ de: `/tag/${day}`, en: `/en/day/${day}` });
  }
  return pages;
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A sitemap with one entry per page and language, each naming its
 * counterpart in the other language, as search engines expect for hreflang.
 */
export function sitemapXml(pages: Page[]): string {
  const url = (path: string) => escape(`${SITE_URL}${path === "/" ? "" : path}`);
  const entries = pages.flatMap((page) =>
    [page.de, page.en].map(
      (path) => `  <url>
    <loc>${url(path)}</loc>
    <xhtml:link rel="alternate" hreflang="de-DE" href="${url(page.de)}"/>
    <xhtml:link rel="alternate" hreflang="en-GB" href="${url(page.en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(page.de)}"/>
  </url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}
