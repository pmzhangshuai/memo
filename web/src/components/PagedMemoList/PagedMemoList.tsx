import { Button } from "@usememos/mui";
import { ArrowDownIcon, ArrowUpIcon, LoaderIcon, SlashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE } from "@/helpers/consts";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoList, useMemoStore } from "@/store/v1";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { useTranslate } from "@/utils/i18n";
import Empty from "../Empty";

interface Props {
  renderer: (memo: Memo) => JSX.Element;
  listSort?: (list: Memo[]) => Memo[];
  owner?: string;
  isFollow?: boolean;
  state?: State;
  direction?: Direction;
  filter?: string;
  oldFilter?: string;
  pageSize?: number;
}

interface LocalState {
  isRequesting: boolean;
  nextPageToken: string;
}

const PagedMemoList = (props: Props) => {
  const t = useTranslate();
  const { md } = useResponsiveWidth();
  const memoStore = useMemoStore();
  const memoList = useMemoList();
  const [state, setState] = useState<LocalState>({
    isRequesting: true, // Initial request
    nextPageToken: "",
  });
  const sortedMemoList = props.listSort ? props.listSort(memoList.value) : memoList.value;

  const fetchMoreMemos = async (nextPageToken: string) => {
    setState((state) => ({ ...state, isRequesting: true }));
    const response = await memoStore.fetchMemos({
      parent: props.owner || "",
      isFollow: props.isFollow || false,
      state: props.state || State.NORMAL,
      direction: props.direction || Direction.DESC,
      filter: props.filter || "",
      oldFilter: props.oldFilter || "",
      pageSize: props.pageSize || DEFAULT_LIST_MEMOS_PAGE_SIZE,
      pageToken: nextPageToken,
    });
    setState(() => ({
      isRequesting: false,
      nextPageToken: response?.nextPageToken || "",
    }));
  };

  const refreshList = async () => {
    memoList.reset();
    setState((state) => ({ ...state, nextPageToken: "" }));
    await fetchMoreMemos("");
  };

  useEffect(() => {
    refreshList();
  }, [props.owner, props.state, props.direction, props.filter, props.oldFilter, props.pageSize]);

  const children = (
    <div className="flex flex-col items-start justify-start w-full max-w-full">
      {sortedMemoList.map((memo) => props.renderer(memo))}
      {state.isRequesting && (
        <div className="flex flex-row items-center justify-center w-full my-4">
          <LoaderIcon className="animate-spin text-zinc-500" />
        </div>
      )}
      {!state.isRequesting && (
        <>
          {!state.nextPageToken && sortedMemoList.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full mt-12 mb-8 italic">
              <Empty />
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t("message.no-data")}</p>
            </div>
          ) : (
            <div className="flex flex-row items-center justify-center w-full my-4">
              {state.nextPageToken && (
                <>
                  <Button variant="plain" onClick={() => fetchMoreMemos(state.nextPageToken)}>
                    {t("memo.load-more")}
                    <ArrowDownIcon className="w-4 h-auto ml-1" />
                  </Button>
                  <SlashIcon className="w-4 h-auto mx-1 opacity-40" />
                </>
              )}
              <BackToTop />
            </div>
          )}
        </>
      )}
    </div>
  );

  // In case of md screen, we don't need pull to refresh.
  if (md) {
    return children;
  }

  return (
    <PullToRefresh
      onRefresh={() => refreshList()}
      pullingContent={
        <div className="flex flex-row items-center justify-center w-full my-4">
          <LoaderIcon className="opacity-60" />
        </div>
      }
      refreshingContent={
        <div className="flex flex-row items-center justify-center w-full my-4">
          <LoaderIcon className="animate-spin" />
        </div>
      }
    >
      {children}
    </PullToRefresh>
  );
};

const BackToTop = () => {
  const t = useTranslate();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldBeVisible = window.scrollY > 400;
      if (shouldBeVisible !== isVisible) {
        if (shouldBeVisible) {
          setShouldRender(true);
          setIsVisible(true);
        } else {
          setShouldRender(false);
          setIsVisible(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <Button variant="plain" onClick={scrollToTop}>
      {t("router.back-to-top")}
      <ArrowUpIcon className="w-4 h-auto ml-1" />
    </Button>
  );
};

export default PagedMemoList;
