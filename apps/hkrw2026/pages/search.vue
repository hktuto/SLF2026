<script setup lang="ts">
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { createCalendar, createViewMonthAgenda } from "@schedule-x/calendar";
import "@schedule-x/theme-default/dist/index.css";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
const calendarControls = createCalendarControlsPlugin();
const eventsServicePlugin = createEventsServicePlugin();
// import { ElButton, ElInput, ElSelect, ElOption } from 'element-plus'
dayjs.extend(isBetween);
import { Modal } from "usemodal-vue3";
import ProgramItem from "~/components/event/programItem.vue";

let isVisible = ref(false);
const { allDistrict, bigDistrict } = useDistrict();
const calendarEl = ref();
const { searchCategory } = useCategories();
const { allEvents, sortForSchedule, loading, calendarLang } = useEvents();
const selectedProgram = ref();
const { tObj, currentLang, t } = useLang({
  tableDateEN: "Programme Date/Time",
  tableLocationEN: "Venue",
  tableRegisterEN: "Registration / Enquiry",
  tablePeriodEN: "Registration Period",
  tableNameHK: "活動名稱",
  tableNameEN: "Event Name",
  tableDateHK: "活動日期及時間",
  tableLocationHK: "地點",
  tableRegisterHK: "報名及查詢",
  tablePeriodHK: "報名日期",
  tableHostEN: "Host",
  tableTargetEN: "Target",
  tableQuotaEN: "Quota",
  tableHostHK: "講者/主持",
  tableTargetHK: "對象",
  tableQuotaHK: "名額",
  addToCalendarHK: "加入行事曆",
  addToCalendarEN: "Add to calendar",
  detailHK: "詳情",
  detailEN: "Detail",
  closeHK: "關閉",
  closeEN: "Close",
  keywordHK: "關鍵字",
  keywordEN: "Keyword",
  categoryHK: "類別",
  categoryEN: "Category",
  dateRangeHK: "日期區間",
  dateRangeEN: "Date Range",
  districtHK: "地區",
  districtEN: "District",
  detailDistrictHK: "分區",
  detailDistrictEN: "Detail District",
  allHK: "全部",
  allEN: "All",
  fulleDayHK: "全天",
  fulleDayEN: "Full Day",
});

const form = ref({
  keyword: "",
  category: "",
  daterange: [],
  district: "",
  detailDistrict: "",
});

const displayDistrict = computed(() => {
  if (!form.value.district || form.value.district === "All")
    return allDistrict.value;
  return allDistrict.value.filter(
    (item) => item.event.main_district === form.value.district,
  );
});

let calendarApp = createCalendar({
  views: [createViewMonthAgenda()],
  locale: "en-US",
  isDark: false,
  minDate: "2026-07-01",
  maxDate: "2026-07-31",
  selectedDate: dayjs("2026-07-01").format("YYYY-MM-DD"),
  plugins: [eventsServicePlugin, calendarControls],
  events: [],
  callbacks: {
    onRender: ($app) => {
      const range = $app.calendarState.range.value;
      updateDateLabel(range);
    },
    onRangeUpdate: (range) => {
      updateDateLabel(range);
    },
    onEventClick(calendarEvent) {
      selectedProgram.value = calendarEvent;
      isVisible.value = true;
    },
    onSelectedDateUpdate: (date) => {
      makeList();
    },
  },
});

function eventClick(event: any) {
  selectedProgram.value = event;
  isVisible.value = true;
}

const renderList = ref<any[]>([]);
function makeList() {
  const date = calendarControls.getDate();
  const allRelatedEvents = displayEvent.value
    .filter((item) => {
      if (item.isFullDay) {
        const eventStart = dayjs(item.start, "YYYY-MM-DD");
        const eventEnd = dayjs(item.end, "YYYY-MM-DD");
        const filterDate = dayjs(date, "YYYY-MM-DD");
        return (
          filterDate.isBetween(eventStart, eventEnd, "day") ||
          filterDate.isSame(eventStart, "day") ||
          filterDate.isSame(eventEnd, "day")
        );
      } else {
        const eventDate = dayjs(date, "YYYY-MM-DD");
        const eventStart = dayjs(item.start, "YYYY-MM-DD");
        const eventEnd = dayjs(item.end, "YYYY-MM-DD");
        return (
          eventDate.isBetween(eventStart, eventEnd, "day") ||
          eventDate.isSame(eventStart, "day") ||
          eventDate.isSame(eventEnd, "day")
        );
        // return item.start.includes(date)
      }
    })
    .sort((a, b) => {
      if (a.isFullDay && !b.isFullDay) {
        return 1;
      }
      if (!a.isFullDay && b.isFullDay) {
        return -1;
      }
      if (a.isFullDay && b.isFullDay) {
        return a.start.localeCompare(b.start);
      }
      if (a.start === b.start) {
        return a.title.localeCompare(b.title);
      }
      return a.start.localeCompare(b.start);
    });
  renderList.value = allRelatedEvents;
}

const displayEvent = ref<any[]>([]);

function filterEvent() {
  const events: any[] = [];
  const fullDayEvents: any[] = [];
  for (const event of allEvents.value) {
    if (form.value.keyword) {
      let allStr =
        (event.content_EN || "") +
        (event.content_HK || "") +
        (event.host_EN || "") +
        (event.host_HK || "") +
        (event.target_EN || "") +
        (event.target_HK || "") +
        (event.quota_EN || "") +
        (event.quota_HK || "") +
        (event.title_EN || "") +
        (event.title_HK || "");
      allStr = allStr.toLowerCase();
      if (!allStr.includes(form.value.keyword.toLowerCase())) {
        continue;
      }
    }
    if (form.value.category) {
      const item = event.categories.data.find(
        (item: any) => item.id === form.value.category,
      );
      if (!item && form.value.category !== "All") {
        continue;
      }
    }

    for (const program of event.programs) {
      if (!program.startDate || !program.endDate) continue;
      if (form.value.daterange.length > 0) {
        if (!program.startDate || !program.endDate) continue;
        if (
          dayjs(form.value.daterange[0]).isAfter(program.startDate) ||
          dayjs(form.value.daterange[1]).isBefore(program.endDate)
        )
          continue;
      }
      if (form.value.district) {
        if (
          !program.district ||
          (program.district.main_district !== form.value.district &&
            form.value.district !== "All")
        )
          continue;
      }
      if (form.value.detailDistrict) {
        if (
          !program.district ||
          (program.district.id !== form.value.detailDistrict &&
            form.value.detailDistrict !== "All")
        )
          continue;
      }
      // convert endDate from hh:mm:ss to hh:mm
      // const startDate = dayjs(program.startDate + ' ' + program.startTime).format('YYYY-MM-DD HH:MM')
      // const endDate = dayjs(program.endDate + ' ' + program.endTime).format('YYYY-MM-DD HH:MM')
      const p = {
        id: event.id + program.id,
        title: tObj("title_", event),
        url: `/event/${event.documentId}`,
        location: tObj("location_", program),
        start:
          program.startDate +
          (program.startTime ? " " + program.startTime.substring(0, 5) : ""),
        end:
          program.endDate +
          (program.endTime ? " " + program.endTime.substring(0, 5) : ""),
        isFullDay: !program.startTime,
        data: {
          event,
          program,
        },
      };
      events.push(p);
    }
  }
  // sort event by start date asc , if start date is same, sort by event title_EN
  displayEvent.value = events.sort((a, b) => {
    if (a.start === b.start) {
      return a.title.localeCompare(b.title);
    } else {
      return a.start.localeCompare(b.start);
    }
  });
  calendarApp.events.set(displayEvent.value);
  makeList();
}

function updateDateLabel(dataRange: any) {
  const header = document.querySelector(".sx__range-heading");
  if (!header || currentLang.value === "EN") return;
  if (dataRange) {
    // if dataRange.start is not 1st , that mean current month is next month
    const startDate = dayjs(dataRange.start);
    let startYear = startDate.get("year");
    let startMonth = startDate.get("month");
    if (startMonth !== 1) {
      // if start date is not 1st and start month is decemeber, that mean curren year is next year
      startMonth = startMonth + 1;
      if (startDate.get("month") === 11) {
        startYear += 1;
      }
    }
    header.innerHTML = `${startYear}年 ${startMonth + 1}月`;
    // console.log("startDate", startDate)
    // check if range us
  }
}

function displayEventTime(dayTime: string, endTime: string) {
  // dayTime format can be YYYY-MM-DD or YYYY-MM-DD HH:mm,
  // step 1 separate dayTime to day and time
  const dayTimeArr = dayTime.split(" ");
  if (dayTimeArr.length === 1) {
    return t("fulleDay");
  } else {
    const endTimeArr = endTime.split(" ");
    return dayTimeArr[1] + " - " + endTimeArr[1];
  }
}

watch(
  currentLang,
  (newLocale) => {
    const locale =
      newLocale === "HK" ? "zh-TW" : newLocale === "CN" ? "zh-CN" : "en-US";
    calendarControls.setLocale(locale);
    if (newLocale !== "EN" && calendarApp.$app.calendarState.range.value) {
      const range = calendarApp.$app.calendarState.range.value;
      nextTick(() => {
        updateDateLabel(range);
      });
    }
    if (calendarApp.$app.calendarState.range.value) {
      // check if calendarApp is ready
      filterEvent();
    }
  },
  {
    immediate: true,
  },
);

watch(
  form,
  () => {
    filterEvent();
  },
  {
    deep: true,
  },
);
watch(
  allEvents,
  () => {
    filterEvent();
  },
  {
    immediate: true,
    deep: true,
  },
);

const config = useRuntimeConfig();
useSeoMeta({
  title: config.public.siteName + " | " + "Schedule",
});
onMounted(() => {
  const { gtag } = useGtag()
  gtag('event', 'page_view', {
      page_title:  config.public.siteName + " | " + 'Schedule',
      page_location: window.location.href
  });
});
</script>

<template>
  <div class="pageContainer innerGrid">
    <div class="title gradientText">
      <!--            {{ t('name')}}-->
    </div>
    <div class="content">
      <div class="filterContainer">
        <ElRow :gutter="12">
          <ElCol :span="12">
            <ElFormItem :label="t('keyword')">
              <ElInput v-model="form.keyword" :placeholder="t('keyword')" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem :label="t('category')">
              <ElSelect
                v-model="form.category"
                clearable
                :placeholder="t('category')"
              >
                <ElOption value="All" :label="t('all')" />
                <ElOption
                  v-for="item in searchCategory"
                  :key="item.value"
                  :label="item.name"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="12">
          <!-- <ElCol :span="8">
                        <ElFormItem :label="t('dateRange')">
                            <ElDatePicker
                                v-model="form.daterange"
                                type="daterange"
                                range-separator="To"
                                start-placeholder="Start date"
                                end-placeholder="End date"
                            >
                            </ElDatePicker>
                        </ElFormItem>
                    </ElCol> -->
          <ElCol :span="12">
            <ElFormItem :label="t('district')">
              <ElSelect v-model="form.district" clearable>
                <ElOption value="All" :label="t('all')" />
                <ElOption
                  v-for="item in bigDistrict"
                  :key="item.value"
                  :value="item.value"
                  :label="tObj('label_', item)"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem :label="t('detailDistrict')">
              <ElSelect v-model="form.detailDistrict" clearable>
                <ElOption value="All" :label="t('all')" />
                <ElOption
                  v-for="item in displayDistrict"
                  :key="item.id"
                  :label="tObj('label_', item)"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
        </ElRow>
      </div>
    </div>
    <div class="content">
      <ScheduleXCalendar v-if="calendarApp" :calendar-app="calendarApp">
        <!-- <template #monthAgendaEvent="" >

                </template> -->
      </ScheduleXCalendar>
      <div class="eventsContainer">
        <div
          v-for="event in renderList"
          :key="event.id"
          class="sx__event sx__month-agenda-event"
          @click="eventClick(event)"
        >
          <div
            :class="{
              ['sx__month-agenda-event__title']: true,
              isFullDay: event.isFullDay,
            }"
          >
            {{ event.title }}
          </div>
          <div
            class="sx__month-agenda-event__time sx__month-agenda-event__has-icon"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="sx__event-icon"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M12 8V12L15 15"
                  stroke="var(--sx-color-on-primary-container)"
                  stroke-width="2"
                  stroke-linecap="round"
                ></path>
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="var(--sx-color-on-primary-container)"
                  stroke-width="2"
                ></circle>
              </g>
            </svg>
            <div>{{ displayEventTime(event.start, event.end) }}</div>
          </div>
        </div>
      </div>
    </div>

    <Modal
      v-if="selectedProgram"
      v-model:visible="isVisible"
      title=""
      :cancelButton="{ text: t('close'), onClick: () => (isVisible = false) }"
      :okButton="{
        text: t('detail'),
        onclick: () => $router.push(selectedProgram.url),
      }"
    >
      <div class="modalContent">
        <h3>
          {{ tObj("title_", selectedProgram.data.event) }}
        </h3>
        <ProgramItem :program="selectedProgram.data.program" />
      </div>
    </Modal>
  </div>
</template>

<style scoped lang="scss">
.eventsContainer {
  margin-top: 24px;
}
.content {
  background: #fff;
  padding: 12px;
  border-top-right-radius: 12px;
  border-bottom-left-radius: 12px;
  margin-bottom: 24px;
  :deep(.sx__month-agenda-events) {
    display: flex;
    flex-flow: column nowrap;
    justify-content: flex-start;
    align-items: flex-start;
    display: none;
  }
  :deep(.sx__calendar) {
    overflow: visible;
  }
  :deep(.sx__date-picker-wrapper){
    display: none;
  }
  :deep(.sx__month-agenda-event) {
    cursor: pointer;
    width: 100%;
    padding: var(--sx-spacing-padding2) !important;
    background-color: var(--sx-color-primary-container);
    color: var(--sx-color-on-primary-container);
    border-left: 4px solid var(--sx-color-primary);
    order: 0;
    &:first-child {
      margin-top: 0 !important;
    }
    &:has(.isFullDay) {
      order: 1;
    }
    .sx__event-icon {
      margin-inline-end: 0 !important;
    }
  }
}
.filterContainer {
  // display: flex;
  // flex-flow: row nowrap;
  // justify-content: flex-start;
  // align-items: center;
  // gap: 12px;
  :deep {
    .el-date-editor {
      width: 100%;
    }
  }
}
</style>
