import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#08080c",
        surface: "#111116",
        panel: "#18181f",
        accent: {
          DEFAULT: "#a1a1aa",
          soft: "#d4d4d8",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
