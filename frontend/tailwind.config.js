/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#0B1630", 900: "#10204A", 800: "#1B2D63", 700: "#2A3F7E" },
        indigo: { 50: "#EEF0FF", 100: "#E0E4FF", 500: "#5B63E6", 600: "#4B52D4", 700: "#3C42B3" },
        mint: { 50: "#ECFBF5", 100: "#D3F6E7", 500: "#2FBF8F", 600: "#1E9F74", 700: "#167A59" },
        warm: { 50: "#FFFCF7", 100: "#FAF6EE", 200: "#F0E9DB" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], display: ["Plus Jakarta Sans", "Inter", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(16,32,74,.06), 0 8px 24px -12px rgba(16,32,74,.14)" },
      keyframes: {
        fadeUp: { "0%": { opacity: 0, transform: "translateY(6px)" }, "100%": { opacity: 1, transform: "none" } },
        slideIn: { "0%": { opacity: 0, transform: "translateX(16px)" }, "100%": { opacity: 1, transform: "none" } },
      },
      animation: { fadeUp: "fadeUp .35s ease-out both", slideIn: "slideIn .25s ease-out both" },
    },
  },
  plugins: [],
};
