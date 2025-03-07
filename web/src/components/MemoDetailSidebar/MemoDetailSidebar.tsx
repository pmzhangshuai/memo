import { isEqual } from "lodash-es";
import { CheckCircleIcon, Code2Icon, HashIcon, LinkIcon } from "lucide-react";
import { MemoRelation_Type } from "@/types/proto/api/v1/memo_relation_service";
import { Memo, MemoProperty } from "@/types/proto/api/v1/memo_service";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import MemoRelationForceGraph from "../MemoRelationForceGraph";

interface Props {
  memo: Memo;
  className?: string;
  parentPage?: string;
}

const MemoDetailSidebar = ({ memo, className, parentPage }: Props) => {
  const t = useTranslate();
  const property = MemoProperty.fromPartial(memo.property || {});
  const hasSpecialProperty = property.hasLink || property.hasTaskList || property.hasCode || property.hasIncompleteTasks;
  const shouldShowRelationGraph = memo.relations.filter((r) => r.type === MemoRelation_Type.REFERENCE).length > 0;

  return (
    <aside
      className={cn("relative w-full h-auto max-h-screen overflow-auto hide-scrollbar flex flex-col justify-start items-start", className)}
    >
      <div className="flex flex-col items-start justify-start w-full h-auto gap-2 px-1 shrink-0 flex-nowrap hide-scrollbar">
        {shouldShowRelationGraph && (
          <div className="relative w-full border rounded-lg h-36 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800">
            <MemoRelationForceGraph className="w-full h-full" memo={memo} parentPage={parentPage} />
            <div className="absolute flex flex-row items-center gap-1 font-mono text-xs top-1 left-2 opacity-60">
              <span>Relations</span>
              <span className="text-xs opacity-60">(Beta)</span>
            </div>
          </div>
        )}
        <div className="flex flex-col w-full">
          <p className="flex flex-row items-center justify-start w-full gap-1 mb-1 text-sm leading-6 text-gray-400 select-none dark:text-gray-500">
            <span>{t("common.created-at")}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{memo.createTime?.toLocaleString()}</p>
        </div>
        {!isEqual(memo.createTime, memo.updateTime) && (
          <div className="flex flex-col w-full">
            <p className="flex flex-row items-center justify-start w-full gap-1 mb-1 text-sm leading-6 text-gray-400 select-none dark:text-gray-500">
              <span>{t("common.updated-at")}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{memo.updateTime?.toLocaleString()}</p>
          </div>
        )}
        {hasSpecialProperty && (
          <div className="flex flex-col w-full">
            <p className="flex flex-row items-center justify-start w-full gap-1 mb-1 text-sm leading-6 text-gray-400 select-none dark:text-gray-500">
              <span>{t("common.properties")}</span>
            </p>
            <div className="flex flex-row flex-wrap items-center justify-start w-full text-gray-500 gap-x-2 gap-y-1 dark:text-gray-400">
              {property.hasLink && (
                <div className="w-auto border dark:border-zinc-800 pl-1 pr-1.5 rounded-md flex justify-between items-center">
                  <div className="flex items-center justify-start w-auto mr-1">
                    <LinkIcon className="w-4 h-auto mr-1" />
                    <span className="block text-sm">{t("memo.links")}</span>
                  </div>
                </div>
              )}
              {property.hasTaskList && (
                <div className="w-auto border dark:border-zinc-800 pl-1 pr-1.5 rounded-md flex justify-between items-center">
                  <div className="flex items-center justify-start w-auto mr-1">
                    <CheckCircleIcon className="w-4 h-auto mr-1" />
                    <span className="block text-sm">{t("memo.to-do")}</span>
                  </div>
                </div>
              )}
              {property.hasCode && (
                <div className="w-auto border dark:border-zinc-800 pl-1 pr-1.5 rounded-md flex justify-between items-center">
                  <div className="flex items-center justify-start w-auto mr-1">
                    <Code2Icon className="w-4 h-auto mr-1" />
                    <span className="block text-sm">{t("memo.code")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {memo.tags.length > 0 && (
          <div className="w-full">
            <div className="flex flex-row items-center justify-start w-full gap-1 mb-1 text-sm leading-6 text-gray-400 select-none dark:text-gray-500">
              <span>{t("common.tags")}</span>
              <span className="shrink-0">({memo.tags.length})</span>
            </div>
            <div className="relative flex flex-row flex-wrap items-center justify-start w-full gap-x-2 gap-y-1">
              {memo.tags.map((tag) => (
                <div
                  key={tag}
                  className="flex flex-row items-center justify-start w-auto max-w-full text-sm leading-6 text-gray-600 rounded-md select-none shrink-0 hover:opacity-80 dark:text-gray-400 dark:border-zinc-800"
                >
                  <HashIcon className="w-4 h-auto group-hover:hidden shrink-0 opacity-40" />
                  <div className={cn("inline-flex flex-nowrap ml-0.5 gap-0.5 cursor-pointer max-w-[calc(100%-16px)]")}>
                    <span className="truncate dark:opacity-80">{tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default MemoDetailSidebar;
