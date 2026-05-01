import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        agent: "hsl(var(--agent-pulse))",
        glass: "hsl(var(--glass))",
        // Kasane-Cosmos: Cyber-Noir (Dark Mode)
        "cyber-charcoal": "#050505",
        "neon-cyan": "#00F0FF",
        "electric-blue": "#0080FF",
        "neon-purple": "#B026FF",
        // Kasane-Cosmos: Foggy Future (Light Mode)
        "fog-white": "#F2F2F5",
        "fog-gray": "#E5E5EA",
        "pastel-purple": "#C7B8EA",
        "ocean-blue": "#A8D8EA",
        // Profit/Loss
        "profit-green": "#00FF88",
        "loss-red": "#FF3366",
      },
      fontFamily: {
        sans: ["Geist Sans", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "aurora-drift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(100px, 50px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "stagger-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rotate-cube": {
          "0%": { transform: "rotateX(0deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(360deg) rotateY(360deg)" },
        },
        "liquid-morph": {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "50%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
        },
        "float-3d": {
          "0%, 100%": { transform: "translateY(0px) translateZ(0px)" },
          "50%": { transform: "translateY(-20px) translateZ(10px)" },
        },
        "card-tilt": {
          "0%": { transform: "perspective(1000px) rotateX(0deg)" },
          "100%": { transform: "perspective(1000px) rotateX(-15deg)" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 20s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "stagger-in": "stagger-in 0.6s ease-out",
        "rotate-cube": "rotate-cube 20s linear infinite",
        "liquid-morph": "liquid-morph 8s ease-in-out infinite",
        "float-3d": "float-3d 6s ease-in-out infinite",
        "card-tilt": "card-tilt 0.3s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
