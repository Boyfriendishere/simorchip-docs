module.exports = function (eleventyConfig) {
  // Only .njk/.md go through the template engine. Existing static .html
  // pages (and the product sub-sites) are copied through untouched so their
  // output paths/extensions stay exactly as before (e.g. about.html, not
  // about/index.html).
  eleventyConfig.setTemplateFormats(["njk", "md"]);
  eleventyConfig.addPassthroughCopy({ "src/admin/config.yml": "admin/config.yml" });
  eleventyConfig.addPassthroughCopy("src/news/images");
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });
  eleventyConfig.addPassthroughCopy("src/_uploads");
  eleventyConfig.addPassthroughCopy("src/*.html");
  eleventyConfig.addPassthroughCopy("src/ssd");
  eleventyConfig.addPassthroughCopy("src/dram");
  eleventyConfig.addPassthroughCopy("src/gpu");
  eleventyConfig.addPassthroughCopy("src/externals");

  eleventyConfig.addFilter("dateDisplay", function (value) {
    return new Date(value).toISOString().slice(0, 10);
  });

  eleventyConfig.addCollection("news", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/news/*.md").sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
