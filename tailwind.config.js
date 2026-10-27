/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        insaat: {
          background: "#101114",
          surface: "#202126",
          accent: "#E6D4A8",
          text: "#F4F1E8",
          muted: "#A5A5AD",
        },
      },
    },
  },
  plugins: [],
};
