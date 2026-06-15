export function SkipToContent({ contentId = "main-content" }: { contentId?: string }) {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-white focus:no-underline"
    >
      Přeskočit na hlavní obsah
    </a>
  );
}
