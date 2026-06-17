<script lang="ts" setup>
import Markdown from "vue3-markdown-it";
const { findOne } = useStrapi();
const route = useRoute();
const { data, pending, refresh, error } = await useAsyncData("books-detail", () =>
  findOne("books", route.params.id as any, {
    populate: {
      thumbnail: {
        populate: "*",
      },
    },
  }),
);
const { t, tObj } = useLang({});

const config = useRuntimeConfig();
const { gtag } = useGtag();
gtag('event', 'cPageView', {
  screen_name: 'Book Detail'
});

gtag("event", "page_view", {
  page_title: config.public.siteName + " | " + "Book Detail",
  page_location: window.location.href,
});
</script>

<template>
  <div class="pageContent innerGrid">

    <div v-if="pending" class="pending"></div>
    <template v-else>
      <div>
         <FeatureImage
          v-if="data.data.thumbnail"
          :img="data.data.thumbnail.url"
          :blur-image="data.data.thumbnail.url"
        />
        <div class="title gradientText">
          {{ tObj("title_", data.data) }}
        </div>
        <Markdown
          v-if="data.data.content_EN"
          class="eventContent"
          :source="replaceMarkdownContent(tObj('content_', data.data))"
          html
        />
      </div>
    </template>
  </div>
</template>
