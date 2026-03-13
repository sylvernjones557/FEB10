/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                institutional: {
                    dark: '#020617',
                    card: '#0F172A',
                    accent: '#4F46E5',
                },
            },
        },
    },
    plugins: [],
}
