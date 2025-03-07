import { Tooltip } from "@mui/joy";
import { InboxIcon, LoaderIcon, MessageCircleIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { activityServiceClient } from "@/grpcweb";
import useAsyncEffect from "@/hooks/useAsyncEffect";
import useNavigateTo from "@/hooks/useNavigateTo";
import { activityNamePrefix, useMemoStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import { Inbox, Inbox_Status } from "@/types/proto/api/v1/inbox_service";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { User } from "@/types/proto/api/v1/user_service";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";

interface Props {
  inbox: Inbox;
}

const MemoCommentMessage = ({ inbox }: Props) => {
  const t = useTranslate();
  const navigateTo = useNavigateTo();
  const memoStore = useMemoStore();
  const [commentMemo, setCommentMemo] = useState<Memo | undefined>(undefined);
  const [relatedMemoName, setRelatedMemoName] = useState<string | undefined>(undefined);
  const [sender, setSender] = useState<User | undefined>(undefined);
  const [initialized, setInitialized] = useState<boolean>(false);

  useAsyncEffect(async () => {
    if (!inbox.activityId) {
      return;
    }

    const activity = await activityServiceClient.getActivity({
      name: `${activityNamePrefix}${inbox.activityId}`,
    });
    if (activity.payload?.memoComment) {
      const memoCommentPayload = activity.payload.memoComment;
      setRelatedMemoName(memoCommentPayload.relatedMemo);
      const memo = await memoStore.getOrFetchMemoByName(memoCommentPayload.memo, {
        skipStore: true,
      });
      setCommentMemo(memo);
      // console.log("commentMemo:", memo);
      const sender = await userStore.getOrFetchUserByName(inbox.sender);
      setSender(sender);
      setInitialized(true);
    }
  }, [inbox.activityId]);

  const handleNavigateToMemo = async () => {
    if (!commentMemo) {
      return;
    }

    navigateTo(`/${commentMemo.name}`);
    if (inbox.status === Inbox_Status.UNREAD) {
      handleArchiveMessage(true);
    }
  };

  const handleArchiveMessage = async (silence = false) => {
    await userStore.updateInbox(
      {
        name: inbox.name,
        status: Inbox_Status.ARCHIVED,
      },
      ["status"],
    );
    if (!silence) {
      toast.success(t("message.archived-successfully"));
    }
  };

  return (
    <div className="flex flex-row items-start justify-start w-full gap-3">
      <div
        className={cn(
          "shrink-0 mt-2 p-2 rounded-full border",
          inbox.status === Inbox_Status.UNREAD
            ? "border-blue-600 text-blue-600 bg-blue-50 dark:bg-zinc-800"
            : "border-gray-500 text-gray-500 bg-gray-50 dark:bg-zinc-800",
        )}
      >
        <Tooltip title={"Comment"} placement="bottom">
          <MessageCircleIcon className="w-4 h-auto sm:w-5" />
        </Tooltip>
      </div>
      <div
        className={cn(
          "border w-full p-2 px-3 rounded-lg flex flex-col justify-start items-start gap-1 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700",
          inbox.status !== Inbox_Status.UNREAD && "opacity-60",
        )}
      >
        {initialized ? (
          <>
            <div className="flex flex-row items-center justify-between w-full">
              <span className="text-sm text-gray-500">{inbox.createTime?.toLocaleString()}</span>
              <div>
                {inbox.status === Inbox_Status.UNREAD && (
                  <Tooltip title={t("common.mark-as-read")} placement="top">
                    <InboxIcon
                      className="w-4 h-auto text-gray-400 cursor-pointer hover:text-blue-600"
                      onClick={() => handleArchiveMessage()}
                    />
                  </Tooltip>
                )}
              </div>
            </div>
            <div
              className="text-base leading-relaxed text-gray-500 cursor-pointer max-w-[60vw] dark:text-gray-400"
              onClick={handleNavigateToMemo}
            >
              <p className="mb-2">
                {t("inbox.memo-comment", {
                  user: sender?.nickname || sender?.username,
                  interpolation: { escapeValue: false },
                })}
              </p>
              <p className="truncate">{t("inbox.memo-comment-content") + commentMemo?.content}</p>
              <p className="truncate">{t("inbox.memo-comment-related") + relatedMemoName}</p>
              <p className="mt-2 text-blue-500 hover:underline">{t("inbox.memo-comment-action")}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-row items-center justify-center w-full my-2">
            <LoaderIcon className="animate-spin text-zinc-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoCommentMessage;
