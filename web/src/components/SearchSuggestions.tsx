// src/components/SearchSuggestions.tsx
import { Popper } from "@mui/base/Popper";
import { Chip, List, ListItem, ListItemDecorator, MenuItem, MenuList, Typography, styled } from "@mui/joy";
import Fuse from "fuse.js";
import { t } from "i18next";
import { HashIcon, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import toast from "react-hot-toast";
import useClickAway from "react-use/lib/useClickAway";
import useDebounce from "react-use/lib/useDebounce";
import { memoServiceClient } from "@/grpcweb";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE } from "@/helpers/consts";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoStore, useUserStatsStore, useUserStatsTags } from "@/store/v1";
import { Memo } from "@/types/proto/api/v1/memo_service";

const Popup = styled(Popper)({
  zIndex: 1000,
});
export type HistoryItem = {
  type: string;
  value: string;
};
type Props = {
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (type: string, value: string) => void;
  onDelete: (single?: HistoryItem, all?: HistoryItem[]) => void;
  history: HistoryItem[]; // 接收上层组件传递的历史搜索记录
};

const SearchSuggestions = ({ inputRef, onSelect, history, onDelete }: Props) => {
  const [open, setOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fetchedMemos, setFetchedMemos] = useState<Memo[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  //   const user = useCurrentUser();
  const userStatsStore = useUserStatsStore();
  const tags = Object.entries(useUserStatsTags())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  // 使用 ref 存储上一个 userStatsStore.userStatsByName 的值
  const prevUserStatsByName = useRef(userStatsStore.userStatsByName);
  useEffect(() => {
    // 检查 userStatsStore.userStatsByName 是否发生变化
    if (prevUserStatsByName.current !== userStatsStore.userStatsByName) {
      // 如果发生变化，清空 allMemos
      setAllMemos([]);
      // 更新 ref 的值为当前 userStatsStore.userStatsByName
      prevUserStatsByName.current = userStatsStore.userStatsByName;
    }
    const fetchAllMemos = async () => {
      if (inputRef.current?.value.trim() !== "" && allMemos.length === 0 && !isFetching) {
        setIsFetching(true);
        // console.log("fetch memos userStatsByName:", userStatsStore.userStatsByName);
        for (const stats of Object.values(userStatsStore.userStatsByName)) {
          try {
            // 为每个用户获取备忘录
            const { memos } = await memoServiceClient.listMemos({
              parent: stats.name,
              pageSize: DEFAULT_LIST_MEMOS_PAGE_SIZE,
            });
            // 将备忘录保存到对应用户的状态中
            setAllMemos((prevMemos) => [...prevMemos, ...memos]);
            // console.log("setAllMemos for:", stats.name);
          } catch (error: any) {
            toast.error(`Failed to fetch memos for user ${stats.name}: ${error.details}`);
            console.error(error);
          }
        }
        setIsFetching(false);
        // console.log("fetch memos done.");
      }
    };

    // 只在组件挂载时获取一次备忘录，后续不再重复获取
    fetchAllMemos();
  }, [inputRef.current?.value, allMemos, isFetching, userStatsStore.userStatsByName]);

//   useEffect(() => {
//     console.log("allMemos Change:", allMemos);
//   }, [allMemos]);

  useDebounce(
    () => {
      const input = inputRef.current;
      if (!input) return;
      const query = input.value.toLowerCase();
      if (query === "") {
        setSuggestions([]);
        setFetchedMemos([]);
        history.length === 0 && setOpen(false);
        return;
      }
      // 搜索标签
      const fuseTags = new Fuse(tags, {
        includeScore: true,
        threshold: 0.3,
      });
      const tagResults = fuseTags.search(query);
      setSuggestions(tagResults.map((result) => result.item));
      // 搜索备忘录
      // const conditions = [];
      // if (query) {
      //   conditions.push(`content_search == [${JSON.stringify(query)}]`);
      // }
      // const { memos } = await memoServiceClient.listMemos({
      //   parent: user.name,
      //   pageSize: DEFAULT_LIST_MEMOS_PAGE_SIZE,
      //   oldFilter: conditions.length > 0 ? conditions.join(" && ") : undefined,
      // });
      const memos = allMemos.filter((memo) => memo.content.toLowerCase().includes(query));
      setFetchedMemos(memos);
      setOpen(true);
    },
    300,
    [inputRef.current?.value, allMemos],
  );
  const handleHistoryClick = (item: HistoryItem) => {
    onSelect(item.type, item.value);
    setOpen(false);
  };
  //   const handleInput = () => {
  //     const input = inputRef.current;
  //     if (!input) return;

  //     const query = input.value.toLowerCase();
  //     if (query === "") {
  //       setSuggestions([]);
  //       setOpen(false);
  //       return;
  //     }

  //     const fuse = new Fuse(tags, {
  //       includeScore: true,
  //       threshold: 0.3,
  //     });
  //     const results = fuse.search(query);
  //     setSuggestions(results.map((result) => result.item));
  //     setOpen(true);
  //   };

  const getHighlightedContent = (content: string) => {
    if (!inputRef.current) return content;
    const index = content.toLowerCase().indexOf(inputRef.current.value.toLowerCase());
    if (index === -1) {
      return content;
    }
    let before = content.slice(0, index);
    if (before.length > 20) {
      before = "..." + before.slice(before.length - 20);
    }
    const highlighted = content.slice(index, index + inputRef.current.value.length);
    let after = content.slice(index + inputRef.current.value.length);
    if (after.length > 20) {
      after = after.slice(0, 20) + "...";
    }

    return (
      <>
        {before}
        <mark className="font-medium border-[1px] border-gray-500">{highlighted}</mark>
        {after}
      </>
    );
  };

  const registerListeners = () => {
    const input = inputRef.current;
    if (!input) return;

    // input.addEventListener("input", handleInput);
    input.addEventListener("focus", () => {
      //   console.log("onFocus");
      setOpen(true);
      //   console.log("inputRef.current?.value.trim() === '':", inputRef.current?.value.trim() === "");
      //   console.log("history:", history);
    });
    // input.addEventListener("blur", () => setOpen(false));
  };
  //   useEffect(() => {
  //     console.log("open:", open);
  //   }, [open]);

  useEffect(registerListeners, [inputRef]);

  //   useEffect(() => {
  //     setOpen(inputRef.current?.value.trim() !== "" ? true : history.length > 0 ? true : false);
  //   }, [inputRef.current?.value, history]);

  const containerRef = useRef<HTMLUListElement>(null);
  useClickAway(containerRef, () => {
    setOpen(false);
  });

  const memoStore = useMemoStore();
  const [memoRender, setMemoRender] = useState<[{ name: string; render: ReactNode }]>([{ name: "", render: <></> }]); // 新增状态来存储备忘录的渲染结果
  // 在渲染之前处理数据
  useEffect(() => {
    const fetchMemo = async () => {
      if (inputRef.current?.value === "") {
        // 当输入框为空时，展示历史搜索记录
        history.forEach(async (item) => {
          if (item.type === "memoName") {
            try {
              const memo = await memoStore.getOrFetchMemoByName(item.value);
              const newMemoRenderItem: { name: string; render: ReactNode } = {
                name: memo.name,
                render: (
                  <>
                    <div className="flex flex-col items-start justify-start max-w-[9rem] mb-1">
                      <p className="text-xs text-gray-400 select-none">{memo.displayTime?.toLocaleString()}</p>
                      <span className="w-full text-sm leading-5 truncate">{memo.content}</span>
                    </div>
                    {/* bg-white bg-opacity-20 */}
                    <X
                      className="absolute hidden w-4 h-auto text-gray-500 transform -translate-y-1/2 right-3 group-hover:block top-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                    />
                  </>
                ) as ReactNode,
              };
              memoRender.unshift(newMemoRenderItem);
              //   setMemoRender((prevMemoRender) => [...(prevMemoRender as [{ name: string; render: ReactNode }]), newMemoRenderItem] as [{ name: string; render: ReactNode }]);
            } catch (error) {
              console.error("Failed to fetch memo:", error);
            }
          }
        });
      }
    };

    fetchMemo();
  }, [inputRef, history, memoStore]);

  //   console.log("inputRef.current?.value.trim() === '':", inputRef.current?.value.trim() === "");
  //   console.log("history:", history);

  const { md, lg, sm } = useResponsiveWidth();

  return (
    <Popup open={open} anchorEl={inputRef.current} placement="bottom-start" disablePortal>
      <MenuList
        ref={containerRef}
        variant="outlined"
        className={md ? "w-[11.9rem]" : "w-[14rem]"}
        sx={{ boxShadow: "md", flexGrow: 0, maxHeight: 320, overflow: "auto" }}
      >
        {/* 当输入框为空时展示历史搜索记录 */}
        {inputRef.current?.value.trim() === "" && history.length > 0 && (
          <List key="0">
            <ListItem className="flex flex-row justify-between item-center" sticky>
              <Typography level="body-xs" sx={{ textTransform: "uppercase", fontWeight: "lg" }}>
                {t("common.history")}
              </Typography>
              <div className="p-1 rounded-full hover:bg-red-100" onClick={() => onDelete(undefined, history)}>
                <Trash2 className="w-auto h-3 text-red-400" />
              </div>
            </ListItem>
            {history.map((item, i) => (
              <MenuItem
                key={i}
                className="relative flex items-center w-full group"
                onClick={() => {
                  handleHistoryClick(item);
                }}
              >
                {item.type === "tag" && (
                  <>
                    <span className="w-full text-sm leading-5 truncate">#{item.value}</span>
                    <X
                      className="absolute hidden w-4 h-auto text-gray-500 transform -translate-y-1/2 right-3 group-hover:block top-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                    />
                  </>
                )}
                {item.type === "memoName" && memoRender.find((renderItem) => renderItem.name === item.value)?.render}
                {item.type === "content" && (
                  <>
                    <span className="w-full text-sm leading-5 truncate">{item.value}</span>
                    <X
                      className="absolute hidden w-4 h-auto text-gray-500 transform -translate-y-1/2 right-3 group-hover:block top-1/2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                    />
                  </>
                )}
              </MenuItem>
            ))}
          </List>
        )}
        {inputRef.current?.value.trim() !== "" && (
          <>
            <List key={1}>
              <ListItem sticky>
                <Typography id="sticky-list-1" level="body-xs" sx={{ textTransform: "uppercase", fontWeight: "lg" }}>
                  {t("common.tags")}
                </Typography>
              </ListItem>
              {suggestions.map((tag, i) => (
                <MenuItem
                  key={i}
                  className="w-full"
                  onClick={() => {
                    onSelect("tag", tag);
                    setOpen(false);
                  }}
                >
                  <span className="w-full text-sm leading-5 truncate">#{getHighlightedContent(tag)}</span>
                </MenuItem>
              ))}
            </List>
            <List key={2}>
              <ListItem sticky>
                <Typography id="sticky-list-1" level="body-xs" sx={{ textTransform: "uppercase", fontWeight: "lg" }}>
                  {t("common.note")}
                </Typography>
              </ListItem>
              {isFetching ? (
                <MenuItem disabled>
                  <span className="text-sm leading-5">加载中...</span>
                </MenuItem>
              ) : (
                fetchedMemos.map((memo, i) => (
                  <MenuItem
                    key={i}
                    title={memo.content}
                    onClick={() => {
                      onSelect("memoName", memo.name); // 传递备忘录名称
                      setOpen(false);
                    }}
                  >
                    {/* MenuItem 有自己的padding-x-[0.25rem] padding-y-[0.75rem] */}
                    <div className="flex flex-col items-start justify-start w-full mb-1">
                      <p className="text-xs text-gray-400 select-none">{memo.displayTime?.toLocaleString()}</p>
                      <span className="w-full text-sm leading-5 truncate">{getHighlightedContent(memo.content)}</span>
                    </div>
                  </MenuItem>
                ))
              )}
            </List>
          </>
        )}
        {inputRef.current?.value.trim() === "" && !(history.length > 0) && (
          <List key={3}>
            <MenuItem disabled>
              <span className="text-sm leading-5">{t("memo.no-content-input")}</span>
            </MenuItem>
          </List>
        )}
      </MenuList>
    </Popup>
  );
};

export default SearchSuggestions;
