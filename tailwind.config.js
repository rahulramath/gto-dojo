/** @type {import('tailwindcss').Config} */
const inter = ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"];

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: inter,
        display: inter,
        mono: inter,
      },
      colors: {
        ink: {
          950: "#070a09",
          900: "#0b100e",
          850: "#0f1512",
          800: "#131b17",
          750: "#18221d",
          700: "#1e2a24",
          600: "#2a3a32",
          500: "#3d5147",
          400: "#6b8177",
          300: "#98aba1",
          200: "#c6d3cc",
          100: "#e7eeea",
        },
        felt: {
          900: "#06301f",
          800: "#0a3d28",
          700: "#0e4d33",
          600: "#125f3f",
          500: "#17744d",
          400: "#1f8f5f",
        },
        gold: {
          600: "#b8891f",
          500: "#d9a52c",
          400: "#f2c14e",
          300: "#f7d67f",
          200: "#fbe7b0",
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -16px rgba(0,0,0,0.7)",
        felt: "inset 0 0 48px rgba(0,0,0,0.5), 0 16px 48px -24px rgba(0,0,0,0.8)",
        sheet: "0 -16px 48px -16px rgba(0,0,0,0.8)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        sheetUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        deal: {
          "0%": { transform: "translateY(-16px) scale(0.95)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(242,193,78,0.7)" },
          "100%": { boxShadow: "0 0 0 8px rgba(242,193,78,0)" },
        },
        confetti: {
          "0%": { transform: "translate3d(0,0,0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translate3d(var(--dx), 110vh, 0) rotate(var(--rot))", opacity: "0.9" },
        },
      },
      animation: {
        pop: "pop 240ms cubic-bezier(.2,.9,.3,1.1) both",
        fadeUp: "fadeUp 240ms ease-out both",
        sheetUp: "sheetUp 280ms cubic-bezier(.2,.8,.2,1) both",
        deal: "deal 320ms cubic-bezier(.2,.8,.2,1) both",
        shake: "shake 320ms ease-in-out",
        pulseRing: "pulseRing 1.4s ease-out infinite",
        confetti: "confetti var(--dur) cubic-bezier(.2,.6,.4,1) forwards",
      },
    },
  },
  plugins: [],
};
