/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6C63FF",
          light: "#8B84FF",
          dark: "#544CD6",
          50: "#F0EEFF",
          100: "#E0DDFF",
          200: "#C2BBFF",
        },
        gold: {
          DEFAULT: "#F5A623",
          light: "#FFD166",
          dark: "#D48E1A",
        },
        success: {
          DEFAULT: "#22C55E",
          light: "#4ADE80",
          dark: "#16A34A",
        },
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        sidebar: {
          DEFAULT: "rgb(var(--color-sidebar) / <alpha-value>)",
          hover: "rgb(var(--color-sidebar-hover) / <alpha-value>)",
          active: "rgb(var(--color-sidebar-active) / <alpha-value>)",
          text: "rgb(var(--color-sidebar-text) / <alpha-value>)",
        },
        muted: "#8E92A4",
        border: "rgb(var(--color-border) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(108, 99, 255, 0.06)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        elevated: "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        pop: "0 8px 30px rgba(108, 99, 255, 0.14)",
        gold: "0 4px 16px rgba(245, 166, 35, 0.25)",
        glow: "0 0 20px rgba(108, 99, 255, 0.15)",
        sidebar: "2px 0 12px rgba(0,0,0,0.08)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
        xl4: "1.5rem",
      },
      maxWidth: {
        content: "1400px",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: 0, transform: "translateX(-16px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
      animation: {
        floaty: "floaty 3s ease-in-out infinite",
        popIn: "popIn 0.3s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        fadeUp: "fadeUp 0.4s ease-out",
        slideInLeft: "slideInLeft 0.3s ease-out",
        scaleIn: "scaleIn 0.2s ease-out",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      spacing: {
        sidebar: "260px",
        "sidebar-collapsed": "72px",
        topbar: "64px",
        "mobile-nav": "72px",
      },
    },
  },
  plugins: [],
};
