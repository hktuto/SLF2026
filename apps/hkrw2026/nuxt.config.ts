// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, user-scalable=no",
        },
        {
          name: "title",
          content: "香港悅讀周 Hong Kong Reading Week",
        },
        {
          name: "description",
          content:
            "香港公共圖書館將於4月20日至26日舉辦「香港悅讀周2026」，主題為「閱讀／細味幸福」，並以正向思維、人際關係及良好社會氛圍為閱讀焦點。",
        },
        {
          name: "keywords",
          content:
            "香港悅讀周, Hong Kong Reading Week, 閱讀, 全民閱讀日, 公共圖書館",
        },
        { name: "author", content: "Hong Kong Public Libraries" },
      ],
    },
  },
  modules: [
    "@hypernym/nuxt-anime",
    "@nuxtjs/strapi",
    "@element-plus/nuxt",
    "@nuxt/image",
    "nuxt-gtag"
  ],

  gtag: {
      id: 'G-7JZWV60NKL'
    },

  runtimeConfig: {
    public: {
      STRAPI_URL: process.env.STRAPI_URL || "http://localhost:1338",
      siteName: "夏日圖書館節 2026",
      siteDescription:
        "The Hong Kong Public Libraries (HKPL) will organise the “Summer Library Festival 2026” under the theme “Happiness Trains – Discovering Treasures of the Soul” in this summertime. A series of reading events will be staged, encouraging all of us to cultivate a positive mindset and make happiness a nourishing part of our life by exploring and finding the small details in our daily routines. Upcoming diversified thematic talks, workshops, online videos, creative handicrafts and outreach activities, etc. will be offered, along with a variety of recommended reading materials, allowing participants to share the joy of leisure reading. All are welcome to join!",
    },
  },

  // gtag: {
  //   id: "G-B3NESPXYME",
  // },

  strapi: {
    version: "v5",
    prefix: "/api",
  },

  compatibilityDate: "2025-04-02",
});
