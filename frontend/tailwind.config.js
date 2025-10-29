/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14B8A6',
            600: '#0F9488',
            700: '#0D9488',
            800: '#115e59',
            900: '#134e4a',
          }
        },
        fontFamily: {
          'inter': ['Inter', 'system-ui', 'sans-serif'],
          'cairo': ['Cairo', 'system-ui', 'sans-serif'],
        },
        backgroundImage: {
          'gradient-primary': 'linear-gradient(135deg, #14B8A6, #0F9488)',
          'gradient-dark': 'linear-gradient(135deg, #1F2937, #374151)',
          'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        },
        animation: {
          'float': 'float 6s ease-in-out infinite',
          'float-slow': 'float-slow 8s ease-in-out infinite',
          'float-slower': 'float-slower 10s ease-in-out infinite',
          'float-reverse': 'float-reverse 7s ease-in-out infinite',
          'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
          'bounce-slower': 'bounce-slower 4s ease-in-out infinite',
          'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
          'pulse-slower': 'pulse-slower 6s ease-in-out infinite',
          'spin-slow': 'spin-slow 8s linear infinite',
          'gradient-x': 'gradient-x 3s ease infinite',
          'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
          'fade-in-right': 'fade-in-right 1s ease-out forwards',
        }
      },
    },
    plugins: [],
  }