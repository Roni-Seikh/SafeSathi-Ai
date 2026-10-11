/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F1B2D', 900: '#0A1420', 800: '#0F1B2D', 700: '#182A42', 600: '#233A57' },
        paper: '#F6F7F9',
        line: '#E3E7ED',
        slate: { muted: '#5B6472' },
        accent: { DEFAULT: '#5B6CFF', soft: '#E8EBFF', glow: '#8A96FF' },
        signal: {
          red: '#D6402F', redDim: '#F5DCD8', amber: '#C97A1F', amberDim: '#F4E3CC',
          green: '#1F8A57', greenDim: '#D9EFE3', blue: '#1E5FA8', blueDim: '#DCE8F5',
        },
      },
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], sans: ['Inter', 'sans-serif'], mono: ['"IBM Plex Mono"', 'monospace'] },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 27, 45, 0.04)',
        lift: '0 10px 30px -12px rgba(15, 27, 45, 0.25)',
        glow: '0 0 0 1px rgba(91,108,255,.25), 0 12px 32px -10px rgba(91,108,255,.45)',
        glowRed: '0 0 0 1px rgba(214,64,47,.35), 0 12px 32px -10px rgba(214,64,47,.5)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'ping-soft': { '0%': { transform: 'scale(1)', opacity: '.6' }, '100%': { transform: 'scale(2.6)', opacity: '0' } },
        'grad-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'slide-in': { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'draw': { '0%': { strokeDashoffset: 'var(--len)' }, '100%': { strokeDashoffset: '0' } },
      },
      animation: {
        'spin-slow': 'spin 2.5s linear infinite',
        'fade-up': 'fade-up .5s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .4s ease both',
        shimmer: 'shimmer 1.6s linear infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0,0,.2,1) infinite',
        'grad-x': 'grad-x 8s ease infinite',
        'slide-in': 'slide-in .3s cubic-bezier(.2,.8,.2,1) both',
        draw: 'draw 1.2s ease-out both',
      },
    },
  },
  plugins: [],
};
