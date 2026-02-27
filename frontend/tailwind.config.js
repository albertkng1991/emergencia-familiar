/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#d32222",
        "bg-light": "#f8f6f6",
        "bg-dark": "#201212",
        "bg-dark-warm": "#3a1515",
        "text-primary": "#171212",
        "text-secondary": "#6b5d5d",
        "surface-light": "#ffffff",
        "surface-dark": "#2a1d1d",
        border: "#f4f0f0",
        "border-strong": "#e8e0e0",
        muted: "#f4f0f0",
        "muted-hover": "#ebe5e5",
        hover: "#faf8f8",
        "primary-tint": "#fdf5f5",
      },
      boxShadow: {
        warm: "0 1px 3px rgba(32,18,18,0.06), 0 1px 2px rgba(32,18,18,0.04)",
        "warm-md": "0 4px 12px rgba(32,18,18,0.08), 0 2px 4px rgba(32,18,18,0.04)",
        "warm-lg": "0 8px 24px rgba(32,18,18,0.10), 0 4px 8px rgba(32,18,18,0.05)",
      },
      fontFamily: {
        display: ['"Newsreader"', "serif"],
        body: ['"Noto Sans"', "sans-serif"],
        sans: ['"Noto Sans"', "sans-serif"],
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
