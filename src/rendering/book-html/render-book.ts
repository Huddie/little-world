import type { StoryManuscript } from "../../ai/story/schemas";

export function renderBookHtml(input: {
  title: string;
  collectionName: string;
  episodeNumber: number;
  manuscript: StoryManuscript;
  illustrations?: Record<number, string>;
  cast?: Array<{ name: string; portraitUrl?: string | null }>;
  collection: Array<{ episodeNumber: number; title: string }>;
}): string {
  const typography = typographyTheme(input.manuscript.typography ?? "storybook");
  const pages = input.manuscript.pages
    .map(
      (page) => `
        <section class="page">
          ${input.illustrations?.[page.pageNumber + 1] ? `<img class="illustration" src="${input.illustrations[page.pageNumber + 1]}" alt="">` : `<div class="illustration"></div>`}
          <div class="story-panel">
            <p class="story-text ${storyTextDensity(page.text)}">${formatStoryText(page.text)}</p>
          </div>
        </section>`
    )
    .join("");
  const cast = (input.cast ?? [])
    .map((character) => `
      <li class="cast-member">
        ${character.portraitUrl ? `<img class="cast-portrait" src="${character.portraitUrl}" alt="">` : `<div class="cast-portrait"></div>`}
        <span>${escapeHtml(character.name)}</span>
      </li>`)
    .join("");
  const coverArt = input.illustrations?.[1] ? `<img class="cover-art" src="${input.illustrations[1]}" alt="">` : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Atma:wght@600;700&family=Baloo+2:wght@600;700;800&family=Merriweather:wght@400;700;900&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
<style>
@page { size: Letter; margin: 0.4in; }
* { box-sizing: border-box; }
body { color: #244536; font-family: ${typography.body}; margin: 0; background: #fffaf0; }
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
h1 { font-family: ${typography.heading}; font-size: 38px; line-height: 1.08; margin: 0 0 10px; }
h2 { font-size: 18px; margin: 0; color: #53645c; }
.page {
  justify-content: flex-start;
  padding: 0.06in 0.18in 0.12in;
}
.illustration {
  flex: 0 0 auto;
  height: 5.72in;
  width: 100%;
  object-fit: cover;
  border-radius: 20px;
  background: linear-gradient(145deg, #dff1df, #f0c76b);
  margin-bottom: 0.24in;
}
.story-panel {
  flex: 1 1 auto;
  min-height: 3.3in;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.22in 0.34in;
  border: 1px solid #e4edd6;
  border-radius: 20px;
  background: rgba(255, 253, 246, 0.86);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75);
}
.story-text {
  max-width: 6.15in;
  margin: 0;
  color: #244536;
  font-size: 25px;
  line-height: 1.42;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}
.story-text-short {
  font-size: 27px;
  line-height: 1.42;
}
.story-text-long {
  font-size: 23px;
  line-height: 1.38;
}
.collection {
  break-after: auto;
  page-break-after: auto;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0.54in 0.42in;
  border-radius: 22px;
  background: #f7efd4;
}
.cast-list {
  display: grid;
  grid-template-columns: repeat(3, 1.62in);
  justify-content: center;
  column-gap: 0.36in;
  row-gap: 0.34in;
  list-style: none;
  margin: 0.44in 0 0;
  padding: 0;
}
.cast-member {
  width: 1.62in;
  min-height: 1.78in;
  color: #244536;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.2;
}
.cast-portrait {
  display: block;
  width: 1.12in;
  height: 1.12in;
  margin: 0 auto 0.14in;
  object-fit: cover;
  border: 5px solid #fffdf6;
  border-radius: 999px;
  background: linear-gradient(145deg, #dff1df, #f0c76b);
  box-shadow: 0 10px 28px rgba(36, 69, 54, 0.18);
}
</style>
</head>
<body>
<section class="cover">${coverArt}<h1>${escapeHtml(input.title)}</h1><h2>${escapeHtml(input.collectionName)} - Episode ${input.episodeNumber}</h2></section>
${pages}
<section class="collection"><h1>Story cast</h1><h2>${escapeHtml(input.collectionName)} - Episode ${input.episodeNumber}</h2><ul class="cast-list">${cast}</ul></section>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatStoryText(value: string): string {
  return escapeHtml(value).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}

function storyTextDensity(value: string): string {
  const length = value.trim().length;
  if (length <= 165) return "story-text-short";
  if (length >= 310) return "story-text-long";
  return "";
}

function typographyTheme(theme: StoryManuscript["typography"]) {
  const rounded = '"Baloo 2", "Nunito", "Trebuchet MS", Arial, sans-serif';
  const cozySerif = '"Merriweather", Georgia, "Times New Roman", serif';
  const playful = '"Atma", "Baloo 2", "Nunito", Arial, sans-serif';
  const clean = '"Nunito", "Avenir Next", "Trebuchet MS", Arial, sans-serif';
  const themes = {
    storybook: { body: rounded, heading: rounded },
    adventure: { body: clean, heading: clean },
    cozy: { body: cozySerif, heading: cozySerif },
    mystery: { body: cozySerif, heading: cozySerif },
    bedtime: { body: playful, heading: playful },
  } satisfies Record<StoryManuscript["typography"], { body: string; heading: string }>;
  return themes[theme] ?? themes.storybook;
}
