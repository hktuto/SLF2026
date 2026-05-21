<script setup lang="ts">
const { find } = useStrapi();
const {
  public: { STRAPI_URL },
} = useRuntimeConfig();
const route = useRoute();
const { currentLang } = useLang({});
const displayMenu = computed(() => {
  if (data.value.data.item) {
    return data.value.data.item
      .filter((item: any) => {
        if (currentLang.value === "EN") {
          return (
            item.show && item.url !== "https://game.readingpromotion.gov.hk/"
          );
        }
        return item.show;
      })
      .reduce((arr: any, cur: any) => {
        cur.subMenu = cur.subMenu.filter((item: any) => item.show);
        arr.push(cur);
        return arr;
      }, []);
  } else {
    return [];
  }
});

const { data } = useAsyncData("menu", () =>
  find("menu", {
    populate: {
      logo: {
        populate: "*",
      },
      item: {
        populate: "*",
      },
    },
    status: route.query.status || "published",
  }),
);
</script>

<template>
  <div class="header">
    <!-- <div class="firstHeader innerGrid">
      <HeaderSearch />


    </div> -->
    <div class="secondaryContainer innerGrid">
      <div class="headerLeft">
        <div class="logoContainer">
          <img
            v-if="data"
            class="logo"
            :src="imgUrlConverter(data.data.logo.url)"
            alt="logo"
            @click="$router.push('/')"
          />
        </div>
      </div>
      <HeaderMenu v-if="data" :menu="displayMenu" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.firstHeader {
  margin-block: 24px 12px;
  margin-inline: auto;
  display: flex;
  flex-flow: row nowrap;
  gap: 12px;
  justify-content: flex-end;
  align-items: center;
}
.secondaryContainer {
  width: 100%;
  overflow: visible;
  display: flex;
  flex-flow: row nowrap;
  min-height: var(--header-height);
  padding-block: calc(var(--app-padding) * 2);
  .headerLeft,
  .headerRight {
    flex: 1 1 auto;
    height: var(--header-height);
    backdrop-filter: blur(20px);
  }
}
.logoContainer {
  height: var(--header-height);
  backdrop-filter: blur(20px);
  padding: 0 20px;
  border-top-right-radius: var(--app-radius);
}
.logo {
  height: 100%;
  max-width: 220px;
  cursor: pointer;
}
</style>
