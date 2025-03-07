import { Tooltip } from "@mui/joy";
import dayjs from "dayjs";
import { useWorkspaceSettingStore } from "@/store/v1";
import { WorkspaceGeneralSetting } from "@/types/proto/api/v1/workspace_setting_service";
import { WorkspaceSettingKey } from "@/types/proto/store/workspace_setting";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";

interface Props {
  month: string; // Format: 2021-1
  selectedDate: string;
  data: Record<string, number>;
  onClick?: (date: string) => void;
}

const getCellAdditionalStyles = (count: number, maxCount: number) => {
  if (count === 0) {
    return "";
  }
  const ratio = count / maxCount;
  if (ratio > 0.75) {
    return "bg-primary-darker/90 text-gray-100 dark:bg-primary-lighter/80";
  } else if (ratio > 0.5) {
    return "bg-primary-darker/70 text-gray-100 dark:bg-primary-lighter/60";
  } else if (ratio > 0.25) {
    return "bg-primary/70 text-gray-100 dark:bg-primary-lighter/40";
  } else {
    return "bg-primary/50 text-gray-100 dark:bg-primary-lighter/20";
  }
};

const ActivityCalendar = (props: Props) => {
  const t = useTranslate();
  const { month: monthStr, data, onClick } = props;
  const workspaceSettingStore = useWorkspaceSettingStore();
  const weekStartDayOffset = (
    workspaceSettingStore.getWorkspaceSettingByKey(WorkspaceSettingKey.GENERAL).generalSetting || WorkspaceGeneralSetting.fromPartial({})
  ).weekStartDayOffset;

  const year = dayjs(monthStr).toDate().getFullYear();
  const month = dayjs(monthStr).toDate().getMonth();
  const dayInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (((new Date(year, month, 1).getDay() - weekStartDayOffset) % 7) + 7) % 7;
  const lastDay = new Date(year, month, dayInMonth).getDay() - weekStartDayOffset;
  const prevMonthDays = new Date(year, month, 0).getDate();

  const WEEK_DAYS = [t("days.sun"), t("days.mon"), t("days.tue"), t("days.wed"), t("days.thu"), t("days.fri"), t("days.sat")];
  const weekDays = WEEK_DAYS.slice(weekStartDayOffset).concat(WEEK_DAYS.slice(0, weekStartDayOffset));
  const maxCount = Math.max(...Object.values(data));
  const days = [];

  // Fill in previous month's days.
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Fill in current month's days.
  for (let i = 1; i <= dayInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }

  // Fill in next month's days.
  for (let i = 1; i < 7 - lastDay; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  return (
    <div className={cn("w-full h-auto shrink-0 grid grid-cols-7 grid-flow-row gap-1")}>
      {weekDays.map((day, index) => (
        <div key={index} className={cn("w-6 h-5 text-xs flex justify-center items-center cursor-default opacity-60")}>
          {day}
        </div>
      ))}
      {days.map((item, index) => {
        const date = dayjs(`${year}-${month + 1}-${item.day}`).format("YYYY-MM-DD");

        if (!item.isCurrentMonth) {
          return (
            <div
              key={`${date}-${index}`}
              className={cn("w-6 h-6 text-xs lg:text-[13px] flex justify-center items-center cursor-default", "opacity-60 text-gray-400")}
            >
              {item.day}
            </div>
          );
        }

        const count = item.isCurrentMonth ? data[date] || 0 : 0;
        const isToday = dayjs().format("YYYY-MM-DD") === date;
        const tooltipText =
          count === 0
            ? t("memo.no-memos")
            : t("memo.count-memos-in-date", {
                count: count,
                memos: count === 1 ? t("common.memo") : t("common.memos"),
                date: date,
              }).toLowerCase();
        const isSelected = dayjs(props.selectedDate).format("YYYY-MM-DD") === date;

        return (
          <Tooltip className="shrink-0" key={`${date}-${index}`} title={tooltipText} placement="top" arrow>
            <div className="relative">
              <div
                className={cn(
                  "w-6 h-6 text-xs lg:text-[13px] rounded-md flex justify-center items-center cursor-default",
                  "border-[1px] text-gray-400",
                  item.isCurrentMonth && "bg-gray-100 dark:bg-gray-800",
                  item.isCurrentMonth && getCellAdditionalStyles(count, maxCount),
                  item.isCurrentMonth && isToday && "border-primary",
                  item.isCurrentMonth && isSelected && "font-medium border-primary",
                  item.isCurrentMonth && !isToday && !isSelected && "border-transparent",
                )}
                onClick={() => count && onClick && onClick(date)}
              >
                {item.day}
              </div>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ActivityCalendar;
