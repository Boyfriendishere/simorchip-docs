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

  eleventyConfig.addFilter("groupBy", function (arr, key) {
    const result = {};
    (arr || []).forEach(item => {
      const parts = key.split('.');
      let val = item;
      for (const p of parts) val = val?.[p];
      const k = (val === undefined || val === null) ? '' : String(val);
      if (!result[k]) result[k] = [];
      result[k].push(item);
    });
    return Object.entries(result).map(([k, items]) => ({ key: k, items }));
  });

  eleventyConfig.addFilter("findWhere", function (arr, key, val) {
    return (arr || []).find(item => item[key] === val) || null;
  });

  eleventyConfig.addFilter("where", function (arr, key, val) {
    return (arr || []).filter(item => {
      const parts = key.split('.');
      let obj = item;
      for (const p of parts) obj = obj?.[p];
      return obj === val;
    });
  });

  eleventyConfig.addCollection("news", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/news/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("products", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/products/*.md")
      .sort((a, b) => (a.data.sort_order || 0) - (b.data.sort_order || 0));
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
