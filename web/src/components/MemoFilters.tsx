import { isEqual } from "lodash-es";
import { CalendarIcon, CheckCircleIcon, CodeIcon, EyeIcon, HashIcon, LinkIcon, PaperclipIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterFactor, getMemoFilterKey, MemoFilter, parseFilterQuery, stringifyFilters, useMemoFilterStore } from "@/store/v1";

const MemoFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const memoFilterStore = useMemoFilterStore();
  const filters = memoFilterStore.filters;
  const orderByTimeAsc = memoFilterStore.orderByTimeAsc;
  const orderByComment = memoFilterStore.orderByComment;
  const orderByReactions = memoFilterStore.orderByReactions;
  const lastUpdateRef = useRef<"url" | "store">("url");

  // set lastUpdateRef to store when filters or orderByTimeAsc changes
  useEffect(() => {
    lastUpdateRef.current = "store";
  }, [filters, orderByTimeAsc, orderByComment, orderByReactions]);

  // set lastUpdateRef to url when searchParams changes
  useEffect(() => {
    lastUpdateRef.current = "url";
  }, [searchParams]);

  const checkAndSync = () => {
    const filtersInURL = searchParams.get("filter") || "";
    const orderByTimeAscInURL = searchParams.get("orderByTime") === "asc";
    const orderByCommentInURL = searchParams.get("orderByComment") === "asc" ? "asc" : searchParams.get("orderByComment") === "desc" ? "desc" : "default";
    const orderByReactionsInURL = searchParams.get("orderByReactions") === "asc" ? "asc" : searchParams.get("orderByReactions") === "desc" ? "desc" : "default";
    const storeMatchesURL = filtersInURL === stringifyFilters(filters) && orderByTimeAscInURL === orderByTimeAsc && orderByCommentInURL === orderByComment && orderByReactionsInURL === orderByReactions;

    if (!storeMatchesURL) {
      if (lastUpdateRef.current === "url") {
        // Sync URL -> Store
        memoFilterStore.setState({
          filters: parseFilterQuery(filtersInURL),
          orderByTimeAsc: orderByTimeAscInURL,
          orderByComment: orderByCommentInURL,
          orderByReactions: orderByReactionsInURL,
        });
      } else if (lastUpdateRef.current === "store") {
        // Sync Store -> URL
        const newSearchParams = new URLSearchParams(searchParams);

        if (orderByTimeAsc) {
          newSearchParams.set("orderByTime", "asc");
        } else {
          newSearchParams.delete("orderByTime");
        }

        if (orderByComment === "asc") {
          newSearchParams.set("orderByComment", "asc");
        } else if (orderByComment === "desc") {
          newSearchParams.set("orderByComment", "desc");
        } else {
          newSearchParams.delete("orderByComment");
        }

        if (orderByReactions === "asc") {
          newSearchParams.set("orderByReactions", "asc");
        } else if (orderByReactions === "desc") {
          newSearchParams.set("orderByReactions", "desc");
        } else {
          newSearchParams.delete("orderByReactions");
        }

        if (filters.length > 0) {
          newSearchParams.set("filter", stringifyFilters(filters));
        } else {
          newSearchParams.delete("filter");
        }

        setSearchParams(newSearchParams);
      }
    }
  };

  // Watch both URL and store changes
  useEffect(checkAndSync, [searchParams, filters, orderByTimeAsc, orderByComment, orderByReactions]);

  const getFilterDisplayText = (filter: MemoFilter) => {
    if (filter.value) {
      return filter.value;
    }
    if (filter.factor.startsWith("property.")) {
      return filter.factor.replace("property.", "");
    } 
    return filter.factor;
  };

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-start w-full mt-3 gap-x-2 gap-y-1">
      {filters.map((filter) => (
        <div
          key={getMemoFilterKey(filter)}
          className="w-auto leading-7 h-7 shrink-0 flex flex-row items-center gap-1 bg-white dark:bg-zinc-800 border dark:border-zinc-700 pl-1.5 pr-1 rounded-md hover:line-through cursor-pointer"
          onClick={() => memoFilterStore.removeFilter((f) => isEqual(f, filter))}
        >
          <FactorIcon className="w-4 h-auto text-gray-500 dark:text-gray-400 opacity-60" factor={filter.factor} />
          <span className="text-sm text-gray-500 truncate dark:text-gray-400 max-w-32">{getFilterDisplayText(filter)}</span>
          <button className="text-gray-500 dark:text-gray-300 opacity-60 hover:opacity-100">
            <XIcon className="w-4 h-auto" />
          </button>
        </div>
      ))}
    </div>
  );
};

const FactorIcon = ({ factor, className }: { factor: FilterFactor; className?: string }) => {
  const iconMap = {
    tagSearch: <HashIcon className={className} />,
    visibility: <EyeIcon className={className} />,
    contentSearch: <SearchIcon className={className} />,
    displayTime: <CalendarIcon className={className} />,
    "property.hasLink": <LinkIcon className={className} />,
    "property.hasTaskList": <CheckCircleIcon className={className} />,
    "property.hasCode": <CodeIcon className={className} />,
    resources: <PaperclipIcon className={className} />,
  };
  return iconMap[factor as keyof typeof iconMap] || <></>;
};

export default MemoFilters;
