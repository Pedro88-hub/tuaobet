/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tuao-dark': {
          950: '#0F1923', // Fundo principal (base azul-acinzentada)
          900: '#1D2730', // Painéis / cartões
          800: '#2C3A49', // Superfícies elevadas / secundárias
          700: '#3A4B5C', // Bordas e divisores
          600: '#4A5D70', // Bordas fortes / hover
          500: '#5A6F84', // Destaque sutil em bordas
        },
        'tuao-primary': {
          DEFAULT: '#00F0FF', // Azul neon principal
          hover: '#33F3FF',   // Variação para hover
        },
        'tuao-cta': {
          DEFAULT: '#f12c4c', // CTA principal (Depositar / Cadastre-se)
          hover: '#ff4d6a',
        },
        'tuao-text': {
          primary: '#FFFFFF', // Texto principal
          secondary: '#A1A1A1', // Texto secundário
        },
        // Referência mobile (Blaze-style)
        blaze: {
          rose: '#f12c4c',
          green: '#00e676',
          panel: '#0f171e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Usaremos Inter como fonte principal
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 240, 255, 0.5)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'panel': '0 2px 8px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        'hero-shimmer': {
          '0%, 100%': { opacity: '0.4', transform: 'translateX(-5%) scale(1)' },
          '50%': { opacity: '0.7', transform: 'translateX(5%) scale(1.05)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'hero-shimmer': 'hero-shimmer 8s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
