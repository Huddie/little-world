import type { StoryManuscript } from "../../ai/story/schemas";

export function renderBookHtml(input: {
  title: string;
  collectionName: string;
  episodeNumber: number;
  manuscript: StoryManuscript;
  illustrations?: Record<number, string>;
  collection: Array<{ episodeNumber: number; title: string }>;
}): string {
  const pages = input.manuscript.pages
    .map(
      (page) => `
        <section class="page">
          ${input.illustrations?.[page.pageNumber + 1] ? `<img class="illustration" src="${input.illustrations[page.pageNumber + 1]}" alt="">` : `<div class="illustration"></div>`}
          <p>${escapeHtml(page.text)}</p>
        </section>`
    )
    .join("");
  const collection = input.collection
    .map((episode) => `<li>Episode ${episode.episodeNumber} - ${escapeHtml(episode.title)}</li>`)
    .join("");
  const coverArt = input.illustrations?.[1] ? `<img class="cover-art" src="${input.illustrations[1]}" alt="">` : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
@page { size: Letter; margin: 0.5in; }
body { color: #244536; font-family: Georgia, serif; margin: 0; background: #fffaf0; }
.cover, .page, .collection { break-after: page; min-height: 9.8in; display: flex; flex-direction: column; justify-content: center; }
.cover { text-align: center; background: #dff1df; border-radius: 18px; padding: 0.5in; }
.cover-art { height: 5.8in; width: 100%; object-fit: cover; border-radius: 22px; margin-bottom: 0.35in; }
h1 { font-size: 42px; margin: 0 0 12px; }
h2 { font-size: 20px; margin: 0; color: #53645c; }
.illustration { height: 4.8in; width: 100%; object-fit: cover; border-radius: 18px; background: linear-gradient(145deg, #183c4b, #f0c76b); margin-bottom: 0.35in; }
p { font-size: 24px; line-height: 1.45; }
li { font-size: 18px; margin: 8px 0; }
</style>
</head>
<body>
<section class="cover">${coverArt}<h1>${escapeHtml(input.title)}</h1><h2>${escapeHtml(input.collectionName)} - Episode ${input.episodeNumber}</h2></section>
${pages}
<section class="collection"><h1>${escapeHtml(input.collectionName)}</h1><ul>${collection}</ul><p>Episode ${input.episodeNumber + 1} coming next month...</p></section>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
