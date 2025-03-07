import copy from "copy-to-clipboard";
import { ArrowUpRightIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import MemoResourceListView from "@/components/MemoResourceListView";
import useLoading from "@/hooks/useLoading";
import { extractMemoIdFromName, useMemoStore } from "@/store/v1";
import { cn } from "@/utils";
import MemoContent from "..";
import { RendererContext } from "../types";
import Error from "./Error";

interface Props {
  resourceId: string;
  params: string;
}

const EmbeddedMemo = ({ resourceId: uid, params: paramsStr }: Props) => {
  const context = useContext(RendererContext);
  const loadingState = useLoading();
  const memoStore = useMemoStore();
  const memoName = `memos/${uid}`;
  const [memo, setMemo] = useState(memoStore.getMemoByName(memoName));

  useEffect(() => {
    // memoStore.getOrFetchMemoByName(memoName).finally(() => loadingState.setFinish());
    const fetchMemo = async () => {
      try {
        const result = await memoStore.getOrFetchMemoByName(memoName, { skipStore: true });
        setMemo(result); // 更新 memo 状态
      } catch (error) {
        console.error("Failed to fetch memo:", error);
        // 可以选择设置一个错误状态或显示错误消息
      } finally {
        loadingState.setFinish(); // 结束加载状态
      }
    };

    fetchMemo();
  }, [memoName]);

  if (loadingState.isLoading) {
    return null;
  }
  if (!memo) {
    return <Error message={`Memo not found: ${uid}`} />;
  }

  const params = new URLSearchParams(paramsStr);
  const useSnippet = params.has("snippet");
  const inlineMode = params.has("inline");
  if (!useSnippet && (memo.name === context.memoName || context.embeddedMemos.has(memoName))) {
    return <Error message={`Nested Rendering Error: ![[${memoName}]]`} />;
  }

  // Add the memo to the set of embedded memos. This is used to prevent infinite loops when a memo embeds itself.
  context.embeddedMemos.add(memoName);
  const contentNode = useSnippet ? (
    <div className={cn("text-gray-800 dark:text-gray-400", inlineMode ? "" : "line-clamp-3")}>{memo.snippet}</div>
  ) : (
    <>
      <MemoContent
        contentClassName={inlineMode ? "" : "line-clamp-3"}
        memoName={memo.name}
        nodes={memo.nodes}
        embeddedMemos={context.embeddedMemos}
      />
      <MemoResourceListView resources={memo.resources} />
    </>
  );
  if (inlineMode) {
    return <div className="w-full">{contentNode}</div>;
  }

  const copyMemoUid = (uid: string) => {
    copy(uid);
    toast.success("Copied memo UID to clipboard");
  };

  return (
    <div className="relative flex flex-col items-start justify-start w-full px-3 py-2 border border-gray-200 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 hover:shadow">
      <div className="flex flex-row items-center justify-between w-full mb-1 text-gray-400 dark:text-gray-500">
        <div className="text-sm leading-5 select-none">
          <relative-time datetime={memo.displayTime?.toISOString()} format="datetime"></relative-time>
        </div>
        <Link className="opacity-60 hover:opacity-80" to={`/${memo.name}`} state={{ from: context.parentPage }} viewTransition>
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs leading-5 cursor-pointer opacity-60 hover:opacity-80">
              {extractMemoIdFromName(memo.name).slice(0, 6)}
            </span>
            <ArrowUpRightIcon className="w-5 h-auto" />
          </div>
        </Link>
      </div>
      {contentNode}
    </div>
  );
};

export default EmbeddedMemo;
