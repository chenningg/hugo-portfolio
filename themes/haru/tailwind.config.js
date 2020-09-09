const isDev = process.env.HUGO_ENV === "development";

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  purge: {
    enabled: !isDev,
    content: [
      "./themes/haru/layouts/**/*.html",
      "./themes/haru/layouts/*.html",
    ],
  },
  theme: {
    container: {
      screens: {
        sm: "100%",
        md: "100%",
        lg: "900px",
        xl: "900px",
      },
    },
    extend: {
      colors: {
        twitter: "#1da1f2",
      },
    },
  },
  variants: {},
  plugins: [],
};
