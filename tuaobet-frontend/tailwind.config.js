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
        'baccarat-deal': {
          '0%': {
            transform: 'translate(120px, -110px) rotate(-22deg) scale(0.82)',
            opacity: '0',
            filter: 'brightness(1.15) blur(0.4px)',
          },
          '35%': {
            opacity: '1',
            filter: 'brightness(1.05) blur(0)',
          },
          '70%': {
            transform: 'translate(0, 6px) rotate(2deg) scale(1.02)',
          },
          '100%': {
            transform: 'translate(0, 0) rotate(0) scale(1)',
            opacity: '1',
            filter: 'brightness(1)',
          },
        },
        'baccarat-card-gloss': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)', opacity: '0' },
          '20%': { opacity: '0.55' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)', opacity: '0' },
        },
        'baccarat-shuffle-fan-l': {
          '0%, 100%': { transform: 'translate(-22px, 0) rotate(-9deg)' },
          '45%': { transform: 'translate(-4px, -4px) rotate(-2deg)' },
          '55%': { transform: 'translate(-4px, -4px) rotate(-2deg)' },
        },
        'baccarat-shuffle-fan-r': {
          '0%, 100%': { transform: 'translate(22px, 0) rotate(9deg)' },
          '45%': { transform: 'translate(4px, -4px) rotate(2deg)' },
          '55%': { transform: 'translate(4px, -4px) rotate(2deg)' },
        },
        'baccarat-shuffle-riffle-l': {
          '0%, 35%, 75%, 100%': { transform: 'translate(0,0) rotate(0)', opacity: '1' },
          '50%': { transform: 'translate(8px,-9px) rotate(5deg)', opacity: '1' },
          '60%': { transform: 'translate(2px,-3px) rotate(2deg)', opacity: '1' },
        },
        'baccarat-shuffle-riffle-r': {
          '0%, 35%, 75%, 100%': { transform: 'translate(0,0) rotate(0)', opacity: '1' },
          '50%': { transform: 'translate(-8px,-9px) rotate(-5deg)', opacity: '1' },
          '60%': { transform: 'translate(-2px,-3px) rotate(-2deg)', opacity: '1' },
        },
        'baccarat-shuffle-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        'baccarat-chip-place': {
          '0%': { transform: 'translateY(-30px) rotate(-30deg) scale(0.75)', opacity: '0' },
          '60%': { transform: 'translateY(2px) rotate(8deg) scale(1.06)', opacity: '1' },
          '85%': { transform: 'translateY(-1px) rotate(-2deg) scale(1)' },
          '100%': { transform: 'translateY(0) rotate(0) scale(1)', opacity: '1' },
        },
        'baccarat-win-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 0 0 0 rgba(251,191,36,0.55), inset 0 0 24px rgba(251,191,36,0.20)',
          },
          '50%': {
            boxShadow:
              '0 0 28px 6px rgba(251,191,36,0.55), inset 0 0 38px rgba(251,191,36,0.30)',
          },
        },
        'baccarat-spotlight': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.78' },
        },
        'baccarat-urgent-pulse': {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.08)', filter: 'brightness(1.25)' },
        },
      },
      animation: {
        'hero-shimmer': 'hero-shimmer 8s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'baccarat-deal': 'baccarat-deal 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'baccarat-card-gloss': 'baccarat-card-gloss 1.05s ease-out 0.18s forwards',
        'baccarat-shuffle-fan-l': 'baccarat-shuffle-fan-l 1.1s ease-in-out infinite',
        'baccarat-shuffle-fan-r': 'baccarat-shuffle-fan-r 1.1s ease-in-out infinite',
        'baccarat-shuffle-riffle-l': 'baccarat-shuffle-riffle-l 1.1s ease-in-out infinite',
        'baccarat-shuffle-riffle-r': 'baccarat-shuffle-riffle-r 1.1s ease-in-out infinite',
        'baccarat-shuffle-bob': 'baccarat-shuffle-bob 1.1s ease-in-out infinite',
        'baccarat-chip-place': 'baccarat-chip-place 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'baccarat-win-pulse': 'baccarat-win-pulse 1.6s ease-in-out infinite',
        'baccarat-spotlight': 'baccarat-spotlight 6s ease-in-out infinite',
        'baccarat-urgent-pulse': 'baccarat-urgent-pulse 0.85s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
