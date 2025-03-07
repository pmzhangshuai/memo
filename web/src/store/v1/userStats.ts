import { uniqueId } from "lodash-es";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { userServiceClient } from "@/grpcweb";
import { UserStats } from "@/types/proto/api/v1/user_service";

interface State {
  // stateId is used to identify the store instance state.
  // It should be update when any state change.
  stateId: string;
  userStatsByName: Record<string, UserStats>;
}

const getDefaultState = (): State => ({
  stateId: uniqueId(),
  userStatsByName: {},
});

export const useUserStatsStore = create(
  combine(getDefaultState(), (set, get) => ({
    setState: (state: State) => set(state),
    getState: () => get(),
    listUserStats: async (user?: string, userList?: string[]) => {
      // console.log("listUserStats:", user);
      // console.log("listUserListStats:", userList);
      const userStatsByName: Record<string, UserStats> = {};
      if (!user && !userList) {
        // 如果既没有单个用户也没有用户列表，则获取所有用户的状态
        const { userStats } = await userServiceClient.listAllUserStats({});
        for (const stats of userStats) {
          userStatsByName[stats.name] = stats;
        }
      } else if (userList) {
        // 如果有用户列表，则遍历列表获取每个用户的状态
        for (const userName of userList) {
          const userStats = await userServiceClient.getUserStats({ name: userName });
          userStatsByName[userName] = userStats;
        }
      } else {
        // 如果有单个用户，则获取该用户的状态
        const userStats = await userServiceClient.getUserStats({ name: user! });
        userStatsByName[user!] = userStats;
      }
      set({ ...get(), userStatsByName });
    },
    setStateId: (id = uniqueId()) => {
      set({ ...get(), stateId: id });
    },
  })),
);

export const useUserStatsTags = () => {
  const userStatsStore = useUserStatsStore();
  const tagAmounts: Record<string, number> = {};
  for (const userStats of Object.values(userStatsStore.getState().userStatsByName)) {
    for (const tag of Object.keys(userStats.tagCount)) {
      tagAmounts[tag] = (tagAmounts[tag] || 0) + userStats.tagCount[tag];
    }
  }
  return tagAmounts;
};
