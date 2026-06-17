<script setup lang="ts">
import Markdown from "vue3-markdown-it";
const { find } = useStrapi();
const route = useRoute();
const { tObj } = useLang({});
const { data, pending } = await useAsyncData("page", () =>
  find("pages", {
    populate: "*",
    filters: {
      slug: {
        $eq: route.params.id,
      },
    },
  }),
);
const config = useRuntimeConfig();
useSeoMeta({
  title: config.public.siteName + " | " + data.value?.data[0].title_EN,
});

onMounted(() => {
  const { gtag } = useGtag()
  gtag('event', 'page_view', {
      page_title:  config.public.siteName + " | " + data.value?.data[0].title_EN,
      page_location: window.location.href
  });
});
</script>

<template>
  <div class="pageContent innerGrid">
    <div v-if="pending" class="pending"></div>
    <template v-else>
      <div v-if="data && data?.data.length == 0" class="comingSoon">
        {{
          tObj("key", {
            keyEN: "Coming Soon",
            keyHK: "快將推出",
          })
        }}
      </div>
      <div
        v-if="data && data.data[0] && data.data[0].feature"
        class="featureContainer"
      >
        <template v-if="data.data[0].feature.url.includes('mp4')">
          <div class="videoContainer innerGrid">
            <video
              class="video"
              :src="imgUrlConverter(data.data[0].feature.url)"
              autoplay
              preload
              muted
              loop
              playsinline
            />
          </div>
        </template>
        <img
          v-else
          :src="imgUrlConverter(data?.data[0].feature.url)"
          alt="feature"
        />
      </div>
      <div v-if="data && data?.data[0]" class="title gradientText">
        {{ tObj("title_", data?.data[0]) }}
      </div>
      <div v-if="data && data?.data[0]" class="content">
        <Markdown
          class="eventContent"
          :source="replaceMarkdownContent(tObj('content_', data?.data[0]))"
          html
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.video {
  width: 100%;
}
.pageContent {
  .featureContainer {
    width: 100%;
    aspect-ratio: 16/9;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .title {
    padding: 12px 0;
  }
}
.content {
  background: #fff;
  padding: 12px;
  border-top-right-radius: 12px;
  border-bottom-left-radius: 12px;
  margin-bottom: 24px;
  :deep(.videoGrid) {
    aspect-ratio: 16 / 9;
    width: calc(50% - 5px);
    min-width: 300px;
    display: inline-block;
    @media (max-width: 640px) {
      width: 100%;
    }
  }
}
</style>
