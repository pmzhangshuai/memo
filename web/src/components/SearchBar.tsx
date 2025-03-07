import { SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMemoFilterStore } from "@/store/v1";
import { useTranslate } from "@/utils/i18n";
import MemoDisplaySettingMenu from "./MemoDisplaySettingMenu";
import SearchSuggestions, { HistoryItem } from "./SearchSuggestions";

const SearchBar = () => {
  const t = useTranslate();
  const memoFilterStore = useMemoFilterStore();
  const [queryText, setQueryText] = useState("");

  const [isFocused, setIsFocused] = useState(false); // 新增聚焦状态
  const inputRef = useRef<HTMLInputElement>(null); // 新增输入框引用

  const onTextChange = (event: React.FormEvent<HTMLInputElement>) => {
    setQueryText(event.currentTarget.value);
  };

  const onFocus = () => {
    setIsFocused(true);
    // console.log("onFocus");
  };
  const onBlur = () => {
    setIsFocused(false);
    // console.log("onBlur");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (queryText !== "") {
        const newHistoryItem: HistoryItem = {
          type: "content",
          value: queryText,
        };
        saveHistory(newHistoryItem);
        const words = queryText.split(" ");
        words.forEach((word) => {
          memoFilterStore.addFilter({
            factor: "contentSearch",
            value: word,
          });
        });
        setQueryText("");
      }
    }
  };

  // 保存历史搜索记录到localStorage
  const saveHistory = (item: HistoryItem) => {
    const existingHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    // 查找是否存在重复项
    const existingItemIndex = existingHistory.findIndex(
      (histItem: HistoryItem) => histItem.type === item.type && histItem.value === item.value,
    );
    if (existingItemIndex !== -1) {
      existingHistory.splice(existingItemIndex, 1); // 移除旧项
    }
    existingHistory.unshift(item); // 将新记录插入到数组开头
    // 如果历史记录超过十条，移除最早的记录
    if (existingHistory.length > 10) {
      existingHistory.pop();
    }
    localStorage.setItem("searchHistory", JSON.stringify(existingHistory));
    setHistory(existingHistory); // 更新组件状态以反映最新历史记录
  };

  // 从localStorage获取历史搜索记录
  const loadHistory = (): HistoryItem[] => {
    return JSON.parse(localStorage.getItem("searchHistory") || "[]");
  };

  const [history, setHistory] = useState<HistoryItem[]>(loadHistory); // 初始化历史记录状态

  const navigateTo = useNavigate();
  const handleSelect = (type: string, value: string) => {
    // console.log("handleSelect", tag);
    setQueryText("");
    // inputRef.current?.focus();
    if (type === "tag") {
      const newHistoryItem: HistoryItem = {
        type: "tag",
        value: value,
      };
      saveHistory(newHistoryItem);
      memoFilterStore.addFilter({
        factor: "tagSearch",
        value: value,
      });
    } else if (type === "memoName") {
      const newHistoryItem: HistoryItem = {
        type: "memoName",
        value: value,
      };
      saveHistory(newHistoryItem);
      navigateTo(`/${value}`);
    } else if (type === "content") {
      const newHistoryItem: HistoryItem = {
        type: "content",
        value: value,
      };
      saveHistory(newHistoryItem);
      const words = value.split(" ");
      words.forEach((word) => {
        memoFilterStore.addFilter({
          factor: "contentSearch",
          value: word,
        });
      });
    }
  };

  const handleDelete = (single?: HistoryItem, all?: HistoryItem[]) => {
    // console.log("onDelete");
    if (single) {
      // 删除单个历史记录
      console.log("delete single", single);
      const updatedHistory = history.filter((item) => item.type !== single.type || item.value !== single.value);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } else {
      // 删除所有历史记录
      localStorage.removeItem("searchHistory");
      setHistory([]);
    }
  };

  return (
    <div className="relative flex flex-row items-center justify-start w-full h-auto">
      <SearchIcon className="absolute w-4 h-auto left-3 opacity-40" />
      <input
        ref={inputRef} // 关联输入框引用
        className="w-full p-1 pl-8 text-sm leading-7 text-gray-500 border rounded-lg outline-none dark:text-gray-400 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
        placeholder={t("memo.search-placeholder")}
        value={queryText}
        onChange={onTextChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        // onBlur={onBlur}
      />
      <MemoDisplaySettingMenu className="absolute right-3 top-3" />
      {/* 新增 SearchSuggestions 组件 */}
      {isFocused && <SearchSuggestions inputRef={inputRef} history={history} onSelect={handleSelect} onDelete={handleDelete} />}
    </div>
  );
};

export default SearchBar;
