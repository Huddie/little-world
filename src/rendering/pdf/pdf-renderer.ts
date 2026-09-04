import puppeteer from "@cloudflare/puppeteer";

export interface PdfRenderer {
  render(html: string): Promise<Uint8Array>;
}

export class BrowserPdfRenderer implements PdfRenderer {
  constructor(private readonly browserBinding: Fetcher) {}

  async render(html: string): Promise<Uint8Array> {
    const browser = await puppeteer.launch(this.browserBinding);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate("document.fonts && document.fonts.ready");
      const pdf = await page.pdf({ format: "letter", printBackground: true });
      return new Uint8Array(pdf);
    } finally {
      await browser.close();
    }
  }
}
