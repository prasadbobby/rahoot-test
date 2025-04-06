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
        primary: "#ff9900",
        "primary-dark": "#e68a00",
        secondary: "#1a140b",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'inner-lg': 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  safelist: [
    "grid-cols-4", 
    "grid-cols-3", 
    "grid-cols-2", 
    "bg-red-500", 
    "bg-blue-500", 
    "bg-yellow-500", 
    "bg-green-500",
    "from-primary",
    "to-amber-500"
  ],
  plugins: [],
}