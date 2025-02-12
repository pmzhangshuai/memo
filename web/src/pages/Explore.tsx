import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ExploreSidebar, ExploreSidebarDrawer } from "@/components/ExploreSidebar";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
import PagedMemoList from "@/components/PagedMemoList";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoFilterStore } from "@/store/v1";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { cn } from "@/utils";

const Explore = () => {
  const { md, lg } = useResponsiveWidth();
  const user = useCurrentUser();
  const memoFilterStore = useMemoFilterStore();

  const memoListFilter = useMemo(() => {
    const conditions = [];
    const contentSearch: string[] = [];
    const tagSearch: string[] = [];
    for (const filter of memoFilterStore.filters) {
      if (filter.factor === "contentSearch") {
        contentSearch.push(`"${filter.value}"`);
      } else if (filter.factor === "tagSearch") {
        tagSearch.push(`"${filter.value}"`);
      } else if (filter.factor === "property.hasLink") {
        conditions.push(`has_link == true`);
      } else if (filter.factor === "property.hasTaskList") {
        conditions.push(`has_task_list == true`);
      } else if (filter.factor === "property.hasCode") {
        conditions.push(`has_code == true`);
      } else if (filter.factor === "displayTime") {
        const filterDate = new Date(filter.value);
        const filterUtcTimestamp = filterDate.getTime() + filterDate.getTimezoneOffset() * 60 * 1000;
        const timestampAfter = filterUtcTimestamp / 1000;
        conditions.push(`display_time_after == ${timestampAfter}`);
        conditions.push(`display_time_before == ${timestampAfter + 60 * 60 * 24}`);
      }
    }
    if (contentSearch.length > 0) {
      conditions.push(`content_search == [${contentSearch.join(", ")}]`);
    }
    if (tagSearch.length > 0) {
      conditions.push(`tag_search == [${tagSearch.join(", ")}]`);
    }
    return conditions.join(" && ");
  }, [user, memoFilterStore.filters, memoFilterStore.orderByTimeAsc]);

  // 添加状态来管理当前选中的 Tab
  const [activeTab, setActiveTab] = useState("default"); // 'default' 或 'subscriptions'

  // 切换 Tab 的函数
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // 根据 activeTab 渲染不同的内容
  const renderMemoList = () => {
    if (activeTab === "default") {
      // 渲染当前 Memo 列表
      return (
        <PagedMemoList
          renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showCreator showVisibility compact />}
          listSort={(memos: Memo[]) =>
            memos
              .filter((memo) => memo.state === State.NORMAL)
              .sort((a, b) =>
                memoFilterStore.orderByTimeAsc
                  ? dayjs(a.displayTime).unix() - dayjs(b.displayTime).unix()
                  : dayjs(b.displayTime).unix() - dayjs(a.displayTime).unix(),
              )
          }
          direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
          oldFilter={memoListFilter}
        />
      );
    } else if (activeTab === "subscriptions") {
      // 渲染已关注用户发布的 Memo 列表
      // 这里需要获取已关注用户的 Memo 列表，可能需要调用 API 或使用其他状态管理
      // 为了示例，这里只是返回一个空列表或占位符
      return (
        <div>Subscribed Memos will go here...</div>
        // 或者调用一个获取订阅 Memo 的组件/函数
        // <SubscribedMemoList />
      );
    }
    return null;
  };

  return (
    <section className="@container w-full min-h-full flex flex-col justify-start items-center">
      {!md && (
        <MobileHeader>
          <ExploreSidebarDrawer />
        </MobileHeader>
      )}
      <div className={cn("w-full min-h-full flex flex-row justify-start items-start")}>
        {md && (
          <div
            className={cn(
              "sticky top-0 left-0 shrink-0 h-[100svh] transition-all",
              "border-r border-gray-200 dark:border-zinc-800",
              lg ? "px-5 w-72" : "px-4 w-56",
            )}
          >
            <ExploreSidebar className={cn("py-6")} />
          </div>
        )}
        <div className={cn("w-full mx-auto px-4 sm:px-6 sm:pt-3 md:pt-6 pb-8", md && "max-w-3xl")}>
          <div className="flex flex-col items-start justify-start w-full max-w-full">
            {/* 添加 Tab 按钮 */}
            <div className="flex mb-4">
              <button
                className={cn(
                  "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                  activeTab === "default" ? "text-blue-500 font-bold" : "text-gray-500" // 选中时高亮，未选中时灰色
                )}
                onClick={() => handleTabChange("default")}
              >
                默认
              </button>
              <button
                className={cn(
                  "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                  activeTab === "subscriptions" ? "text-blue-500 font-bold" : "text-gray-500" // 选中时高亮，未选中时灰色
                )}
                onClick={() => handleTabChange("subscriptions")}
              >
                订阅
              </button>
            </div>
            {renderMemoList()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
