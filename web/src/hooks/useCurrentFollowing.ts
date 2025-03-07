import { userStore } from "@/store/v2";

const useCurrentFollowing = () => {
  return userStore.state.currentFollowing;
};

export default useCurrentFollowing;
