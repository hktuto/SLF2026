module.exports = ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT"),
    },
  },
  flags: {
    nps: env.bool("FLAG_NPS", true),
    promoteEE: env.bool("FLAG_PROMOTE_EE", true),
  },
  preview: {
    enabled(uid) {
      console.log("uid", uid);
      return true;
    },
    config: {
      allowedOrigins: ["http://localhost:3001", "http://47.242.219.240:3001", "https://slf2026.readingpromotion.gov.hk"],
      async handler(uid, { documentId, locale, status }) {
        // filter all non preview able content
        const ignoreUid = ["api::district.district"];
        if (ignoreUid.includes(uid)) {
          return null;
        }
        const previewInHome = [
          "api::footer.footer",
          "api::home.home",
          "api::menu.menu",
          "api::popup.popup",
        ];
        if (previewInHome.includes(uid)) {
          return env("FRONT_URL") + "?status=" + status;
        }
        //
        if (uid === "api::category.category") {
          return (
            env("FRONT_URL") +
            `/preview/category?status=${status}&documentId=${documentId}`
          );
        }
        if (uid === "api::half-an-hour.half-an-hour") {
          return (
            env("FRONT_URL") +
            `/preview/Read_Together_for_Half_an_Hour?status=${status}&documentId=${documentId}`
          );
        }
        if (uid === "api::event.event") {
          return (
            env("FRONT_URL") +
            `/preview/event?status=${status}&documentId=${documentId}`
          );
        }
        return null;
      },
    },
  },
});
