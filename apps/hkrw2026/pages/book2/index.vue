<script lang="ts" setup>
const { find } = useStrapi();
const route = useRoute();
const catOptions = {
  '運動': 'sports',
  '旅遊': 'travel',
  '成就': 'achievements',
  '飲食': 'diet',
  '成長': 'personal growth',
  '挑戰': 'challenges',
  '興趣': 'interests',
  '關係': 'relationships'
}
const currentSelectedCatgory = ref();
const filter = computed(() => {
  if (route.query.category && catOptions[route.query.category as string] || currentSelectedCatgory.value) {
    return {
      category_HK: {
       $contains: currentSelectedCatgory.value || route.query.category,
     }
    };
  }
  return {};
})
const { data:bookPage } = useAsyncData("bookPage", () =>
  find("book-page", {
    populate: {
      slides: {
        populate: "*",
      },
    },
  }),
);
const { data, pending, refresh, error } = await useAsyncData("books_" + route.query.category, () =>
  find("book2s", {
    populate: {
      cover: {
        populate: "*",
      },
    },
    pagination: {
      page: 1,
      pageSize: 100,
    },
    sort: "order:asc",
    filters: filter.value,
  }),
);

function openBooks(url:string){
  window.open(url, "_blank");
}

const config = useRuntimeConfig();
const { gtag } = useGtag();
gtag('event', 'cPageView', {
  screen_name: 'Books'
});

gtag("event", "page_view", {
  page_title: config.public.siteName + " | " + "Books",
  page_location: window.location.href,
});

const { tObj, currentLang, t } = useLang({
  nameHK: "閱讀焦點",
  nameEN: "Reading focus",
  bookLinkHK:"紙本書",
  bookLinkEN:"Book",
  eBookLinkHK:"電子書",
  eBookLinkEN: "e-Book",
  publisherHK: "出版者",
  publisherEN: "Publisher",
  publishYearHK: "出版年份",
  publishYearEN: "Publish Year",
  '運動EN': 'Sports',
  '旅遊EN': 'Travel',
  '成就EN': 'Achievements',
  '飲食EN': 'Diet',
  '成長EN': 'Personal Growth',
  '挑戰EN': 'Challenges',
  '興趣EN': 'Interests',
  '關係EN': 'Relationships',
  '運動HK': '運動',
  '旅遊HK': '旅遊',
  '成就HK': '成就',
  '飲食HK': '飲食',
  '成長HK': '成長',
  '挑戰HK': '挑戰',
  '興趣HK': '興趣',
  '關係HK': '關係',
  'allHK': '全部',
  'allEN': 'All'
});
const router = useRouter()
function selectCategory(category?:string) {
  if(!category) {
    router.push({ query: {} })
  } else {
    currentSelectedCatgory.value = category;
    router.push({ query: { category } })
  }
  nextTick(() => {
    refresh()
  })
  // window.location.reload()
}

onMounted(() => {
  const { gtag } = useGtag()
  gtag('event', 'page_view', {
      page_title:  config.public.siteName + " | " + 'Reading focu',
      page_location: window.location.href
  });
});
</script>

<template>
  <div class="pageContent innerGrid">
    <div v-if="pending" class="pending"></div>
    <template v-else>
    <UiSlider v-if="bookPage" :slides="bookPage.data.slides" />
      <div class="title gradientText">
        {{ route.query.category && data.data[0] ?  tObj('category_', data.data[0]) : t('name') }}
      </div>

      <div class="tags">
        <div :class="{tag:true, selected: !route.query.category}" @click="selectCategory()">{{ t('all') }}</div>
        <div v-for="(value, key) in catOptions" :key="key" :class="{tag:true, selected: route.query.category === key}" @click="selectCategory(key)">{{ t(key) }}</div>
      </div>
      <div><small>"For English, please scroll down"</small></div>
      <div v-if="data.data" class="booksGrid">
        <div v-for="book in data.data" :key="book.id" class="bookItem">
           <NuxtImg v-if="book.cover" class="mainImg" :src="imgUrlConverter(book.cover.url)" />
           <NuxtImg v-else class="mainImg" :src="imgUrlConverter('/uploads/260415_book_thumbnail_kv_3b5047c269.png')" />

           <div class="content">
             <div class="cat">{{t(book.category_HK)}}</div>
             <div class="bookTitle">{{tObj('title_', book)}}</div>
             <div class="author">{{tObj('author_', book)}}</div>

             <div class="btns">
               <ElButton v-if="book.book_link_HK" type="info" @click="openBooks(tObj('book_link_', book))">{{t("bookLink")}}</ElButton>
               <ElButton v-if="book.ebook_link_hk" type="info" @click="openBooks(tObj('ebook_link_', book))">{{t("eBookLink")}}</ElButton>
             </div>
              <div class="author">{{t('publisher')}} : {{tObj('publisher_', book)}}</div>
              <div class="author">{{t('publishYear')}} : {{book.year_HK}}</div>
           </div>
        </div>
      </div>
      <!-- <UiGrid v-if="data.data">
        <UiGridItem
          v-for="book in data.data"
          :key="book.id"
          :img="book.thumbnail.url"
          :title="tObj('title_', book)"
          :url="`/books/${book.documentId}`"
        />
      </UiGrid> -->
    </template>
  </div>
</template>

<style scoped>
.tags{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;;
}
.tag {
  padding: 4px 8px;
  background: #eee;
  color: #fff;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--app-primary-color);
  cursor: pointer;
  font-size: 1.2rem;
  &.selected {
    color: #fff;
    background: var(--app-primary-color);
  }

}
.title {
  margin-bottom: 24px;
}
.booksGrid{
  width:100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
.bookItem{
  display: grid;
  grid-template-columns: min-content 1fr;
  gap: 12px;
}
.mainImg{
  max-height: 200px;
  aspect-ratio: 9/13;
  object-fit: cover;
  background: #eee;
}
.cat{
  font-size: 0.75rem;
  color:var(--app-primary-color);
}
.author{
  font-size: 1rem;
}
.bookTitle{
  font-size: 1.5rem;
  font-weight: bold;
}
.btns{
  margin-block: 1rem;
}
</style>
