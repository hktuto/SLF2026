<script setup lang="ts">
import Slider from "~/components/ui/slider.vue";

const { find } = useStrapi();
const { tObj, t } = useLang({
  moreHK: "探索更多",
  moreEN: "More",
});
const { data, pending } = useAsyncData("home", () =>
  find("home", {
    populate: {
      Slider: {
        populate: "*",
      },
      menu: {
        populate: {
          subMenu: {
            populate: "*",
          },
        },
      },
    },
  }),
);

const readMoreIndex = ref<number[]>([]);
const displayHomeMenu = computed(() => {
  if (!data.value || !data.value.data.menu) return [];
  return data.value.data.menu.filter(m => m.label_EN && m.show).map((item: any) => {
    const readMoreItems = item.subMenu.filter(
      (item: any) => item.showInReadMore && item.show,
    );
    const normalItems = item.subMenu.filter(
      (item: any) => !item.showInReadMore && item.show,
    );
    return {
      ...item,
      readMoreItems,
      normalItems,
    };
  });
});

const config = useRuntimeConfig();
const { gtag } = useGtag()
gtag('event', 'cPageView', {
  screen_name: 'Home'
})

gtag("event", "page_view", {
  page_title: config.public.siteName + " | " + "Home",
  page_location: window.location.href,
});
function calculateId(st: any) {
  return st.trim().replaceAll(' ', '_')
}


watch(pending,(bool) => {
  if(!bool) {
    nextTick(() => {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    })
  }
},{
  immediate: true,
})

onMounted(() => {
  nextTick(() => {
    const id = window.location.hash.substring(1);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView();
    }
  })
})


useSeoMeta({
  title: config.public.siteName + " | " + "Home",
});
</script>

<template>
  <div class="page">
    <div class="sliderRow innerGrid">
      <Slider v-if="data" :slides="data.data.Slider" />
      <ClientOnly>
        <CalendarHome />
      </ClientOnly>
    </div>
    <div class="categoryList innerGrid">
      <!-- <CategoryList /> -->
      <template v-if="data">
        <!-- {{data.data.menu}} -->
        <div
          v-for="(menu, index) in displayHomeMenu"
          :key="menu.id"
          :id="calculateId(menu.label_EN)"
          class="categoryContainer"
        >
          <div class="categoryHeader" :style="`--bg-color:${menu.color}`">
            {{ tObj("label_", menu) }}
          </div>
          <div class="sectionGrid">
            <UiGridItem
              v-for="item in menu.normalItems"
              :key="item.id"
              :img="item.image?.url"
              :url="item.url"
              :title="tObj('label_', item)"
              :color="menu.color"
              :item="item"
            />
            <!-- <div v-for="item in menu.normalItems" :key="item.id" class="items">
                <div class="itemImageContainer">
                  <img v-if="item.image?.data?.attributes" :src="imgUrlConverter(item.image.data.url)" alt="">
                </div>
                <div class="itemTitle">
                  {{ tObj("label_", item) }}
                </div>
                </div> -->
            <template
              v-if="
                menu.readMoreItems.length > 0 && readMoreIndex.includes(index)
              "
            >
              <UiGridItem
                v-for="item in menu.readMoreItems"
                :key="item.id"
                :img="item.image?.url"
                :title="tObj('label_', item)"
                :url="item.url"
                :color="menu.color"
                :item="item"
              />
            </template>
          </div>
          <template
            v-if="
              menu.readMoreItems.length > 0 && !readMoreIndex.includes(index)
            "
            class="readMoreContainer"
          >
            <div class="readMoreTitle" @click="readMoreIndex.push(index)">
              >> {{ t("more") }}
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.readMoreTitle {
  margin-block: var(--app-padding);
  width: 100%;
  text-align: right;
  cursor: pointer;
}
.sectionGrid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(300px, 1fr));
  gap: var(--app-padding);
  justify-content: flex-start;
  align-items: flex-start;
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.items {
  cursor: pointer;
  transform: scale(1);
  transition: all 0.2s ease-in-out;
  &:hover {
    transform: scale(1.02);
  }
}
.itemTitle {
  font-size: 1.2rem;
  font-weight: 500;
  padding-block: calc(var(--app-padding) / 2);
  position: relative;
  isolation: isolate;
}
.itemImageContainer {
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.categoryList {
  margin-top: var(--app-padding);
  display: flex;
  flex-flow: column nowrap;
  gap: var(--app-padding);
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
}
.categoryContainer {
  width: 100%;
  &:target {
  scroll-margin-top: 60px; /* height of fixed header */
  }
}
.categoryHeader {
  width: 100%;
  background: var(--bg-color);
  text-align: center;
  padding: calc(var(--app-padding) / 2) var(--app-padding);
  font-size: 1.5rem;
  margin-bottom: var(--app-padding);
  font-weight: 700;
}
.page {
  width: 100%;
}
.sliderRow {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  height: 556px;
  gap: var(--app-padding);
  overflow: visible;
  @media (max-width: 720px) {
    flex-flow: column nowrap;
    height: auto;
  }
}
</style>
