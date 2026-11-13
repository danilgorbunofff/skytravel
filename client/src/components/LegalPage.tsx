import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import { AppFooter } from "./AppFooter";
import { SkipToContent } from "./SkipToContent";
import { useLanguage } from "../hooks/useLanguage";

interface TocItem {
  id: string;
  label: string;
}

interface Props {
  title: string;
  children: ReactNode;
}

/**
 * Shell for long legal documents (GDPR, terms): the normal site header and footer, the
 * document title, then a table of contents built from the document's own <h2> headings so
 * each section is linkable.
 */
export function LegalPage({ title, children }: Props) {
  const { lang, t } = useLanguage();
  const docRef = useRef<HTMLDivElement | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);

  // The four language versions are hand-written JSX, so read the headings after render
  // instead of keeping a second, parallel list of section titles per language.
  useLayoutEffect(() => {
    const headings = docRef.current?.querySelectorAll("h2") ?? [];
    const items: TocItem[] = [];
    headings.forEach((heading, index) => {
      const id = `oddil-${index + 1}`;
      heading.id = id;
      items.push({ id, label: heading.textContent?.trim() ?? "" });
    });
    setToc(items);
  }, [lang]);

  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main-content" className="gdpr-page">
        <article className="gdpr-card">
          <h1>{title}</h1>
          {toc.length > 1 && (
            <nav className="legal-toc" aria-labelledby="legal-toc-title">
              <p id="legal-toc-title" className="legal-toc__title">
                {t("legalTocTitle")}
              </p>
              <ol>
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div ref={docRef} className="legal-doc">
            {children}
          </div>
        </article>
      </main>
      <AppFooter t={t} />
    </>
  );
}
