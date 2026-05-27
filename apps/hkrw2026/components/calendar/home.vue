<script setup lang="ts">
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ScheduleXCalendar } from "@schedule-x/vue";
import {
  createCalendar,
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import "@schedule-x/theme-default/dist/index.css";
dayjs.extend(isBetween);
const calendarControls = createCalendarControlsPlugin();
const eventsServicePlugin = createEventsServicePlugin();

const { find } = useStrapi();
const { tObj, t, currentLang } = useLang({
  detailHK: "詳情",
  detailEN: "Detail",
  scheduleHK: "按此放大",
  scheduleEN: "click here to Enlarge",
  fulleDayHK: "全天",
  fulleDayEN: "Full Day",
});

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
  }
}

const { data } = useAsyncData("events", () =>
  find("events", {
    populate: {
      programs: {
        populate: "*",
      },
    },
  }),
);

const { allEvents, sortForSchedule, loading, calendarLang } = useEvents();

const router = useRouter();
const calendarApp = createCalendar({
  locale: "en-US",
  views: [createViewMonthAgenda()],
  events: [],
  minDate: "2026-07-01",
  maxDate: "2026-08-31",
  selectedDate: dayjs("2026-07-01").format("YYYY-MM-DD"),
  plugins: [eventsServicePlugin, calendarControls],
  callbacks: {
    onRender: ($app) => {
      const range = $app.calendarState.range.value;
      updateDateLabel(range);
    },
    onRangeUpdate: (range) => {
      updateDateLabel(range);
    },
    onEventClick: (event) => {
      if (event.url) {
        router.push(event.url);
      }
    },
    onSelectedDateUpdate: (date) => {
      makeList();
    },
  },
});

function eventClick(event: any) {
  if (event.url) {
    router.push(event.url);
  }
}

const serverEvents = ref<any[]>([]);
function getEvents() {
  const events: any[] = [];
  for (const event of allEvents.value) {
    for (const program of event.programs) {
      if (!program.startDate || !program.endDate) continue;
      events.push({
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
        _options: {
          additionalClasses: !program.startTime ? ["isFullDay"] : [],
        },
        isFullDay: !program.startTime,
        data: {
          event,
          program,
        },
      });
    }
  }
  serverEvents.value = events;
  calendarApp.events.set(events);
  makeList();
}

const renderList = ref<any[]>([]);
function makeList() {
  const date = calendarControls.getDate();
  const allRelatedEvents = serverEvents.value
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
  allEvents,
  () => {
    getEvents();
  },
  {
    immediate: true,
    deep: true,
  },
);

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
      getEvents();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div ref="root" class="calendarContainer">
    <ScheduleXCalendar v-if="calendarApp" :calendar-app="calendarApp">
      <template #monthAgendaEvent> </template>
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
    <div class="btnContainer">
      <ElButton
        class="moreButton"
        @click="$router.push('/search')"
        size="small"
        >{{ t("schedule") }}</ElButton
      >
    </div>
  </div>
</template>

<style lang="scss">
.sx__event {
  cursor: pointer;
}
.sx__forward-backward-navigation {
  display: none;
}
.sx__date-picker__month-view-header .sx__chevron-wrapper{
  display: none;
}
</style>

<style scoped lang="scss">
.btnContainer {
  position: absolute;
  bottom: -12px;
  width: 100%;
  left: 0;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  z-index: 1;
}
.eventsContainer {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  max-height: 200px;
  overflow: auto;
  padding-bottom: 24px;
}
.calendarContainer {
  width: 100%;
  max-width: 320px;
  overflow: visible;
  position: relative;

  @media (max-width: 720px) {
    max-width: 100%;
  }
  :deep(.sx__month-agenda-events) {
    display: flex;
    flex-flow: column nowrap;
    justify-content: flex-start;
    align-items: flex-start;
    max-height: 200px;
    overflow: auto;
    padding-bottom: 24px;
    display: none;
  }
  :deep(.sx__calendar) {
    overflow: visible;
  }
  :deep(.sx__month-agenda-event) {
    cursor: pointer;
    width: 100%;
    padding: var(--sx-spacing-padding2) !important;
    background-color: var(--sx-color-primary-container);
    color: var(--sx-color-on-primary-container);
    border-left: 4px solid var(--sx-color-primary);
    order: 0;
    &:has(.isFullDay) {
      order: 1;
    }
    .sx__event-icon {
      margin-inline-end: 0 !important;
    }
  }
}
</style>
