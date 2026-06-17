<script lang="ts" setup>
import Markdown from "vue3-markdown-it";
const props = defineProps<{
  tabs: any[]
}>();

const selectedTab = ref(0);

const {t, tObj} = useLang({});
</script>


<template>
  <ElTabs
    v-model="selectedTab"
  >
    <ElTabPane v-for="(tab, index) in tabs" :key="index" :name="index" :label="tObj('title_', tab)">
      {{ tab.content}}
      <Markdown
        v-if="tab.content_EN"
        class="tabContent"
        :source="replaceMarkdownContent(tObj('content_', tab))"
        html
      />
    </ElTabPane>
  </ElTabs>
</template>

<style>
.tabContent{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 12px;
  @media (max-width : 960px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  @media (max-width : 640px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
  p {
    width: 100%;
    display: block;
    position: relative;
    img{
      width:100%;
    }
  }
}
</style>
