/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
        act: {
          raise: "#ef4444",
          call: "#22c55e",
          fold: "#3b4a5c",
          check: "#14b8a6",
          allin: "#a855f7",
          limp: "#f59e0b",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(242,193,78,0.35), 0 8px 30px -8px rgba(242,193,78,0.35)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)",
        felt: "inset 0 0 60px rgba(0,0,0,0.55), 0 20px 60px -20px rgba(0,0,0,0.8)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "20%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-28px)", opacity: "0" },
        },
        fadeUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        deal: {
          "0%": { transform: "translateY(-30px) rotate(-8deg) scale(0.9)", opacity: "0" },
          "100%": { transform: "translateY(0) rotate(0) scale(1)", opacity: "1" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(242,193,78,0.7)" },
          "100%": { boxShadow: "0 0 0 10px rgba(242,193,78,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        confetti: {
          "0%": { transform: "translate3d(0,0,0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translate3d(var(--dx), 110vh, 0) rotate(var(--rot))", opacity: "0.9" },
        },
      },
      animation: {
        pop: "pop 320ms cubic-bezier(.2,.9,.3,1.2) both",
        rise: "rise 1.2s ease-out forwards",
        fadeUp: "fadeUp 280ms ease-out both",
        deal: "deal 380ms cubic-bezier(.2,.8,.2,1) both",
        shake: "shake 380ms ease-in-out",
        pulseRing: "pulseRing 1.4s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        confetti: "confetti var(--dur) cubic-bezier(.2,.6,.4,1) forwards",
      },
    },
  },
  plugins: [],
};
