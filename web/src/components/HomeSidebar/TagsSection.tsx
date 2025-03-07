import { Dropdown, Menu, MenuButton, MenuItem, Switch } from "@mui/joy";
import { Edit3Icon, HashIcon, MoreVerticalIcon, TagsIcon, TrashIcon } from "lucide-react";
import toast from "react-hot-toast";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { memoServiceClient } from "@/grpcweb";
import { useMemoFilterStore, useUserStatsStore, useUserStatsTags } from "@/store/v1";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import showRenameTagDialog from "../RenameTagDialog";
import TagTree from "../TagTree";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";

interface Props {
  readonly?: boolean;
}

const TagsSection = (props: Props) => {
  const t = useTranslate();
  const memoFilterStore = useMemoFilterStore();
  const userStatsStore = useUserStatsStore();
  const [treeMode, setTreeMode] = useLocalStorage<boolean>("tag-view-as-tree", true);
  const tags = Object.entries(useUserStatsTags())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .sort((a, b) => b[1] - a[1]);

  const handleTagClick = (tag: string) => {
    const isActive = memoFilterStore.getFiltersByFactor("tagSearch").some((filter) => filter.value === tag);
    if (isActive) {
      memoFilterStore.removeFilter((f) => f.factor === "tagSearch" && f.value === tag);
    } else {
      memoFilterStore.addFilter({
        factor: "tagSearch",
        value: tag,
      });
    }
  };

  const handleDeleteTag = async (tag: string) => {
    const confirmed = window.confirm(t("tag.delete-confirm"));
    if (confirmed) {
      await memoServiceClient.deleteMemoTag({
        parent: "memos/-",
        tag: tag,
      });
      userStatsStore.setStateId();
      toast.success(t("message.deleted-successfully"));
    }
  };

  return (
    <div className="flex flex-col items-start justify-start w-full h-auto px-1 mt-3 shrink-0 flex-nowrap hide-scrollbar">
      <div className="flex flex-row items-center justify-between w-full gap-1 mb-1 text-sm leading-6 text-gray-400 select-none">
        <span>{t("common.tags") + `(${tags.length})`}</span>
        {tags.length > 0 && (
          <Popover>
            <PopoverTrigger>
              <MoreVerticalIcon className="w-4 h-auto shrink-0 opacity-60 hover:text-gray-800 dark:hover:text-gray-100" />
            </PopoverTrigger>
            <PopoverContent align="end" alignOffset={-12}>
              <div className="flex flex-row items-center justify-between w-auto gap-2">
                <span className="text-sm shrink-0">{t("common.tag-tree")}</span>
                <Switch size="sm" checked={treeMode} onChange={(event) => setTreeMode(event.target.checked)} />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {tags.length > 0 ? (
        treeMode ? (
          <TagTree tagAmounts={tags} />
        ) : (
          <div className="relative flex flex-row flex-wrap items-center justify-start w-full gap-x-2 gap-y-1">
            {tags.map(([tag, amount]) => (
              <div
                key={tag}
                className="flex flex-row items-center justify-start w-auto max-w-full text-sm leading-6 text-gray-600 rounded-md select-none shrink-0 hover:opacity-80 dark:text-gray-400 dark:border-zinc-800"
              >
                <Dropdown>
                  <MenuButton slots={{ root: "div" }}>
                    <div className="shrink-0 group">
                      <HashIcon className="w-4 h-auto group-hover:hidden shrink-0 opacity-40" />
                      <MoreVerticalIcon className="hidden w-4 h-auto group-hover:block shrink-0 opacity-60" />
                    </div>
                  </MenuButton>
                  <Menu size="sm" placement="bottom-start">
                    <MenuItem onClick={() => showRenameTagDialog({ tag: tag })}>
                      <Edit3Icon className="w-4 h-auto" />
                      {t("common.rename")}
                    </MenuItem>
                    <MenuItem color="danger" onClick={() => handleDeleteTag(tag)}>
                      <TrashIcon className="w-4 h-auto" />
                      {t("common.delete")}
                    </MenuItem>
                  </Menu>
                </Dropdown>
                <div
                  className={cn("inline-flex flex-nowrap ml-0.5 gap-0.5 cursor-pointer max-w-[calc(100%-16px)]")}
                  onClick={() => handleTagClick(tag)}
                >
                  <span className="truncate dark:opacity-80">{tag}</span>
                  {amount > 1 && <span className="opacity-60 shrink-0">({amount})</span>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        !props.readonly && (
          <div className="flex flex-row items-start justify-start gap-1 p-2 text-gray-400 border border-dashed rounded-md dark:border-zinc-800 dark:text-gray-500">
            <TagsIcon />
            <p className="mt-0.5 text-sm leading-snug italic">{t("tag.create-tags-guide")}</p>
          </div>
        )
      )}
    </div>
  );
};

export default TagsSection;
