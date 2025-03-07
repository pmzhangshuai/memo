import { BellIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import Empty from "@/components/Empty";
import MemoCommentMessage from "@/components/Inbox/MemoCommentMessage";
import MobileHeader from "@/components/MobileHeader";
import { userStore } from "@/store/v2";
import { Inbox_Status, Inbox_Type } from "@/types/proto/api/v1/inbox_service";
import { useTranslate } from "@/utils/i18n";

const Inboxes = observer(() => {
  const t = useTranslate();
  const inboxes = userStore.state.inboxes.slice().sort((a, b) => {
    if (a.status === b.status) {
      return 0;
    }
    return a.status === Inbox_Status.UNREAD ? -1 : 1;
  });

  useEffect(() => {
    userStore.fetchInboxes();
  }, []);

  return (
    <section className="@container w-full max-w-5xl min-h-full flex flex-col justify-start items-center sm:pt-3 md:pt-6 pb-8">
      <MobileHeader />
      <div className="w-full px-4 sm:px-6">
        <div className="flex flex-col items-start justify-start w-full px-4 py-3 text-black bg-white shadow rounded-xl dark:bg-zinc-800 dark:text-gray-300">
          <div className="relative flex flex-row items-center justify-between w-full">
            <p className="flex flex-row items-center justify-start py-1 select-none opacity-80">
              <BellIcon className="w-6 h-auto mr-1 opacity-80" />
              <span className="text-lg">{t("common.inbox")}</span>
            </p>
          </div>
          <div className="flex flex-col items-start justify-start w-full h-auto px-2 pb-4">
            {inboxes.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full mt-4 mb-8 italic">
                <Empty />
                <p className="mt-4 text-gray-600 dark:text-gray-400">{t("message.no-data")}</p>
              </div>
            )}
            <div className="flex flex-col items-start justify-start w-full gap-4 mt-4">
              {inboxes.map((inbox) => {
                if (inbox.type === Inbox_Type.MEMO_COMMENT) {
                  return <MemoCommentMessage key={`${inbox.name}-${inbox.status}`} inbox={inbox} />;
                }
                return undefined;
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default Inboxes;
