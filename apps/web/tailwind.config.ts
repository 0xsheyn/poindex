import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e13",
        surface: "#141922",
        surface2: "#1c232f",
        border: "#2a3340",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        muted: "#8b98a9",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
