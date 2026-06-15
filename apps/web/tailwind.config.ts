import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Aurora" DeFi theme — dark slate + violet/blue primary, teal accent.
        bg: "#0a0b10",
        surface: "#14161f",
        surface2: "#1c1f2b",
        border: "#2a2f3d",
        primary: "#7c6cff",
        primaryHover: "#6a5af0",
        accent: "#2dd4a7",
        muted: "#8b93a7",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #7c6cff 0%, #5b8bff 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
