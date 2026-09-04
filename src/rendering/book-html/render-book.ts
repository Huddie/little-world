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
          <p class="story-text">${formatStoryText(page.text)}</p>
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
@page { size: Letter; margin: 0.4in; }
* { box-sizing: border-box; }
body { color: #244536; font-family: Georgia, serif; margin: 0; background: #fffaf0; }
.cover, .page, .collection {
  break-after: page;
  page-break-after: always;
  height: 10.2in;
  max-height: 10.2in;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cover {
  justify-content: center;
  text-align: center;
  background: #dff1df;
  border: 2px solid #c9e4c7;
  border-radius: 22px;
  padding: 0.3in;
}
.cover-art {
  height: 6.05in;
  width: 100%;
  object-fit: cover;
  object-position: center 62%;
  border-radius: 20px;
  margin-bottom: 0.28in;
}
h1 { font-size: 38px; line-height: 1.08; margin: 0 0 10px; }
h2 { font-size: 18px; margin: 0; color: #53645c; }
.page {
  justify-content: flex-start;
  padding: 0.05in 0;
}
.illustration {
  flex: 0 0 auto;
  height: 5.95in;
  width: 100%;
  object-fit: cover;
  border-radius: 20px;
  background: linear-gradient(145deg, #dff1df, #f0c76b);
  margin-bottom: 0.28in;
}
.story-text {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: #244536;
  font-size: 22px;
  line-height: 1.34;
  text-align: center;
  white-space: normal;
}
.collection {
  break-after: auto;
  page-break-after: auto;
  justify-content: center;
  padding: 0.5in;
  border-radius: 22px;
  background: #f7efd4;
}
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

function formatStoryText(value: string): string {
  return escapeHtml(value).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}
