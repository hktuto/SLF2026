<template>
  <div :class="{ app: true }">
    <NuxtLayout>
      <NuxtPage />
      <Analytics />
    </NuxtLayout>
    <!-- <Rainbow /> -->
    <ElDialog v-model="dialogShow" append-to-body :before-close="closePopup">
      {{ tObj("content_", content) }}
      <!-- <Markdown v-if="content.content_EN" class="eventContent" :source="tObj('content_', content)" html /> -->
    </ElDialog>
  </div>
</template>

<script lang="ts" setup>
import { useEvents } from "~/composables/event";
const dialogShow = ref(false);

const route = useRoute();
const isHome = computed(() => route.path === "/");

const { find } = useStrapi();
const content = ref();
const { tObj } = useLang({});
async function getPopup() {
  const item = await find("popup", {
    status: route.query.status || "published",
  });

  if (item && item.data.title_HK) {
    content.value = item.data;
    const storage = localStorage.getItem("popup-date");
    if (!storage || storage !== item.data.updatedAt) {
      console.log();
      dialogShow.value = true;
    }
  }
}

function closePopup() {
  localStorage.setItem("popup-date", content.value.updatedAt);
  dialogShow.value = false;
}

onMounted(() => {
  getPopup();
});
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap");
:root {

}

.desktopOnly{
  @media( max-width: 768px) {
    display: none !important;
  }
}
* {
  box-sizing: border-box;
}
.app {
  background: #fff;
  &.home {
    filter: grayscale(1);
  }
}
body,
html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: "Roboto", sans-serif;
  scroll-behavior: smooth;
  --app-padding: 15px;
  --footer-color: #4eb967;
  --app-primary-color: #8C7B35;
  --sx-color-primary:#8C7B35;
  --el-color-primary: #8C7B35;
  --sx-color-primary-container: #dc93a8;
  --menu-bg: #8C7B35;
  --body-width: 1280px;
  --header-height: 60px;
  --app-radius: 12px;
  --el-select-input-color: #000;
  --el-menu-border-color: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-active-color: #000;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.1);
  --el-menu-item-font-size: 1.2rem;
  --el-menu-base-level-padding: var(--app-padding);
}
.innerGrid {
  width: 100%;
  max-width: var(--body-width);
  margin: 0 auto;
  @media (max-width: 1304px) {
    padding-inline: 12px;
  }
}

.gradientText {
  --hue: 60;
  --color-1: hsl(var(--hue), 50%, 47%);
  --color-2: hsl(calc(var(--hue) + 40) 50% 50%);
  background: linear-gradient(to right, var(--color-1), var(--color-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  font-size: clamp(1.4rem, 4vw, 2.5rem);
  font-weight: 700;
}
.featureContainer {
  border-top-right-radius: 12px;
  border-bottom-left-radius: 12px;
  overflow: hidden;
}

.sx__month-grid-cell {
  height: initial !important;
  min-height: 26px;
  white-space: normal !important;
}
.sx__month-grid-day {
  min-height: 120px;
}
.sx__month-agenda-events__empty {
  display: none;
}

.eventContent {
  margin-bottom: calc(var(--app-padding) / 2);
  table {
    width:100%;
    font-weight: initial;
    border-collapse: collapse;
    border: 1px solid var(--app-primary-color);
    thead{
      th {
        padding: 6px;
        text-align: left;
        background: var(--app-primary-color);
        color: #fff;
      }
    }
    tbody{
      tr{
         border-bottom: 1px solid #eee;
         &:last-child{
           border-bottom: none;
         }
      }
      td{
        padding: 12px;
        &:last-child {
          border-left: 1px solid #eee;
        }
      }
    }
  }
}
</style>
