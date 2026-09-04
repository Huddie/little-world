export function mockR2Image(pointer: string): string {
  const seed = pointer.split("/").at(-1)?.replace(/\.[a-z]+$/i, "") ?? "little-world";
  const label = seed.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const hue = hash(seed) % 360;

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 650">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 65%, 86%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 55) % 360}, 72%, 92%)"/>
        </linearGradient>
      </defs>
      <rect width="900" height="650" rx="44" fill="url(#bg)"/>
      <circle cx="220" cy="190" r="90" fill="rgba(255,255,255,.45)"/>
      <circle cx="690" cy="155" r="62" fill="rgba(255,255,255,.35)"/>
      <path d="M110 520 C240 405 325 460 445 365 C555 278 705 340 790 250 L790 650 L110 650 Z" fill="rgba(58,82,51,.23)"/>
      <path d="M160 505 C280 430 360 485 465 405 C575 318 690 365 755 302" fill="none" stroke="rgba(58,82,51,.32)" stroke-width="20" stroke-linecap="round"/>
      <text x="450" y="315" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="800" fill="#22311f">${escapeSvg(label)}</text>
      <text x="450" y="372" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#3e5934">Mock R2 image</text>
    </svg>
  `)}`;
}

function hash(value: string): number {
  return [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function escapeSvg(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
