import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";
import { HomeSidebar, HomeSidebarDrawer } from "@/components/HomeSidebar";
import MemoEditor from "@/components/MemoEditor";
import { EditorRefActions } from "@/components/MemoEditor/Editor";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
// import MobileInput from "@/components/MobileInput";
import PagedMemoList from "@/components/PagedMemoList";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { MemoFilter, useMemoFilterStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { cn } from "@/utils";

const Home = observer(() => {
  const { md, lg, sm } = useResponsiveWidth();
  const user = useCurrentUser();
  const memoFilterStore = useMemoFilterStore();
  const selectedShortcut = userStore.state.shortcuts.find((shortcut) => shortcut.id === memoFilterStore.shortcut);

  const [isVisible, setIsVisible] = useState(true); // 初始状态为可见
  // const [prevScrollY, setPrevScrollY] = useState(window.scrollY); // 存储上一次的滚动位置
  const prevScrollY = useRef(window.scrollY); // 使用 useRef 存储上一次的滚动位置

  useEffect(() => {
    if (!md) {
      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > prevScrollY.current) {
          // 向下滚动，隐藏组件
          setIsVisible(false);
          // console.log("向下滚动，隐藏组件");
        } else if (currentScrollY < prevScrollY.current) {
          // 向上滚动，显示组件
          setIsVisible(true);
          // console.log("向上滚动，显示组件");
        }
        // setPrevScrollY(currentScrollY); // 更新上一次的滚动位置
        prevScrollY.current = currentScrollY; // 直接更新 ref 的当前值
      };

      // 添加滚动事件监听器
      window.addEventListener("scroll", handleScroll);

      // 组件卸载时移除监听器
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [md]);

  const memoListFilter = useMemo(() => {
    const conditions = [];
    const contentSearch: string[] = [];
    const tagSearch: string[] = [];
    for (const filter of memoFilterStore.filters) {
      if (filter.factor === "contentSearch") {
        contentSearch.push(`"${filter.value}"`);
      } else if (filter.factor === "tagSearch") {
        tagSearch.push(`"${filter.value}"`);
        // } else if (filter.factor === "visibility") {
        //   conditions.push(`visibility == "${filter.value}"`);
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

  const [action, setAction] = useState("");
  const [relatedMemoName, setRelatedMemoName] = useState("");
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const handleInput = (action: string, relatedMemoName: string) => {
    // console.log(action + ":", relatedMemoName);
    setAction(action);
    setRelatedMemoName(relatedMemoName);
    scrollToTop();
  };

  // const memoViewStyle = !md && {
  //   position: "fixed",
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   zIndex: 10,
  // };

  const memoViewStyle = !md
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }
    : {};

  return (
    <section className="@container w-full min-h-full flex flex-col justify-start items-center">
      {!md && (
        <MobileHeader>
          <HomeSidebarDrawer />
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
            <HomeSidebar className={cn("py-6")} />
          </div>
        )}
        <div className={cn("w-full mx-auto px-4 sm:px-6 sm:pt-3 md:pt-6 pb-8", md && "max-w-3xl")}>
         <div
              className={cn(
                "w-full")}
            >
              <MemoEditor className="mb-2" cacheKey="home-memo-editor" action={action} relatedMemoName={relatedMemoName} />
            </div>
          {/* {sm ? <MemoEditor className="mb-2" cacheKey="home-memo-editor" /> : <MobileInput />} */}
          <div className="flex flex-col items-start justify-start w-full max-w-full">
            <PagedMemoList
              renderer={(memo: Memo) => (
                <MemoView
                  key={`${memo.name}-${memo.displayTime}`}
                  memo={memo}
                  showVisibility
                  showPinned
                  compact
                  onAutoInput={handleInput}
                />
              )}
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
              owner={user.name}
              direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
              filter={selectedShortcut?.filter || ""}
              oldFilter={memoListFilter}
            />
          </div>
        </div>
      </div>
    </section>
  );
});

export default Home;
