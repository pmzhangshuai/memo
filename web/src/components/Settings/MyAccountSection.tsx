import { Dropdown, Menu, MenuButton, MenuItem } from "@mui/joy";
import { Button } from "@usememos/mui";
import { MoreVerticalIcon, PenLineIcon } from "lucide-react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useTranslate } from "@/utils/i18n";
import showChangeMemberPasswordDialog from "../ChangeMemberPasswordDialog";
import showUpdateAccountDialog from "../UpdateAccountDialog";
import UserAvatar from "../UserAvatar";
import AccessTokenSection from "./AccessTokenSection";

const MyAccountSection = () => {
  const t = useTranslate();
  const user = useCurrentUser();

  return (
    <div className="w-full gap-2 pt-2 pb-4">
      <p className="font-medium text-gray-700 dark:text-gray-500">{t("setting.account-section.title")}</p>
      <div className="flex flex-row items-center justify-start w-full mt-2">
        <UserAvatar className="w-10 h-10 mr-2 shrink-0" avatarUrl={user.avatarUrl} />
        <div className="max-w-[calc(100%-3rem)] flex flex-col justify-center items-start">
          <p className="w-full">
            <span className="text-xl font-medium leading-tight">{user.nickname}</span>
            <span className="ml-1 text-base leading-tight text-gray-500 dark:text-gray-400">({user.username})</span>
          </p>
          <p className="w-4/5 text-sm leading-tight truncate">{user.description}</p>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start w-full mt-2 space-x-2">
        <Button variant="outlined" size="sm" onClick={showUpdateAccountDialog}>
          <PenLineIcon className="w-4 h-4 mx-auto mr-1" />
          {t("common.edit")}
        </Button>
        <Dropdown>
          <MenuButton slots={{ root: "div" }}>
            <Button variant="outlined" size="sm">
              <MoreVerticalIcon className="w-4 h-4 mx-auto" />
            </Button>
          </MenuButton>
          <Menu className="text-sm" size="sm" placement="bottom">
            <MenuItem onClick={() => showChangeMemberPasswordDialog(user)}>{t("setting.account-section.change-password")}</MenuItem>
          </Menu>
        </Dropdown>
      </div>

      {/* <AccessTokenSection /> */}
    </div>
  );
};

export default MyAccountSection;
