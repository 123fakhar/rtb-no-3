/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        surface: {
          50: "#ffffff",
          100: "#f8fafc",
          200: "#f1f5f9",
          300: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 20px 40px -15px rgba(37, 99, 235, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)",
        glow: "0 0 25px -5px rgba(37, 99, 235, 0.25)",
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        popover: "0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
