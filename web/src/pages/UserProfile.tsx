import { Button } from "@usememos/mui";
import { Rss } from 'lucide-react';
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import MemoFilters from "@/components/MemoFilters";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
import PagedMemoList from "@/components/PagedMemoList";
import UserAvatar from "@/components/UserAvatar";
import useCurrentUser from "@/hooks/useCurrentUser";
import useLoading from "@/hooks/useLoading";
import { useMemoFilterStore, useUserStore } from "@/store/v1";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { User } from "@/types/proto/api/v1/user_service";
import { useTranslate } from "@/utils/i18n";

const UserProfile = () => {
  const t = useTranslate();
  const params = useParams();
  const userStore = useUserStore();
  const loadingState = useLoading();
  const [user, setUser] = useState<User>();
  const memoFilterStore = useMemoFilterStore();

  const currentUser = useCurrentUser();
  const readonly = user?.name !== currentUser?.name;

  useEffect(() => {
    const username = params.username;
    if (!username) {
      throw new Error("username is required");
    }

    userStore
      .fetchUserByUsername(username)
      .then((user) => {
        setUser(user);
        loadingState.setFinish();
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("message.user-not-found"));
      });
  }, [params.username]);

  const memoListFilter = useMemo(() => {
    if (!user) {
      return "";
    }

    const conditions = [];
    const contentSearch: string[] = [];
    const tagSearch: string[] = [];
    for (const filter of memoFilterStore.filters) {
      if (filter.factor === "contentSearch") {
        contentSearch.push(`"${filter.value}"`);
      } else if (filter.factor === "tagSearch") {
        tagSearch.push(`"${filter.value}"`);
      }
    }
    if (contentSearch.length > 0) {
      conditions.push(`content_search == [${contentSearch.join(", ")}]`);
    }
    if (tagSearch.length > 0) {
      conditions.push(`tag_search == [${tagSearch.join(", ")}]`);
    }
    return conditions.join(" && ");
  }, [user, memoFilterStore.filters]);

  const handleRssLink = () => {
    if (!user) {
      return;
    }
    // 在新标签页中打开链接
    window.open(`http://localhost:8081/u/${encodeURIComponent(user.username)}/rss.xml`);
  };

  const handleCopyProfileLink = () => {
    if (!user) {
      return;
    }

    copy(`${window.location.origin}/u/${encodeURIComponent(user.username)}`);
    toast.success(t("message.copied"));
  };

  return (
    <section className="flex flex-col items-center justify-start w-full max-w-5xl min-h-full pb-8 sm:pt-3 md:pt-6">
      <MobileHeader />
      <div className="flex flex-col items-center justify-start w-full px-4 sm:px-6">
        {!loadingState.isLoading &&
          (user ? (
            <>
              <div className="flex items-center justify-end w-full gap-2 my-4">
                <Button variant="outlined" onClick={handleRssLink}>
                  {t("common.rss")}
                  <Rss className="w-4 h-auto ml-1 opacity-60" />
                </Button>
                <Button variant="outlined" onClick={handleCopyProfileLink}>
                  {t("common.share")}
                  <ExternalLinkIcon className="w-4 h-auto ml-1 opacity-60" />
                </Button>
              </div>
              <div className="flex flex-col items-start justify-start w-full px-3 pt-4 pb-8">
                <UserAvatar className="!w-16 !h-16 drop-shadow rounded-3xl" avatarUrl={user?.avatarUrl} />
                <div className="mt-2 w-auto max-w-[calc(100%-6rem)] flex flex-col justify-center items-start">
                  <p className="w-full text-3xl font-medium leading-tight text-black truncate opacity-80 dark:text-gray-200">
                    {user.nickname || user.username}
                  </p>
                  <p className="w-full leading-snug text-gray-500 truncate whitespace-pre-wrap dark:text-gray-400 line-clamp-6">
                    {user.description}
                  </p>
                  {/* <p>{currentUser?.name}</p>
                  <p>{user?.name}</p> */}
                  {readonly && (
                    <div className="flex gap-2 mt-4">
                      <Button color="primary" size="sm">{t("common.subscribe")}</Button>
                      {/* <Button size="sm" color="primary" variant="outlined">
                        私信
                      </Button> */}
                    </div>
                  )}
                </div>
              </div>
              <MemoFilters />
              <PagedMemoList
                renderer={(memo: Memo) => (
                  <MemoView key={`${memo.name}-${memo.displayTime}`} memo={memo} showVisibility showPinned compact />
                )}
                listSort={(memos: Memo[]) =>
                  memos
                    .filter((memo) => memo.state === State.NORMAL)
                    .sort((a, b) =>
                      memoFilterStore.orderByTimeAsc
                        ? dayjs(a.displayTime).unix() - dayjs(b.displayTime).unix()
                        : dayjs(b.displayTime).unix() - dayjs(a.displayTime).unix(),
                    )
                    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                }
                owner={user.name}
                direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
                oldFilter={memoListFilter}
              />
            </>
          ) : (
            <p>Not found</p>
          ))}
      </div>
    </section>
  );
};

export default UserProfile;
