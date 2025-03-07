import { create } from "zustand";
import { combine } from "zustand/middleware";
import { authServiceClient, userServiceClient } from "@/grpcweb";
import { User, UserFollowing, UserSetting, User_Role } from "@/types/proto/api/v1/user_service";
import { userStore } from "../v2";

interface State {
  userMapByName: Record<string, User>;
  // The name of current user. Format: `users/${uid}`
  currentUser?: string;
  userSetting?: UserSetting;
}

const getDefaultState = (): State => ({
  userMapByName: {},
  currentUser: undefined,
  userSetting: undefined,
});

const getDefaultUserSetting = () => {
  return UserSetting.fromPartial({
    locale: "en",
    appearance: "auto",
    memoVisibility: "PRIVATE",
  });
};

// Request cache is used to prevent multiple requests.
const requestCache = new Map<string, Promise<any>>();

export const useUserStore = create(
  combine(getDefaultState(), (set, get) => ({
    getState: () => get(),
    fetchUsers: async () => {
      const { users } = await userServiceClient.listUsers({});
      const userMap = get().userMapByName;
      for (const user of users) {
        userMap[user.name] = user;
      }
      set({ userMapByName: userMap });
      return users;
    },
    getOrFetchUserByName: async (name: string) => {
      const userMap = get().userMapByName;
      if (userMap[name]) {
        return userMap[name] as User;
      }
      if (requestCache.has(name)) {
        return await requestCache.get(name);
      }

      const promisedUser = userServiceClient
        .getUser({
          name: name,
        })
        .then((user) => user);
      requestCache.set(name, promisedUser);
      const user = await promisedUser;
      if (!user) {
        throw new Error("User not found");
      }
      requestCache.delete(name);
      userMap[name] = user;
      set({ userMapByName: userMap });
      return user;
    },
    fetchUserByUsername: async (username: string) => {
      const user = await userServiceClient.getUserByUsername({ username });
      const userMap = get().userMapByName;
      userMap[user.name] = user;
      set({ userMapByName: userMap });
      return user;
    },
    listUsers: async () => {
      const { users } = await userServiceClient.listUsers({});
      const userMap = get().userMapByName;
      for (const user of users) {
        userMap[user.name] = user;
      }
      set({ userMapByName: userMap });
      return users;
    },
    getUserByName: (name: string) => {
      const userMap = get().userMapByName;
      return userMap[name];
    },
    updateUser: async (user: Partial<User>, updateMask: string[]) => {
      const updatedUser = await userStore.updateUser(user, updateMask);
      // const updatedUser = await userServiceClient.updateUser({
      //   user: user,
      //   updateMask: updateMask,
      // });
      const userMap = get().userMapByName;
      if (user.name && user.name !== updatedUser.name) {
        delete userMap[user.name];
      }
      userMap[updatedUser.name] = updatedUser;
      set({ userMapByName: userMap });
      // userStore.state.setPartial({
      //   userMapByName: {
      //     ...userMap,
      //     [user.name as string]: user as User,
      //   },
      // });
      if (user.name === get().currentUser) {
        set({ currentUser: updatedUser.name });
      }
      return updatedUser;
    },
    deleteUser: async (name: string) => {
      await userServiceClient.deleteUser({
        name,
      });
      const userMap = get().userMapByName;
      delete userMap[name];
      set({ userMapByName: userMap });
    },
    fetchCurrentUser: async () => {
      const user = await authServiceClient.getAuthStatus({});
      const userMap = get().userMapByName;
      userMap[user.name] = user;
      set({ currentUser: user.name, userMapByName: userMap });
      const setting = await userServiceClient.getUserSetting({});
      set({
        userSetting: UserSetting.fromPartial({
          ...getDefaultUserSetting(),
          ...setting,
        }),
      });
      return user;
    },
    isFollowingUser: async (userFollowing: Partial<UserFollowing>) => {
      const { result } = await userServiceClient.isFollowingUser({
        follow: userFollowing,
      });
      return result;
    },
    followUser: async (userFollowing: Partial<UserFollowing>) => {
      const response = await userServiceClient.followUser({
        follow: userFollowing,
      });
      return response;
    },
    getFollowingList: async (userID: string) => {
      const followingList = await userServiceClient.getFollowingList({ name: userID });
      return followingList;
    },
    getFollowerList: async (userID: string) => {
      const followerList = await userServiceClient.getFollowerList({ name: userID });
      return followerList;
    },
    updateUserSetting: async (userSetting: Partial<UserSetting>, updateMask: string[]) => {
      const updatedUserSetting = await userServiceClient.updateUserSetting({
        setting: userSetting,
        updateMask: updateMask,
      });
      set({ userSetting: updatedUserSetting });
      return updatedUserSetting;
    },
  })),
);

export const stringifyUserRole = (role: User_Role) => {
  if (role === User_Role.HOST) {
    return "Host";
  } else if (role === User_Role.ADMIN) {
    return "Admin";
  } else {
    return "User";
  }
};
