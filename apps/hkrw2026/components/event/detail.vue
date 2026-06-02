<script setup lang="ts">
import Markdown from "vue3-markdown-it";
import dayjs from "dayjs";
const props = defineProps<{
  event: any;
}>();
const { t, tObj, currentLang } = useLang({
  ...props.event,
  tableHost_EN: "Host",
  tableTarget_EN: "Target",
  tableQuota_EN: "Quota",
  tableHost_HK: "講者/主持",
  tableTarget_HK: "對象",
  tableQuota_HK: "名額",
  date_HK: "日期",
  date_EN: "Date",
  location_HK: "地點",
  location_EN: "Location",
  register_HK: "報名方法",
  register_EN: "Registration Method",
  contact_HK: "查詢/報名電話",
  contact_EN: "Contact",
  preiod_HK: "開始報名日期",
  preiod_EN: "Registration Period",
  quota_HK: "名額",
  quota_EN: "Quota",
  na_HK: "不適用",
  na_EN: "N/A",
  registerBtn_HK: "立即報名",
  registerBtn_EN: "Register now"
});

const showDate = ref(true);
const showLocation = ref(true);
const showQuota = ref(true);
const showRegister = ref(true);
const showContact = ref(true);
const showPeriod = ref(true);
const columnCount = ref(6);

const programs = ref([]);

function makeProgram(item: any) {
  if (!props.event.programs) {
    programs.value = [];
  }
  const _programs = JSON.parse(JSON.stringify(props.event.programs));
  showDate.value = _programs.some((item: any) => {
    return item.startDate || item.endDate;
  });
  if (!showDate.value) columnCount.value -= 1;
  showLocation.value = _programs.some((item: any) => {
    return item.location_HK;
  });
  if (!showLocation.value) columnCount.value -= 1;
  showQuota.value = _programs.some((item: any) => {
    return item.quota_HK;
  });
  if (!showQuota.value) columnCount.value -= 1;
  showRegister.value = _programs.some((item: any) => {
    return item.register_HK;
  });
  if (!showRegister.value) columnCount.value -= 1;
  showContact.value = _programs.some((item: any) => {
    return item.contact_HK;
  });
  if (!showContact.value) columnCount.value -= 1;
  showPeriod.value = _programs.some((item: any) => {
    return item.period_HK;
  });
  if (!showPeriod.value) columnCount.value -= 1;

  programs.value = _programs
    .filter((item: any) => {
      return item.startDate || item.endDate || item.startTime || item.endTime;
    })
    .sort((a: any, b: any) => {
      const aTime = a.startTime || "23:59:00";
      const bTime = b.startTime || "23:59:00";

      const aDay = dayjs(a.startDate + "T" + aTime);
      const bDay = dayjs(b.startDate + "T" + bTime);
      return aDay.isBefore(bDay) ? -1 : 1;
    });
}

function calculateDisplayTime(time: string) {
  if (!time) return "--";
  if (currentLang.value === "HK" || currentLang.value === "CN") {
    const spliter = time.includes("至");
    if (spliter) {
      const [start, end] = time.split("至");
      return `${start.trim()} 至 <br/> ${end.trim()}`;
    } else {
      return time.trim();
    }
  }
  return time;
}

function calculateDisplayLocation(location: string) {
  if (!location) return "--";
  if (currentLang.value === "HK" || currentLang.value === "CN") {
    if (location.includes(" - ")) {
      const [start, end] = location.split(" - ");
      return `${start.trim()} - <br/> ${end.trim()}`;
    }
    return location.trim();
  }
  return location;
}

function openProgram(event:any) {
  if (event.register_url_HK) {
    const i18nLink = tObj("register_url_", event);
    window.open(i18nLink ||event.register_url_HK, "_blank");
  }
}

onMounted(() => {
  makeProgram(props.event);
});
</script>

<template>
  <div class="detailContent innerGrid">
    <div class="content">
      <div class="imageContainer">
        <FeatureImage
          v-if="event"
          :img="event.photos[0].url"
          :blur-image="event.photos[0].url"
        />
      </div>
      <div class="title gradientText">
        {{ t("title_") }}
      </div>
      <Markdown
        v-if="event.content_EN"
        class="eventContent"
        :source="t('content_')"
        html
      />

      <template v-if="event.tab">
        <EventTab :tabs="event.tab" />
      </template>

      <div v-if="event.host_EN" class="eventContent">
        <div class="label">{{ t("tableHost_") }}</div>
        <div class="content" v-html="t('host_')"></div>
      </div>
      <div v-if="event.target_EN" class="eventContent">
        <div class="label">{{ t("tableTarget_") }}</div>
        <div class="content" v-html="t('target_')"></div>
      </div>
      <div v-if="event.quota_EN" class="eventContent">
        <div class="label">{{ t("tableQuota_") }}</div>
        <div class="content" v-html="t('quota_')"></div>
      </div>
      <div v-if="event.slides" class="slides">
        <div v-for="slide in event.slides" class="slide">
          <template v-if="!slide.feature.data.mime.includes('video')">
            <div class="slideImgContainer">
              <img :src="slide.feature.data.url" />
            </div>
          </template>
          <template v-else>
            <video
              class="slideVideo"
              preload="metadata"
              :poster="slide.thumbnail.data.url"
              controls
            >
              <source
                :src="'https://' + slide.feature.data.url"
                type="video/mp4"
              />
            </video>
          </template>
          <div class="small">{{ tObj("title", slide) }}</div>
        </div>
      </div>
      <div v-if="event.remark_EN" class="eventContent">
        <div class="label"></div>
        <div class="content" v-html="t('remark_')"></div>
      </div>
    </div>
    <div class="tableContainer">
      <table
        v-if="programs && programs.length > 0"
        class="evantTable"
        :style="`--column-count:${columnCount}`"
      >
        <thead>
          <tr>
            <th v-if="showDate">{{ t("date_") }}</th>
            <th v-if="showLocation">{{ t("location_") }}</th>
            <th v-if="showQuota">{{ t("quota_") }}</th>
            <th v-if="showRegister">{{ t("register_") }}</th>
            <th v-if="showPeriod">{{ t("preiod_") }}</th>
            <th v-if="showContact">{{ t("contact_") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="program in programs" :key="program.id">
            <td
              v-if="showDate"
              v-html="calculateDisplayTime(tObj('displayTime_', program))"
            ></td>
            <td
              v-if="showLocation"
              v-html="calculateDisplayLocation(tObj('location_', program))"
            ></td>
            <td v-if="showQuota">
              {{
                program.quota_EN === "N/A" ? t("na_") : tObj("quota_", program)
              }}
            </td>
            <td v-if="showRegister">
              <template v-if="program.register_EN !== 'N/A'">
              <div :class="{ register: true , link: program.register_url_HK}" @click="openProgram(program)">
                <template v-if="program.register_url_HK">
                  {{ t('registerBtn_')}}
                </template >
                <template v-else>
                  {{ tObj('register_', program)}}
                </template>
              </div>

              </template>
              <template v-else>
                {{ t("na_") }}
              </template>
            </td>
            <td v-if="showPeriod">
              {{
                program.period_EN === "N/A"
                  ? t("na_")
                  : tObj("period_", program)
              }}
            </td>
            <td v-if="showContact">
              {{
                program.contact_EN === "N/A"
                  ? t("na_")
                  : tObj("contact_", program)
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- <div class="eventList">
            <div v-for="program in displayPrograms" :key="program.id" class="evenItem">
                {{  program }}
            </div>
        </div> -->
    <!-- <UiGrid>
            <EventProgramItem v-for="program in displayPrograms" :key="program.id" :program="program" />
        </UiGrid> -->
  </div>
</template>

<style scoped lang="scss">
.tableContainer {
  width: 100%;
  overflow: auto;
}
.evantTable {
  min-width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 12px;
    text-align: left;
  }
  thead {
    th {
      font-weight: 700;
      border-bottom: 2px solid var(--menu-bg);
      min-width: 200px;
      max-width: calc(100% / var(--column-count));
      &.small {
        min-width: 80px;
        max-width: 30%;
      }
    }
  }
  tbody {
    td {
      font-weight: 300;
      border-bottom: 1px solid #eee;
    }
  }
}
.imageContainer {
  width: 100%;
  img {
    width: 100%;
  }
}
.content {
  background: #fff;
  // padding: 12px;
  padding: var(--app-padding);
  border-top-right-radius: 12px;
  border-bottom-left-radius: 12px;
  // margin-bottom: 24px;
}

.title {
  --hue: 300;
  margin-bottom: calc(var(--app-padding) / 2);
  position: relative;
  .bgGradient {
    position: absolute;
    left: 0;
    top: 0;
    height: 48px;
    width: 100%;
  }
}
.register{
  &.link{
    font-weight: 700;
    background: linear-gradient(
        to right,
        #7953cd 20%,
        #00affa 30%,
        #0190cd 70%,
        #764ada 80%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-fill-color: transparent;
    background-size: 500% auto;
    animation: textShine 3s ease-in-out infinite alternate;
    cursor:pointer;
  }
}

@keyframes textShine {
    0% {
        background-position: 0% 50%;
    }
    100% {
        background-position: 100% 50%;
    }
}
.titleContainer {
  width: fit-content;
  padding: var(--app-padding);
  font-size: 1.6rem;
  line-height: 1.2;
  font-weight: 700;
  display: block;
  position: relative;
  padding-inline: 24px;
  padding-top: 48px;
  background: rgba(255, 241, 93, 0.3);
}

:deep {
  .label {
    font-size: 0.8rem;
    margin-right: 12px;
    white-space: nowrap;
    line-height: 1.3;
  }
  .content {
    font-weight: 700;
  }
  td {
    vertical-align: top;
  }
}

.innerGrid.noPadding {
  padding: 0;
}

.slides {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--app-padding);
  @media (max-width: 960px) {
    grid-template-columns: repeat(1, 1fr);
  }
  .slide {
    width: 100%;
    .slideImgContainer {
      aspect-ratio: 16/9;
      overflow: hidden;
      background: #eee;
    }
    img {
      width: 100%;
      object-fit: cover;
    }
  }
}
.slideVideo {
  width: 100%;
}
</style>
