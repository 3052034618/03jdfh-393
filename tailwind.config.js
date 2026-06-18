/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: {
          primary: "#0f0f12",
          secondary: "#1a1a1f",
          tertiary: "#23232b",
          elevated: "#2a2a35",
        },
        accent: {
          crimson: "#8b2635",
          crimsonLight: "#a83044",
          gold: "#c9a962",
          goldLight: "#dbbf7d",
        },
        emotion: {
          unease: "#4f6d9e",
          doubt: "#7c6b99",
          oppression: "#8b2635",
          relief: "#5a8a6b",
        },
        text: {
          primary: "#e8e6e3",
          secondary: "#a8a4a0",
          muted: "#6b6865",
        },
        border: {
          subtle: "#2e2e38",
          strong: "#3d3d4a",
        },
        status: {
          critical: "#c93d4f",
          high: "#d97a3a",
          medium: "#c9a962",
          low: "#5a8a6b",
        },
      },
      fontFamily: {
        display: ["'BIZ UDPMincho'", "'Noto Serif SC'", "'Cormorant Garamond'", "serif"],
        mono: ["'JetBrains Mono'", "'Roboto Mono'", "monospace"],
        sans: ["'Inter'", "'Noto Sans SC'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        crimsonGlow: "0 0 20px rgba(139, 38, 53, 0.4)",
        goldGlow: "0 0 20px rgba(201, 169, 98, 0.3)",
        insetCrimson: "inset 0 0 30px rgba(139, 38, 53, 0.15)",
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
      animation: {
        pulseSlow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fadeIn: "fadeIn 0.5s ease-out forwards",
        slideUp: "slideUp 0.4s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
