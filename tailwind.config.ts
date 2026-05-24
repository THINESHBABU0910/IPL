import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ipl: {
          purple: "#2D1B69",
          gold: "#FFD700",
          dark: "#0A0A0A",
          card: "#1A1A1A",
          border: "#2A2A2A",
        },
        ref: {
          orange: "#F97316",
          gold: "#FFD700",
          green: "#22C55E",
          purple: "#A855F7",
          card: "#1A1A1A",
          bg: "#0A0A0A",
        },
      },
      animation: {
        "pulse-bid": "pulse-bid 1.5s ease-in-out infinite",
        "sold-in": "sold-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "pulse-bid": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(249,115,22,0.4)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 20px 10px rgba(249,115,22,0.2)" },
        },
        "sold-in": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
