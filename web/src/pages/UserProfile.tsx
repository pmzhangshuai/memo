import { Chip, Dropdown, IconButton, Menu, MenuButton, MenuItem, Typography } from "@mui/joy";
import { Button } from "@usememos/mui";
import copy from "copy-to-clipboard";
import dayjs from "dayjs";
import { BriefcaseBusiness, Ellipsis, GraduationCap, IdCard, Mail, MapPin, MoreVerticalIcon, Rss } from "lucide-react";
import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import showFollowedUsersDialog from "@/components/FollowedUsersDialog";
import MemoFilters from "@/components/MemoFilters";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
import PagedMemoList from "@/components/PagedMemoList";
import UserAvatar from "@/components/UserAvatar";
import { UserSidebar, UserSidebarDrawer } from "@/components/UserSidebar";
import useCurrentFollowing from "@/hooks/useCurrentFollowing";
import useCurrentUser from "@/hooks/useCurrentUser";
import useLoading from "@/hooks/useLoading";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoFilterStore, useMemoList, useUserStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import { Direction, State } from "@/types/proto/api/v1/common";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { FollowingListResponse, UserFollowing as UserFollowingPb } from "@/types/proto/api/v1/user_service";
import { User } from "@/types/proto/api/v1/user_service";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import Resources from "./Resources";
import "@/less/base-tab.less";

const UserProfile = () => {
  const t = useTranslate();
  const params = useParams();
  const userStore1 = useUserStore();
  const loadingState = useLoading();
  const [user, setUser] = useState<User>();
  const { md, lg } = useResponsiveWidth();
  const memoList = useMemoList();
  // 定义用户关注数和粉丝数的状态
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  let followingList: FollowingListResponse | null = null;
  const [fetchFollowingError, setFetchFollowingError] = useState<Error | null>(null);
  // 定义关注状态
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  // const [userFollowing, setUserFollowing] = useState<UserFollowingPb>();
  const [followerCount, setFollowerCount] = useState<number>(0);
  const memoFilterStore = useMemoFilterStore();

  const currentUser = useCurrentUser();
  const currentFollowing = useCurrentFollowing();
  const readonly = user?.name !== currentUser?.name;

  useEffect(() => {
    const fetchData = async () => {
      const username = params.username;
      if (!username) {
        throw new Error("username is required");
      }

      try {
        const user = await userStore1.fetchUserByUsername(username);
        setUser(user);

        // 尝试获取关注列表，如果失败则设置 followingCount 为 0
        let followingCountValue = 0;

        try {
          followingList = await userStore1.getFollowingList(user.name);
          followingCountValue = followingList.users.length;
          // console.log("Following list:", followingList.users);
          if (user.name === currentUser.name) {
            userStore.initCurrentFollowing(followingCountValue);
          }
        } catch (error) {
          console.error("Failed to fetch following list:", error);
          // 记录错误状态
          // if (error instanceof Error) {
          //   setFetchFollowingError(error);
          // } else {
          //   setFetchFollowingError(new Error(String(error))); // 将非Error对象转换为Error对象
          // }
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("access token not found")) {
            // 显示特定的用户提示
            toast.error(t("message.no-login-status"));
          }
          toast.error(t("message.fail-get-following-list"));
        }
        setFollowingCount(followingCountValue);

        try {
          const followerList = await userStore1.getFollowerList(user.name);
          setFollowerCount(followerList.users.length);
          // console.log("Follower list:", followerList.users);
        } catch (error) {
          console.error("Failed to fetch following list:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("access token not found")) {
            // 显示特定的用户提示
            toast.error(t("message.no-login-status"));
          }
          toast.error(t("message.fail-get-follower-list"));
        }

        if (currentUser?.username && username) {
          const followingStatus = await userStore1.isFollowingUser(
            UserFollowingPb.fromPartial({
              userName: currentUser?.username,
              followingUserName: username,
            }),
          );
          setIsFollowing(followingStatus);
        }

        loadingState.setFinish();
      } catch (error) {
        console.error(error);
        toast.error(t("message.user-not-found"));
      }
    };
    fetchData();

    // const username = params.username;
    // if (!username) {
    //   throw new Error("username is required");
    // }

    // userStore1
    //   .fetchUserByUsername(username)
    //   .then((user) => {
    //     setUser(user);
    //     loadingState.setFinish();
    //   })
    //   .catch((error) => {
    //     console.error(error);
    //     toast.error(t("message.user-not-found"));
    //   });

    // if (currentUser?.username && username) {
    //   userStore1
    //     .isFollowingUser(
    //       UserFollowingPb.fromPartial({
    //         userName: currentUser?.username,
    //         followingUserName: username,
    //       }),
    //     )
    //     .then((followingStatus) => {
    //       setIsFollowing(followingStatus);
    //     })
    //     .catch((error) => {
    //       console.error("Failed to fetch following status:", error);
    //     });
    // }

    // const fetchFollowingStatus = async () => {
    //   try {
    //     if (currentUser?.username && username) {
    //       const followingStatus = await userStore1.isFollowingUser(
    //         UserFollowingPb.fromPartial({
    //           userName: currentUser?.username,
    //           followingUserName: username,
    //         }),
    //       );
    //       setIsFollowing(followingStatus);
    //     }
    //   } catch (error) {
    //     console.error("Failed to fetch following status:", error);
    //     // 可以选择设置一个错误状态或显示错误信息
    //   }
    // };
  }, [params.username]);

  // 另一个useEffect用于处理重试逻辑
  // useEffect(() => {
  //   let retryCount = 0;
  //   const maxRetries = 10;
  //   const retryInterval = 100; // 重试间隔0.1秒

  //   if (user && fetchFollowingError) {
  //     const retryFetchFollowing = () => {
  //       if (retryCount >= maxRetries) {
  //         // 达到最大重试次数，停止重试
  //         return;
  //       }

  //       retryCount++;
  //       userStore1.getFollowingList(user.name).then((response) => {
  //         // 如果请求成功，retryFetchFollowing不会被再次调用
  //         followingList = response;
  //         setFollowingCount(followingList.users.length);
  //         console.log("Following list:", followingList.users);
  //       }).catch((error) => {
  //         console.error("Failed to fetch following list:", error);
  //         // 如果请求失败，继续重试
  //         setTimeout(retryFetchFollowing, retryInterval);
  //       });
  //     };

  //     retryFetchFollowing(); // 开始重试
  //   }
  // }, [fetchFollowingError, params.username]); // 依赖项包括错误状态和用户名

  const memoListFilter = useMemo(() => {
    if (!user) {
      return "";
    }

    const conditions = [];
    const contentSearch: string[] = [];
    const tagSearch: string[] = [];
    for (const filter of memoFilterStore.filters) {
      if (filter.factor === "contentSearch") {
        contentSearch.push(`"${filter.value}"`);
      } else if (filter.factor === "tagSearch") {
        tagSearch.push(`"${filter.value}"`);
      }
    }
    if (contentSearch.length > 0) {
      conditions.push(`content_search == [${contentSearch.join(", ")}]`);
    }
    if (tagSearch.length > 0) {
      conditions.push(`tag_search == [${tagSearch.join(", ")}]`);
    }
    return conditions.join(" && ");
  }, [user, memoFilterStore.filters]);

  const handleRssLink = () => {
    if (!user) {
      return;
    }
    // 在新标签页中打开链接
    window.open(`http://localhost:8081/u/${encodeURIComponent(user.username)}/rss.xml`);
  };

  const handleCopyProfileLink = () => {
    if (!user) {
      return;
    }

    copy(`${window.location.origin}/u/${encodeURIComponent(user.username)}`);
    toast.success(t("message.copied"));
  };

  const handleFollowing = () => {
    if (currentUser?.username && user) {
      showFollowedUsersDialog(user, handleNavigate);
    } else {
      toast.error(t("message.no-login-status"));
      return;
    }
  };

  const handleFollowed = () => {
    if (currentUser?.username && user) {
      showFollowedUsersDialog(user, handleNavigate, "follower");
    } else {
      toast.error(t("message.no-login-status"));
      return;
    }
  };

  const navigateTo = useNavigate();
  const handleNavigate = (route: string) => {
    // 执行导航操作，例如使用 useNavigate 钩子
    navigateTo(route);
  };

  // 处理关注和取消关注的方法
  const handleFollow = async () => {
    // 实现关注逻辑
    try {
      if (currentUser?.username && user?.username) {
        const followingData = await userStore1.followUser(
          UserFollowingPb.fromPartial({
            userName: currentUser?.username,
            followingUserName: user?.username,
          }),
        );
        // setUserFollowing(followingData);
        if (followingData) {
          setIsFollowing(!isFollowing);
        }
      } else if (user?.username) {
        toast.error(t("message.no-login-status"));
      }
    } catch (error) {
      console.error("Failed to follow or unfollow user:", error);
      // 可以选择设置一个错误状态或显示错误信息
      toast.error(t("message.fail-following"));
    }
  };

  const renderGenderIcon = (gender: string) => {
    switch (gender) {
      case "Male":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-3 h-3 text-blue-500 lucide lucide-mars"
          >
            <path d="M16 3h5v5" />
            <path d="m21 3-6.75 6.75" />
            <circle cx="10" cy="14" r="6" />
          </svg>
        );
      case "Female":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-3 h-3 text-pink-500 lucide lucide-venus"
          >
            <path d="M12 15v7" />
            <path d="M9 19h6" />
            <circle cx="12" cy="9" r="6" />
          </svg>
        );
      default:
        return <IdCard className="w-3 h-3" />;
    }
  };

  const calculateAge = (birth: Date) => {
    const birthDate = new Date(birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // 添加状态来管理当前选中的 Tab
  const [activeTab, setActiveTab] = useState("default"); // 'default' 或 'subscriptions'

  // 切换 Tab 的函数
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <section className="@container w-full min-h-full flex flex-col justify-start items-center">
      <MobileHeader>{!loadingState.isLoading && user && <UserSidebarDrawer owner={user} />}</MobileHeader>
      <div className={cn("w-full min-h-full flex flex-row justify-start items-start")}>
        {!loadingState.isLoading &&
          (user ? (
            <>
              <div className={cn("w-full mx-auto px-4 sm:px-6 sm:pt-3 md:pt-6 pb-8", md && "max-w-3xl")}>
                {md && (
                  <div className="flex items-center justify-end w-full gap-2 my-4">
                    <Dropdown>
                      <MenuButton slots={{ root: "div" }}>
                        <Button variant="plain" size="sm">
                          <Ellipsis className="w-4 h-4 mx-auto" />
                        </Button>
                      </MenuButton>
                      <Menu className="text-sm" size="sm" placement="bottom-start">
                        <MenuItem onClick={handleCopyProfileLink}>
                          <ExternalLinkIcon className="w-4 h-auto opacity-60" />
                          <span className="truncate">{t("common.share")}</span>
                        </MenuItem>
                        <MenuItem onClick={handleRssLink}>
                          <Rss className="w-4 h-auto opacity-60" />
                          <span className="truncate">{t("common.rss")}</span>
                        </MenuItem>
                      </Menu>
                    </Dropdown>
                  </div>
                )}
                <div className="flex items-center justify-between w-full px-3 py-4">
                  <div className={cn("flex", md ? "items-center justify-start" : "flex-col items-start")}>
                    <UserAvatar className="!w-16 !h-16 drop-shadow rounded-3xl mr-4" avatarUrl={user?.avatarUrl} />
                    <div className="flex flex-col items-start pr-4">
                      <p
                        className={cn(
                          "overflow-hidden text-3xl font-medium leading-tight text-black truncate opacity-80 dark:text-gray-200 text-ellipsis whitespace-nowrap",
                          md ? "max-w-[25vw]" : "max-w-[calc(50vw-0rem)]",
                        )}
                      >
                        {user.nickname || user.username}
                      </p>
                      <div>
                        <span className="pr-2 text-sm text-gray-400">{t("common.note")}</span>
                        <span className="pr-2 text-sm">{memoList.value.length ? memoList.value.length : 0}</span>
                        <span className="px-2 text-sm text-gray-400" onClick={handleFollowing}>
                          {t("common.subscribe")}
                        </span>
                        <span className="pr-2 text-sm" onClick={handleFollowing}>
                          {readonly ? followingCount : currentFollowing}
                        </span>
                        <span className="px-2 text-sm text-gray-400" onClick={handleFollowed}>
                          {t("common.followers")}
                        </span>
                        <span className="pr-2 text-sm" onClick={handleFollowed}>
                          {followerCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {readonly && (
                    <div className="flex items-center justify-end gap-2 mt-4">
                      {isFollowing === null ? (
                        // 未登录状态
                        <Button color="primary" size="sm" onClick={() => handleFollow()}>
                          {t("common.subscribe")}
                        </Button>
                      ) : isFollowing ? (
                        // 已关注状态，显示取消关注按钮
                        <>
                          <Button size="sm" onClick={() => handleFollow()}>
                            {t("common.unsubscribe")}
                          </Button>
                          {/* <IconButton size="sm" variant="outlined">
                            <Mail className="w-4 h-4" />
                          </IconButton> */}
                        </>
                      ) : (
                        // 未关注状态，显示关注按钮
                        <Button color="primary" size="sm" onClick={() => handleFollow()}>
                          {t("common.subscribe")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-3 pb-8">
                  <p className="pb-3 text-sm text-gray-500">{user.description}</p>
                  {!(!(user.gender && user.gender !== "Other") && !(user.birthDate && user.birthDate >= new Date(1901, 0, 1))) && (
                    <Chip startDecorator={renderGenderIcon(user.gender)}>
                      <Typography level="body-sm" fontWeight="sm">
                        {user.birthDate
                          ? calculateAge(user.birthDate) + t("common.age")
                          : user.gender === "Male"
                            ? t("common.gender-male")
                            : t("common.gender-female")}
                      </Typography>
                    </Chip>
                  )}
                  {!(!user.industry && !user.occupation) && (
                    <Chip className="ml-2" startDecorator={<BriefcaseBusiness className="w-3 h-3" />}>
                      <Typography level="body-sm" fontWeight="sm">
                        {user.industry && user.occupation
                          ? user.industry + "·" + user.occupation
                          : user.industry
                            ? user.industry
                            : user.occupation}
                      </Typography>
                    </Chip>
                  )}
                  {user.location && (
                    <Chip className="ml-2" startDecorator={<MapPin className="w-3 h-3" />}>
                      <Typography level="body-sm" fontWeight="sm">
                        {user.location}
                      </Typography>
                    </Chip>
                  )}
                  {user.university && (
                    <Chip className="ml-2" startDecorator={<GraduationCap className="w-3 h-3" />}>
                      <Typography level="body-sm" fontWeight="sm">
                        {user.university}
                      </Typography>
                    </Chip>
                  )}
                </div>
                <div className="flex mb-4 tab">
                  <button
                    className={cn(
                      "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                      activeTab === "default" ? "text-blue-500 font-bold tab-button-active" : "text-gray-500", // 选中时高亮，未选中时灰色
                    )}
                    onClick={() => handleTabChange("default")}
                  >
                    笔记
                  </button>
                  <button
                    className={cn(
                      "px-4 py-2 border-none", // 移除背景色，添加无边框样式
                      activeTab === "resource" ? "text-blue-500 font-bold tab-button-active" : "text-gray-500", // 选中时高亮，未选中时灰色
                    )}
                    onClick={() => handleTabChange("resource")}
                  >
                    照片
                  </button>
                </div>
                {activeTab === "default" ? (
                  <>
                    <MemoFilters />
                    <PagedMemoList
                      renderer={(memo: Memo) => (
                        <MemoView key={`${memo.name}-${memo.displayTime}`} memo={memo} showVisibility showPinned compact />
                      )}
                      listSort={(memos: Memo[]) => {
                        let sortedMemos = memos.filter(
                          (memo) =>
                            memo.state === State.NORMAL &&
                            memoFilterStore.filters.every((filter) => {
                              if (filter.factor === "visibility") {
                                return memo.visibility === filter.value;
                              } else if (filter.factor === "resources") {
                                return memo.resources.length > 0;
                              } else {
                                return true;
                              }
                            }),
                        );
                        sortedMemos =
                          memoFilterStore.orderByComment === "asc" || memoFilterStore.orderByComment === "desc"
                            ? sortedMemos.sort((a, b) => {
                                // 计算 memo a 中 type 为 COMMENT 的 relations 数量
                                const commentCountA = a.relations.filter((relation) => relation.type === "COMMENT").length;
                                // 计算 memo b 中 type 为 COMMENT 的 relations 数量
                                const commentCountB = b.relations.filter((relation) => relation.type === "COMMENT").length;
                                return memoFilterStore.orderByComment === "asc"
                                  ? commentCountA - commentCountB // 升序
                                  : commentCountB - commentCountA; // 降序
                              })
                            : memoFilterStore.orderByReactions === "asc" || memoFilterStore.orderByReactions === "desc"
                              ? sortedMemos.sort((a, b) => {
                                  const reactionsLengthA = a.reactions.length;
                                  const reactionsLengthB = b.reactions.length;
                                  return memoFilterStore.orderByReactions === "asc"
                                    ? reactionsLengthA - reactionsLengthB // 升序
                                    : reactionsLengthB - reactionsLengthA; // 降序
                                })
                              : sortedMemos.sort((a, b) =>
                                  memoFilterStore.orderByTimeAsc
                                    ? dayjs(a.displayTime).unix() - dayjs(b.displayTime).unix()
                                    : dayjs(b.displayTime).unix() - dayjs(a.displayTime).unix(),
                                );
                        sortedMemos = sortedMemos.sort((a, b) => Number(b.pinned) - Number(a.pinned));
                        return sortedMemos;
                      }}
                      owner={user?.name}
                      direction={memoFilterStore.orderByTimeAsc ? Direction.ASC : Direction.DESC}
                      oldFilter={memoListFilter}
                    />
                  </>
                ) : (
                  <Resources owner={user?.name} />
                )}
              </div>
              {md && (
                <div
                  className={cn(
                    "sticky top-0 left-0 shrink-0 h-[100svh] transition-all",
                    "border-r border-gray-200 dark:border-zinc-800",
                    lg ? "px-5 w-72" : "px-4 w-56",
                  )}
                >
                  <UserSidebar owner={user} className="py-6" />
                </div>
              )}
            </>
          ) : (
            <p>Not found</p>
          ))}
      </div>
    </section>
  );
};

export default UserProfile;
