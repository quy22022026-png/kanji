module.exports = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Nunito', 'system-ui', 'sans-serif'],
            jp: ['"M PLUS Rounded 1c"', '"Hiragino Maru Gothic ProN"', 'sans-serif']
          },
          colors: {
            peach: { 50: '#FFF1F3', 100: '#FFE4E8', 400: '#FF8FA3', 500: '#FB6F92' },
            matcha: { 50: '#ECFDF5', 100: '#D1FAE5', 400: '#34D399', 500: '#10B981', 600: '#059669' },
            skysoft: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6' }
          },
          boxShadow: {
            soft: '0 8px 28px -6px rgba(51, 46, 46, 0.07)',
            card: '0 16px 38px -12px rgba(251, 111, 146, 0.16), 0 4px 12px -2px rgba(51, 46, 46, 0.05)'
          }
        }
      }
    ,
 content:['./index.html','./*.js'],
};
