import type { Config } from "tailwindcss";

export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        moss: {
          50: "#f3f8eb",
          100: "#deedc7",
          200: "#c7e1a0",
          300: "#b8df80",
          500: "#78b84f",
          600: "#4f913d",
          700: "#357234",
          800: "#285b32",
          900: "#193b29",
        },
        moon: {
          50: "#eef8fc",
          100: "#d5eef9",
          200: "#aee0f4",
          300: "#88d7ff",
          400: "#45b9e8",
          700: "#1f719b",
          900: "#123f59",
        },
        honey: {
          50: "#fff8df",
          100: "#ffefb5",
          300: "#ffd45a",
          500: "#e6a928",
        },
        petal: {
          50: "#fff4ef",
          100: "#ffe3d8",
          300: "#ffa985",
          500: "#ec7653",
          700: "#b84f37",
        },
      },
      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Baloo 2", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        story: ["Baloo 2", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        whimsy: ["Atma", "Baloo 2", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        storySerif: ["Merriweather", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 18px 44px rgba(18, 63, 89, 0.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;
