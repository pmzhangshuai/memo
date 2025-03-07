import dayjs from "dayjs";
import { t } from "i18next";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Empty from "@/components/Empty";
import { ExploreSidebar, ExploreSidebarDrawer } from "@/components/ExploreSidebar";
import showFollowedUsersDialog from "@/components/FollowedUsersDialog";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
import PagedMemoList from "@/components/PagedMemoList";
import useCurrentUser from "@/hooks/useCurrentUser";
import useNavigateTo from "@/hooks/useNavigateTo";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoFilterStore, useUserStatsStore, useUserStore } from "@/store/v1";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { FollowingListResponse, User } from "@/types/proto/api/v1/user_service";
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

  const userStatsStore = useUserStatsStore();
  // 切换 Tab 的函数
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Refresh user stats.
    // userStatsStore.setStateId();
  };

  // const [followedUsers, setFollowedUsers] = useState<User[]>([]);
  const [isFetched, setISFetched] = useState(false);
  const [followedUserNames, setFollowedUserNames] = useState<string[]>([]);
  const userStore = useUserStore();
  // const fetchFollowedUsers = async () => {
  //   const users = await userStore.getFollowingList(user.name);
  //   setFollowedUsers(users.users);
  //   setISFetched(true);
  // };
  useEffect(() => {
    if (activeTab === "default") {
      // console.log("列出所有用户的状态");
      userStatsStore.listUserStats();
    } else if (activeTab === "subscriptions") {
      if (user && user.name && !isFetched) {
        userStore
          .getFollowingList(user.name)
          .then((followedUsersResult) => {
            setFollowedUserNames(followedUsersResult.users.map((user) => user.name));
          })
          .catch((error) => {
            // 处理错误，例如显示错误消息
            console.error("Failed to fetch followed users:", error);
          });
        setISFetched(true);
      } else if (!user) {
        // console.log("用户未登录，关注列表为空");
        userStatsStore.listUserStats(undefined, followedUserNames);
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (activeTab === "subscriptions" && isFetched) {
      // console.log("列出关注用户的状态");
      userStatsStore.listUserStats(undefined, followedUserNames);
    }
  }, [activeTab, followedUserNames, isFetched]);

  const handleFollowing = () => {
    if (user && user.name) {
      showFollowedUsersDialog(user, handleNavigate);
    } else {
      toast.error(t("message.no-login-status"));
    }
  };

  const navigateTo = useNavigate();
  const handleNavigate = (route: string) => {
    // 执行导航操作，例如使用 useNavigate 钩子
    navigateTo(route);
  };

  // 根据 activeTab 渲染不同的内容
  const renderMemoList = () => {
    if (activeTab === "default") {
      // 渲染当前 Memo 列表
      return (
        <PagedMemoList
          renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showCreator showVisibility compact />}
          listSort={(memos: Memo[]) => {
            let sortedMemos = memos.filter(
              (memo) =>
                memo.state === State.NORMAL &&
                memoFilterStore.filters.every((filter) => {
                  if (filter.factor === "visibility") {
                    return memo.visibility === filter.value;
                  } else if (filter.factor === "resources") {
                    return memo.resources.length > 0;
                  } else {
                    return true;
                  }
                }),
            );
            sortedMemos =
              memoFilterStore.orderByComment === "asc" || memoFilterStore.orderByComment === "desc"
                ? sortedMemos.sort((a, b) => {
                    // 计算 memo a 中 type 为 COMMENT 的 relations 数量
                    const commentCountA = a.relations.filter((relation) => relation.type === "COMMENT").length;
                    // 计算 memo b 中 type 为 COMMENT 的 relations 数量
                    const commentCountB = b.relations.filter((relation) => relation.type === "COMMENT").length;
                    return memoFilterStore.orderByComment === "asc"
                      ? commentCountA - commentCountB // 升序
                      : commentCountB - commentCountA; // 降序
                  })
                : memoFilterStore.orderByReactions === "asc" || memoFilterStore.orderByReactions === "desc"
                  ? sortedMemos.sort((a, b) => {
                      const reactionsLengthA = a.reactions.length;
                      const reactionsLengthB = b.reactions.length;
                      return memoFilterStore.orderByReactions === "asc"
                        ? reactionsLengthA - reactionsLengthB // 升序
                        : reactionsLengthB - reactionsLengthA; // 降序
                    })
                  : sortedMemos.sort((a, b) =>
                      memoFilterStore.orderByTimeAsc
                        ? dayjs(a.displayTime).unix() - dayjs(b.displayTime).unix()
                        : dayjs(b.displayTime).unix() - dayjs(a.displayTime).unix(),
                    );
            sortedMemos = sortedMemos.sort((a, b) => Number(b.pinned) - Number(a.pinned));
            return sortedMemos;
          }}
          direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
          oldFilter={memoListFilter}
        />
      );
    } else if (activeTab === "subscriptions") {
      // 渲染已关注用户发布的 Memo 列表
      return user ? (
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
          owner={user.name}
          isFollow={true}
          direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
          oldFilter={memoListFilter}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full mt-12 mb-8 italic">
          <Empty />
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t("message.no-data")}</p>
        </div>
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
        <div className={cn("w-full mx-auto px-4 sm:px-6 sm:pt-3 md:pt-6 pb-8", md && "max-w-3xl")}>
          <div className="flex flex-col items-start justify-start w-full max-w-full">
            {/* 添加 Tab 按钮 */}
            <div className="flex items-center justify-between w-full">
              <div className="flex mb-4">
                <button
                  className={cn(
                    "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                    activeTab === "default" ? "text-blue-500 font-bold" : "text-gray-500", // 选中时高亮，未选中时灰色
                  )}
                  onClick={() => handleTabChange("default")}
                >
                  默认
                </button>
                <button
                  className={cn(
                    "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                    activeTab === "subscriptions" ? "text-blue-500 font-bold" : "text-gray-500", // 选中时高亮，未选中时灰色
                  )}
                  onClick={() => handleTabChange("subscriptions")}
                >
                  订阅
                </button>
              </div>
              {activeTab === "subscriptions" && (
                <div className="px-4 py-2 mb-4" onClick={handleFollowing}>
                  <Settings className="w-5 h-auto text-gray-500 hover:opacity-70" />
                </div>
              )}
            </div>
            {renderMemoList()}
          </div>
        </div>
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
      </div>
    </section>
  );
};

export default Explore;
