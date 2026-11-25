/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#14352a", 2: "#1f4d3c", deep: "#0e261e" },
        gold: { DEFAULT: "#c9a45c", 2: "#b48e45", light: "#d6b36e" },
        ivory: { DEFAULT: "#faf6ee", 2: "#f2ecdf" },
        line: "#e4dccb",
      },
      fontFamily: { serif: ['"Cormorant Garamond"', "Georgia", "serif"], sans: ["Inter", "system-ui", "sans-serif"] },
      boxShadow: { soft: "0 10px 30px rgba(20,53,42,.10)" },
    },
  },
  plugins: [],
};
