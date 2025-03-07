import { List, ListItem, ListItemButton, ListItemContent, ListItemDecorator, Typography } from "@mui/joy";
import { Button } from "@usememos/mui";
import { CircleMinus, CirclePlus, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import useCurrentUser from "@/hooks/useCurrentUser";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useUserStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import {
  User as UserPb,
  FollowingListResponse,
  UserFollowing as UserFollowingPb,
  FollowerListResponse,
} from "@/types/proto/api/v1/user_service";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";
import UserAvatar from "./UserAvatar";

interface FollowedUsersDialogProps extends DialogProps {
  owner: UserPb;
  type?: "following" | "follower";
  onNavigate?: (route: string) => void;
}

const FollowedUsersDialog: React.FC<FollowedUsersDialogProps> = ({ destroy, owner, type, onNavigate }: FollowedUsersDialogProps) => {
  const t = useTranslate();
  const userStore1 = useUserStore();
  // const [followingUsers, setFollowingUsers] = useState<FollowingListResponse>();
  // const [followedUsers, setFollowedUsers] = useState<FollowerListResponse>();
  const [userList, setUserList] = useState<UserPb[]>([]);
  const [userFollowingStatus, setUserFollowingStatus] = useState<{ [key: string]: boolean | null }>({});
  const currentUser = useCurrentUser();
  const readonly = owner.name !== currentUser?.name;

  const fetchFollowingUsers = async () => {
    const users = await userStore1.getFollowingList(owner.name);
    setUserList(users.users);
    if (!readonly) {
      // 初始化 userFollowingStatus
      setUserFollowingStatus(
        users.users.reduce(
          (acc, user) => {
            acc[user.name] = true;
            return acc;
          },
          {} as { [key: string]: boolean | null },
        ),
      );
      //   userStore.state.setPartial({ currentFollowing: users.users.length });
      userStore.initCurrentFollowing(users.users.length);
    } else if (currentUser) {
      const myFollowings = await userStore1.getFollowingList(currentUser.name);
      // 初始化 userFollowingStatus，根据是否关注设置 true 或 false
      setUserFollowingStatus(
        users.users.reduce(
          (acc, user) => {
            acc[user.name] = myFollowings.users.some((following) => following.name === user.name);
            return acc;
          },
          {} as { [key: string]: boolean | null },
        ),
      );
    }
  };

  async function fetchFollowedUsers() {
    const users = await userStore1.getFollowerList(owner.name);
    setUserList(users.users);
    const myFollowings = await userStore1.getFollowingList(currentUser.name);
    // 初始化 userFollowingStatus，根据是否关注设置 true 或 false
    setUserFollowingStatus(
      users.users.reduce(
        (acc, user) => {
          acc[user.name] = myFollowings.users.some((following) => following.name === user.name);
          return acc;
        },
        {} as { [key: string]: boolean | null },
      ),
    );
  }

  const handleCloseBtnClick = () => {
    destroy();
  };

  //   const navigateTo = useNavigateTo();

  //   const currentUser = useCurrentUser();
  //   const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const handleFollow = async (followingUser: UserPb) => {
    try {
      const followingData = await userStore1.followUser(
        UserFollowingPb.fromPartial({
          userName: currentUser.username,
          followingUserName: followingUser.username,
        }),
      );
      if (followingData) {
        // setIsFollowing(!isFollowing);
        const beforeStatus = userFollowingStatus[followingUser.name];
        setUserFollowingStatus((prevStatus) => ({
          ...prevStatus,
          [followingUser.name]: !prevStatus[followingUser.name],
        }));
        // console.log("beforeFollowing", userStore.state.currentFollowing);
        if (beforeStatus && userStore.state.currentFollowing) {
          //   console.log("unfollow");
          userStore.unFollowUser();
          //   userStore.state.setPartial({ currentFollowing: userStore.state.currentFollowing - 1 });
        } else if (userStore.state.currentFollowing) {
          //   console.log("follow");
          userStore.followUser();
          //   userStore.state.setPartial({ currentFollowing: userStore.state.currentFollowing + 1 });
        }
        // console.log("currentFollowing", userStore.state.currentFollowing);
      }
    } catch (error) {
      console.error("Failed to follow or unfollow user:", error);
      // 可以选择设置一个错误状态或显示错误信息
      toast.error(t("message.fail-following"));
    }
  };

  // useEffect(() => {
  //   console.log("userFollowingStatus", userFollowingStatus);
  // }, [userFollowingStatus]);

  useEffect(() => {
    if (type === "follower") {
      fetchFollowedUsers();
    } else {
      fetchFollowingUsers();
    }
  }, [owner.name, type]);

  return (
    <>
      <div className="dialog-header-container !w-64c mb-0-override">
        <p className="title-text">
          {type === "follower" ? t("common.followers") : t("common.following")}
          {` (${userList.length})`}
        </p>
        <Button size="sm" variant="plain" onClick={handleCloseBtnClick}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <List className="w-full min-w-[20rem] overflow-y-scroll" style={{ maxHeight: "70vh" }}>
        {userList.map((user) => (
          <ListItem
            key={user.name}
            endAction={
              currentUser &&
              currentUser.name !== user.name &&
              (!userFollowingStatus[user.name] ? (
                <CirclePlus style={{ color: "rgb(13, 148, 136, 1)" }} className="hover:opacity-70" onClick={() => handleFollow(user)} />
              ) : (
                <CircleMinus style={{ color: "red" }} className="hover:opacity-70" onClick={() => handleFollow(user)} />
              ))
            }
          >
            <ListItemButton
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`/u/${encodeURIComponent(user.username)}`);
                  handleCloseBtnClick();
                }
              }}
            >
              <ListItemDecorator>
                <UserAvatar className="!w-10 !h-10" avatarUrl={user.avatarUrl} />
              </ListItemDecorator>
              <ListItemContent className="ml-2">
                <Typography level="title-sm">{user.nickname}</Typography>
                <Typography level="body-sm" textColor="rgb(156, 163, 175, 1)" noWrap>
                  {user.description}
                </Typography>
              </ListItemContent>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {/* <div className="space-y-2 dialog-content-container">
        {followedUsers?.users.map((user) => (
          <div key={user.name} className="flex flex-row items-center justify-between w-full p-2 border-b">
            <div className="flex flex-row items-center">
              <UserAvatar className="!w-10 !h-10" avatarUrl={user.avatarUrl} />
              <div className="ml-2">
                <p className="text-sm">{user.nickname}</p>
                <p className="overflow-hidden text-sm text-gray-400 text-ellipsis whitespace-nowrap">{user.description}</p>
              </div>
            </div>
            {!readonly &&
              (userFollowingStatus[user.name] === null ? (
                // 未登录状态
                <Button color="primary" size="sm" onClick={() => handleFollow(user)}>
                  {t("common.subscribe")}
                </Button>
              ) : userFollowingStatus[user.name] ? (
                // 已关注状态，显示取消关注按钮
                <Button size="sm" onClick={() => handleFollow(user)}>
                  {t("common.unsubscribe")}
                </Button>
              ) : (
                // 未关注状态，显示关注按钮
                <Button color="primary" size="sm" onClick={() => handleFollow(user)}>
                  {t("common.subscribe")}
                </Button>
              ))}
          </div>
        ))}
      </div> */}
    </>
  );
};

function showFollowedUsersDialog(owner: UserPb, onNavigate?: (route: string) => void, type?: "following" | "follower") {
  generateDialog(
    {
      className: "followed-users-dialog",
      dialogName: "followed-users-dialog",
    },
    (props: DialogCallback) => <FollowedUsersDialog {...props} owner={owner} type={type} onNavigate={onNavigate} />,
  );
}

export default showFollowedUsersDialog;
