import useDebounce from "react-use/lib/useDebounce";
import SearchBar from "@/components/SearchBar";
import { useMemoList, useUserStatsStore } from "@/store/v1";
import { User } from "@/types/proto/api/v1/user_service";
import { cn } from "@/utils";
import TagsSection from "../HomeSidebar/TagsSection";
import MemoFilters from "../MemoFilters";
import StatisticsView from "../StatisticsView";

interface Props {
  className?: string;
  owner: User;
}

const UserSidebar = (props: Props) => {
  const memoList = useMemoList();
  const userStatsStore = useUserStatsStore();

  useDebounce(
    async () => {
      await userStatsStore.listUserStats(props.owner.name);
    },
    300,
    [memoList.size(), userStatsStore.stateId, props.owner],
  );

  return (
    <aside
      className={cn(
        "relative w-full h-auto max-h-screen overflow-auto hide-scrollbar flex flex-col justify-start items-start",
        props.className,
      )}
    >
      <SearchBar />
      <MemoFilters />
      <StatisticsView />
      <TagsSection readonly={true} />
    </aside>
  );
};

export default UserSidebar;
