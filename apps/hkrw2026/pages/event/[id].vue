<script setup lang="ts">
const { findOne } = useStrapi();
const route = useRoute();
const { tObj } = useLang();
const { data, refresh, error } = await useAsyncData("programData", () =>
  findOne("events", route.params.id as any, {
    populate: {
      photos: {
        populate: "*",
      },
      programs: {
        populate: "*",
      },
      slides: {
        populate: "*",
      },
      tab: {
        populate: "*",
      }
    },
  }),
);

const config = useRuntimeConfig();
useSeoMeta({
  title: config.public.siteName + " | " + data.value?.data.title_EN,
});



onMounted(() => {
  const { gtag } = useGtag()
  gtag('event', 'page_view', {
      page_title:  config.public.siteName + " | " + data.value?.data.title_EN,
      page_location: window.location.href
  });
});
</script>

<template>
  <div class="pageContainer innerGrid">
    <!--        {{data}}-->
    <div v-if="error || !data" class="noData">no Data</div>
    <template v-else>
      <EventDetail :event="data.data" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.content {
  background: #fff;
  padding: 24px;
}
</style>
