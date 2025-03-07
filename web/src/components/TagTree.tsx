import { Dropdown, Menu, MenuButton, MenuItem } from "@mui/joy";
import { t } from "i18next";
import { ChevronRightIcon, Edit3Icon, HashIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useToggle from "react-use/lib/useToggle";
import { memoServiceClient } from "@/grpcweb";
import { useMemoFilterStore, useUserStatsStore } from "@/store/v1";
import showRenameTagDialog from "./RenameTagDialog";

interface Tag {
  key: string;
  text: string;
  amount: number;
  subTags: Tag[];
}

interface Props {
  tagAmounts: [tag: string, amount: number][];
}

const TagTree = ({ tagAmounts: rawTagAmounts }: Props) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    const sortedTagAmounts = Array.from(rawTagAmounts).sort();
    const root: Tag = {
      key: "",
      text: "",
      amount: 0,
      subTags: [],
    };

    for (const tagAmount of sortedTagAmounts) {
      const subtags = tagAmount[0].split("/");
      let tempObj = root;
      let tagText = "";

      for (let i = 0; i < subtags.length; i++) {
        const key = subtags[i];
        let amount: number = 0;

        if (i === 0) {
          tagText += key;
        } else {
          tagText += "/" + key;
        }
        if (sortedTagAmounts.some(([tag, amount]) => tag === tagText && amount > 1)) {
          amount = tagAmount[1];
        }

        let obj = null;

        for (const t of tempObj.subTags) {
          if (t.text === tagText) {
            obj = t;
            break;
          }
        }

        if (!obj) {
          obj = {
            key,
            text: tagText,
            amount: amount,
            subTags: [],
          };
          tempObj.subTags.push(obj);
        }

        tempObj = obj;
      }
    }

    setTags(root.subTags as Tag[]);
  }, [rawTagAmounts]);

  return (
    <div className="relative flex flex-col items-start justify-start w-full h-auto gap-2 mt-1 flex-nowrap">
      {tags.map((t, idx) => (
        <TagItemContainer key={t.text + "-" + idx} tag={t} />
      ))}
    </div>
  );
};

interface TagItemContainerProps {
  tag: Tag;
}

const TagItemContainer: React.FC<TagItemContainerProps> = (props: TagItemContainerProps) => {
  const { tag } = props;
  const memoFilterStore = useMemoFilterStore();
  const tagFilters = memoFilterStore.getFiltersByFactor("tagSearch");
  const isActive = tagFilters.some((f) => f.value === tag.text);
  const hasSubTags = tag.subTags.length > 0;
  const [showSubTags, toggleSubTags] = useToggle(false);

  const handleTagClick = () => {
    if (isActive) {
      memoFilterStore.removeFilter((f) => f.factor === "tagSearch" && f.value === tag.text);
    } else {
      memoFilterStore.addFilter({
        factor: "tagSearch",
        value: tag.text,
      });
    }
  };

  const handleToggleBtnClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleSubTags();
  };

  const userStatsStore = useUserStatsStore();
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
    <>
      <div className="relative flex flex-row items-center justify-between w-full py-0 mt-px text-sm leading-6 rounded-lg select-none shrink-0 group">
        <div
          className={`flex flex-row justify-start items-center truncate shrink leading-5 mr-1 text-gray-600 dark:text-gray-400 ${
            isActive && "!text-blue-600"
          }`}
        >
          <div className="w-6 h-6">
            {hasSubTags ? (
              <span
                className={`flex flex-row justify-center items-center shrink-0 transition-all rotate-0 ${showSubTags && "rotate-90"}`}
                onClick={handleToggleBtnClick}
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-400 cursor-pointer dark:text-gray-500" />
              </span>
            ) : null}
          </div>
          <div className="shrink-0">
            <HashIcon className="w-4 h-auto mr-1 text-gray-400 shrink-0 dark:text-gray-500" />
          </div>
          <span className="truncate cursor-pointer hover:opacity-80" onClick={handleTagClick}>
            {tag.key} {tag.amount > 1 && `(${tag.amount})`}
          </span>
        </div>
        <div className="flex flex-row items-center justify-end hidden group-hover:block">
          <Dropdown>
            <MenuButton slots={{ root: "div" }}>
              <MoreVerticalIcon className="w-4 h-auto text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 shrink-0 opacity-60" />
            </MenuButton>
            <Menu size="sm" placement="bottom-start">
              <MenuItem onClick={() => showRenameTagDialog({ tag: tag.key })}>
                <Edit3Icon className="w-4 h-auto" />
                {t("common.rename")}
              </MenuItem>
              <MenuItem color="danger" onClick={() => handleDeleteTag(tag.key)}>
                <TrashIcon className="w-4 h-auto" />
                {t("common.delete")}
              </MenuItem>
            </Menu>
          </Dropdown>
        </div>
      </div>
      {hasSubTags ? (
        <div
          className={`w-[calc(100%-0.5rem)] flex flex-col justify-start items-start h-auto ml-2 pl-2 border-l-2 border-l-gray-200 dark:border-l-zinc-800 ${
            !showSubTags && "!hidden"
          }`}
        >
          {tag.subTags.map((st, idx) => (
            <TagItemContainer key={st.text + "-" + idx} tag={st} />
          ))}
        </div>
      ) : null}
    </>
  );
};

export default TagTree;
