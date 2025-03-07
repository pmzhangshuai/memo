import { Tooltip } from "@mui/joy";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import usePrevious from "react-use/lib/usePrevious";
import Navigation from "@/components/Navigation";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import Loading from "@/pages/Loading";
import { Routes } from "@/router";
import { useMemoFilterStore } from "@/store/v1";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import "@/less/root-layout.less";

const RootLayout = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sm } = useResponsiveWidth();
  const currentUser = useCurrentUser();
  const memoFilterStore = useMemoFilterStore();
  const [initialized, setInitialized] = useState(false);
  const pathname = useMemo(() => location.pathname, [location.pathname]);
  const prevPathname = usePrevious(pathname);
  const t = useTranslate();

  useEffect(() => {
    if (!currentUser) {
      if (([Routes.ROOT, Routes.RESOURCES, Routes.INBOX, Routes.ARCHIVED, Routes.SETTING] as string[]).includes(location.pathname)) {
        window.location.href = Routes.EXPLORE;
        return;
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    // When the route changes and there is no filter in the search params, remove all filters.
    if (prevPathname !== pathname && !searchParams.has("filter")) {
      memoFilterStore.removeFilter(() => true);
    }
  }, [prevPathname, pathname, searchParams]);

  // 添加 collapsed 状态和切换函数
  const [collapsed, setCollapsed] = useState(true);

  // 切换 collapsed 状态的函数
  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  const expandSidebar = (status: boolean) => {
    setCollapsed(status);
  };

  return !initialized ? (
    <Loading />
  ) : (
    <div className="w-full min-h-full">
      <div className={cn("w-full transition-all mx-auto flex flex-row justify-center items-start", "sm:pl-16")}>
        {sm && (
          <div
            className={cn(
              "group flex flex-col justify-start items-start fixed top-0 left-0 select-none border-r dark:border-zinc-800 h-full bg-zinc-100 dark:bg-zinc-800 dark:bg-opacity-40 transition-all hover:shadow-xl z-2",
              collapsed ? "w-16" : "w-56", // 根据 collapsed 状态调整宽度
              "px-2",
              "hover-show-text", // 用于悬停显示文字
            )}
          >
            <Navigation collapsed={collapsed} setCollapsed={expandSidebar} />
            <div className="flex items-center justify-center mt-auto mb-5">
              {collapsed ? (
                <Tooltip title={t("common.expand")} placement="right" arrow>
                  <ChevronRightIcon onClick={toggleCollapsed} className="w-6 h-auto opacity-70 shrink-0" />
                </Tooltip>
              ) : (
                <div className="flex" onClick={toggleCollapsed}>
                  <ChevronLeftIcon className="w-6 h-auto opacity-70 shrink-0" />
                  <span className="hidden ml-2 left">{t("common.collapse")}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <main className={cn("flex flex-col items-center justify-start flex-grow w-full h-auto shrink", collapsed ? "" : "sm:ml-56")}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default RootLayout;
