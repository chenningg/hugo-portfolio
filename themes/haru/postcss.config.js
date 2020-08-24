module.exports = {
  plugins: [
    require("postcss-import")({ path: "themes/haru/assets/css" }),
    require("tailwindcss")("./themes/haru/tailwind.config.js"),
    require("autoprefixer"),
  ],
};
