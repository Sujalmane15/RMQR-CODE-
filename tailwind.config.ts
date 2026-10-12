import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0b1528",
          800: "#13233f",
          700: "#1e3458",
          600: "#2a4674",
        },
        brand: {
          emerald: "#10b981",
          amber: "#f59e0b",
          blue: "#2563eb",
          rose: "#f43f5e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
