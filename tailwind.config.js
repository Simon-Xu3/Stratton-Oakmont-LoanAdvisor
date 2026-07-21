/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F1F1F',
        midnight: '#000000',
        navy: '#111111',
        paper: '#FFFFFF',
        vellum: '#FFFFFF',
        line: '#D8DDE3',
        steel: '#4F4F4F',
        teal: '#0077B6',
        plum: '#006EB6',
        gold: '#0088CE',
        bronze: '#0067A8'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0, 0, 0, 0.06)',
        panel: '0 14px 36px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};
