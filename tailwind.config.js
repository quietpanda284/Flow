
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Default sans stack for body text and inputs
        sans: ['Inter', 'sans-serif'],
        // Display stack for Headings/Logos - Strictly Bebas Neue Pro
        display: ['"Bebas Neue Pro"', 'sans-serif'],
      },
      colors: {
        background: '#0f1117',
        card: '#1a1d24',
        border: '#2a2d36',
        accent: {
          focus: '#00FF94', // Neon Green
          meeting: '#4D96FF', // Soft Blue
          break: '#FFB347', // Pastel Orange
          other: '#A0A0A0', // Grey
        }
      }
    }
  },
  plugins: [],
}
