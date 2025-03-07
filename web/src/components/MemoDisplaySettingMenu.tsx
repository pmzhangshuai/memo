import { Option, Select } from "@mui/joy";
import { Button } from "@usememos/mui";
import { Settings2Icon, Trash2, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { State, MemoFilter, useMemoFilterStore, CommentOrder } from "@/store/v1/memoFilter";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";

interface Props {
  className?: string;
}

const MemoDisplaySettingMenu = ({ className }: Props) => {
  const t = useTranslate();
  const memoFilterStore = useMemoFilterStore();
  const isApplying =
    Boolean(memoFilterStore.orderByTimeAsc) !== false ||
    memoFilterStore.orderByComment === "asc" ||
    memoFilterStore.orderByComment === "desc" ||
    memoFilterStore.filters.length > 0;
  type Filter = {
    id: number;
    value: MemoFilter;
    label: string;
  };
  const filtersData: Filter[] = [
    {
      id: 1,
      value: {
        factor: "visibility",
        value: "PUBLIC",
      },
      label: t("memo.visibility.public"),
    },
    {
      id: 2,
      value: {
        factor: "visibility",
        value: "PRIVATE",
      },
      label: t("memo.visibility.private"),
    },
    {
      id: 3,
      value: {
        factor: "resources",
        value: "",
      },
      label: t("memo.has-resource"),
    },
    {
      id: 4,
      value: {
        factor: "property.hasLink",
        value: "",
      },
      label: t("memo.has-link"),
    },
    {
      id: 5,
      value: {
        factor: "property.hasTaskList",
        value: "",
      },
      label: t("memo.has-to-do"),
    },
    {
      id: 6,
      value: {
        factor: "property.hasCode",
        value: "",
      },
      label: t("memo.has-code"),
    },
  ];
  const orderData = [
    {
      id: 1,
      value: {
        key: "orderByTimeAsc",
        value: false,
      },
      label: t("memo.direction-desc"),
    },
    {
      id: 2,
      value: {
        key: "orderByTimeAsc",
        value: true,
      },
      label: t("memo.direction-asc"),
    },
    {
      id: 3,
      value: {
        key: "orderByComment",
        value: "desc",
      },
      label: t("memo.comment-desc"),
    },
    {
      id: 4,
      value: {
        key: "orderByComment",
        value: "asc",
      },
      label: t("memo.comment-asc"),
    },
    {
      id: 5,
      value: {
        key: "orderByReactions",
        value: "desc",
      },
      label: t("memo.reactions-desc"),
    },
    {
      id: 6,
      value: {
        key: "orderByReactions",
        value: "asc",
      },
      label: t("memo.reactions-asc"),
    },
  ];
  // 问题：选择框在点击选项后没有更新显示的问题可能源于Select组件的value属性与Option的value属性类型不匹配。在您的代码中，Option的value是MemoFilter类型，而selectedFilters也是MemoFilter[]类型。理论上，这看起来是正确的，但问题可能出在MemoFilter对象的比较上。在JavaScript中，对象是通过引用比较的，而不是通过值比较。如果MemoFilter对象在内存中的引用发生了变化，即使它们的内容相同，它们也不会被视为相等。
  // 解决方案：使用对象的唯一标识符作为value，而不是将整个MemoFilter对象作为value。您可以考虑只使用对象的某个唯一标识符（如id）作为value。这样，比较就会基于简单的标识符，而不是整个对象。
  // const [selectedFilters, setSelectedFilters] = useState<MemoFilter[]>(memoFilterStore.filters);
  const [selectedFilterIds, setSelectedFilterIds] = useState<number[]>([]); // 改为存储选中的过滤条件ID
  const [selectedFilters, setSelectedFilters] = useState<MemoFilter[]>([]); // 还是需要一个 MemoFilter 类型的数组用来做转换
  const [selectedOrderId, setSelectedOrderId] = useState<number>();
  const [orderByTimeAsc, setOrderByTimeAsc] = useState<boolean>(memoFilterStore.orderByTimeAsc);
  const [orderByComment, setOrderByComment] = useState<CommentOrder>(memoFilterStore.orderByComment);
  const [orderByReactions, setOrderByReactions] = useState<CommentOrder>(memoFilterStore.orderByReactions);
  // 初始状态
  const initialState: State = {
    filters: [],
    orderByTimeAsc: false,
    orderByComment: "default",
    orderByReactions: "default",
  };
  // 检查当前状态是否与初始状态一致
  const isStateChanged = selectedFilterIds.length > 0 || (typeof selectedOrderId === "number" && selectedOrderId > 1);
  // orderByTimeAsc !== false ||
  // orderByComment === "asc" ||
  // orderByComment === "desc" ||
  // orderByReactions === "asc" ||
  // orderByReactions === "desc" ||
  // console.log("isStateChanged:", isStateChanged);
  // console.log("selectedFilterIds:", selectedFilterIds);
  // console.log("selectedOrderId:", selectedOrderId);
  // console.log("orderByTimeAsc:", orderByTimeAsc);
  // console.log("memoFilterStore.orderByTimeAsc:", memoFilterStore.orderByTimeAsc);
  const handleReset = () => {
    // 更新store中的状态
    memoFilterStore.setState(initialState);
  };
  const handleConfirm = () => {
    // 根据selectedFilterIds从filtersData中构造MemoFilter[]数组
    setSelectedFilters(
      selectedFilterIds
        .map((id) => {
          const filter = filtersData.find((f) => f.id === id);
          return filter ? filter.value : null; // 如果没有找到对应的id，返回null（或者可以选择抛出一个错误）
        })
        .filter((filter): filter is MemoFilter => filter !== null), // 过滤掉null值
    );
    const order = orderData.find((o) => o.id === selectedOrderId);
    if (order?.value.key === "orderByComment") {
      setOrderByComment(order.value.value as CommentOrder);
      setOrderByTimeAsc(false);
      setOrderByReactions("default");
    } else if (order?.value.key === "orderByReactions") {
      setOrderByReactions(order.value.value as CommentOrder);
      setOrderByTimeAsc(false);
      setOrderByComment("default");
    } else {
      setOrderByTimeAsc(order?.value.value as boolean);
      setOrderByComment("default");
      setOrderByReactions("default");
    }
  };

  // 根据 memoFilterStore.filters 初始化selectedFilterIds，确保每次组件加载时都根据最新的 filters 来显示已选中选项。
  useEffect(() => {
    // console.log("memoFilterStore.filters:", memoFilterStore.filters);
    setSelectedFilterIds(
      memoFilterStore.filters
        .map((memoFilter) => {
          const filter = filtersData.find((f) => f.value.factor === memoFilter.factor && f.value.value === memoFilter.value);
          return filter ? filter.id : null;
        })
        .filter((id): id is number => id !== null),
    );
    setSelectedOrderId(
      orderData.find((o) => o.value.key === "orderByComment" && o.value.value === memoFilterStore.orderByComment)?.id ||
        orderData.find((o) => o.value.key === "orderByReactions" && o.value.value === memoFilterStore.orderByReactions)?.id ||
        orderData.find((o) => o.value.key === "orderByTimeAsc" && o.value.value === memoFilterStore.orderByTimeAsc)?.id,
    );
  }, [memoFilterStore.filters, memoFilterStore.orderByTimeAsc, memoFilterStore.orderByComment, memoFilterStore.orderByReactions]);

  // 监听 selectedFilters 的变化，更新store中的状态，会在 handleConfirm 之后触发
  useEffect(() => {
    // console.log("selectedFilters:", selectedFilters);
    // 将新选中的过滤条件与原有的过滤条件合并
    // 这里使用了 Set 来确保不重复，然后转换为数组。如果不需要去重可以直接使用 [...memoFilterStore.filters, ...selectedFilters]
    // const newFilters = [...new Set([...memoFilterStore.filters, ...selectedFilters])];
    const newFilters = [...memoFilterStore.filters, ...selectedFilters].filter((filter, index, self) => {
      return self.findIndex((f) => f.factor === filter.factor && f.value === filter.value) === index;
    });
    // 或者合并前先确保 selectedFilters 中的元素不与 memoFilterStore.filters 重复，然后再合并
    // 过滤掉 selectedFilters 中与 memoFilterStore.filters 重复的元素
    // const uniqueSelectedFilters = selectedFilters.filter((filter) => {
    //   return memoFilterStore.filters.findIndex((f) => f.factor === filter.factor && f.value === filter.value) === -1;
    // });
    // // 然后将过滤后的 uniqueSelectedFilters 与 memoFilterStore.filters 合并
    // const newFilters = [...memoFilterStore.filters, ...uniqueSelectedFilters];
    // 构建新的State对象并更新store
    const newState: State = {
      filters: newFilters,
      orderByTimeAsc: orderByTimeAsc,
      orderByComment: orderByComment,
      orderByReactions: orderByReactions,
      // shortcut: memoFilterStore.shortcut,
    };
    memoFilterStore.setState(newState); // 只有在有过滤条件时才更新store，否则使用浏览器刷新之后 selectedFilters 初始化是空会把 store 里面的状态也清除
  }, [selectedFilters, orderByTimeAsc, orderByComment, orderByReactions]);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(className, isApplying ? "text-teal-600 bg-teal-50 dark:text-teal-500 dark:bg-teal-900 rounded-sm" : "opacity-40")}
      >
        <Settings2Icon className="w-4 h-auto shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="end" alignOffset={-12} sideOffset={14}>
        <div className="flex flex-col gap-2 p-2">
          <div className="mb-2 text-md">{t("memo.advance-find")}</div>
          <div className="flex flex-row items-center justify-start w-full">
            <span className="mr-3 text-sm shrink-0">{t("memo.filters")}</span>
            <Select
              className="w-full"
              value={selectedFilterIds}
              placeholder={t("memo.all")}
              onChange={(_, value) => setSelectedFilterIds(value)}
              multiple
            >
              {filtersData.map((filter) => (
                <Option key={filter.id} value={filter.id} label={filter.label}>
                  {filter.label}
                </Option>
              ))}
            </Select>
          </div>
          <div className="flex flex-row items-center justify-start w-full">
            <span className="mr-3 text-sm shrink-0">{t("memo.order-by")}</span>
            <Select className="w-full" value={selectedOrderId} onChange={(_, value) => setSelectedOrderId(value as number)}>
              {orderData.map((order) => (
                <Option key={order.id} value={order.id} label={order.label}>
                  {order.label}
                </Option>
              ))}
            </Select>
          </div>
          <div className="flex flex-row items-center justify-end gap-2 mt-2 shrink-0">
            {isStateChanged && (
              <Button size="sm" variant="plain" onClick={handleReset}>
                <Trash2 className="w-auto h-4 text-red-500" />
                {t("memo.reset")}
              </Button>
            )}
            <Button color="primary" disabled={!isStateChanged} size="sm" onClick={handleConfirm}>
              {t("common.confirm")}
            </Button>
          </div>
          {/* <div className="flex flex-row items-center justify-between w-full">
            <span className="mr-3 text-sm shrink-0">{t("memo.order-by")}</span>
            <Select value="displayTime">
              <Option value={"displayTime"}>{t("memo.display-time")}</Option>
            </Select>
          </div>
          <div className="flex flex-row items-center justify-between w-full">
            <span className="mr-3 text-sm shrink-0">{t("memo.direction")}</span>
            <Select value={memoFilterStore.orderByTimeAsc} onChange={(_, value) => memoFilterStore.setOrderByTimeAsc(Boolean(value))}>
              <Option value={false}>{t("memo.direction-desc")}</Option>
              <Option value={true}>{t("memo.direction-asc")}</Option>
            </Select>
          </div> */}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MemoDisplaySettingMenu;
