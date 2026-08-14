/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b1220",
          900: "#101a2c",
          850: "#141f34",
          800: "#1a2740",
          700: "#243350",
          600: "#33456a",
          400: "#7387ab",
          300: "#9db0d0",
          200: "#c3d0e6",
          100: "#e6edf8"
        },
        mint: { 400: "#3ddc97", 500: "#22c383" },
        gold: { 400: "#f2b134" },
        coral: { 400: "#ff6b6b" },
        sky2: { 400: "#4cc3ff" }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        num: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
