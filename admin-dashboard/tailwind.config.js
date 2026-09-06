/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1B2D',
          900: '#0A1420',
          800: '#0F1B2D',
          700: '#182A42',
          600: '#233A57',
        },
        paper: '#F6F7F9',
        line: '#E3E7ED',
        slate: {
          muted: '#5B6472',
        },
        signal: {
          red: '#D6402F',
          redDim: '#F5DCD8',
          amber: '#C97A1F',
          amberDim: '#F4E3CC',
          green: '#1F8A57',
          greenDim: '#D9EFE3',
          blue: '#1E5FA8',
          blueDim: '#DCE8F5',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 27, 45, 0.04)',
      },
      animation: {
        'spin-slow': 'spin 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
