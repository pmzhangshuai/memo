import { Dropdown, Menu, MenuButton, MenuItem } from "@mui/joy";
import { Button } from "@usememos/mui";
import { ArrowDownToLine, BookText, Download, Hash, Lock, LogOutIcon, MoreVerticalIcon, PenLineIcon, Rss, SmileIcon } from "lucide-react";
import { authServiceClient, memoServiceClient } from "@/grpcweb";
import { downloadFileFromUrl } from "@/helpers/utils";
import useCurrentUser from "@/hooks/useCurrentUser";
import { User_Role } from "@/types/proto/api/v1/user_service";
import { useTranslate } from "@/utils/i18n";
import showChangeMemberPasswordDialog from "../ChangeMemberPasswordDialog";
import showUpdateAccountDialog from "../UpdateAccountDialog";
import UserAvatar from "../UserAvatar";
import AccessTokenSection from "./AccessTokenSection";

const MyAccountSection = () => {
  const t = useTranslate();
  const user = useCurrentUser();

  const handleSignOut = async () => {
    await authServiceClient.signOut({});
    window.location.href = "/auth";
  };

  // const handleTest = async () => {
  //   console.log("currentUser:", user);
  // };

  // const handleExportXml = () => {
  //   // 创建一个隐藏的 <a> 标签
  //   const link = document.createElement('a');
  //   link.href = `http://localhost:8081/u/${encodeURIComponent(user.username)}/rss.xml`;
  //   link.download = `${user.username}_rss.xml`;
  //   link.target = "_blank";
  //   // link.style.display = 'none';
  //   document.body.appendChild(link);
  //   // 触发点击事件开始下载文件
  //   link.click();
  //   // 下载完成后移除 <a> 标签
  //   document.body.removeChild(link);
  // };

  const handleExportXml = async () => {
    try {
      // 使用 fetch API 获取 XML 文件
      const response = await fetch(`http://localhost:8081/u/${encodeURIComponent(user.username)}/rss.xml`);

      // 检查响应状态码，确保请求成功
      if (!response.ok) {
        throw new Error(`Failed to fetch XML file: ${response.statusText}`);
      }

      // 获取文件内容作为 Blob 对象
      const blob = await response.blob();

      // 创建一个临时的 <a> 元素用于触发下载
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob); // 创建一个指向 Blob 对象的 URL
      link.download = `${user.username}_notes_rss.xml`; // 设置下载文件的名称

      // 将 <a> 元素添加到文档中（为了触发点击事件）
      document.body.appendChild(link);
      link.click(); // 触发点击事件，开始下载

      // 下载完成后移除 <a> 元素
      document.body.removeChild(link);

      // 释放 URL 对象
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading XML file:", error);
      // 这里可以添加错误处理逻辑，比如显示错误消息给用户
    }
  };

  const downloadExportedMemos = async (user: any) => {
    const { content } = await memoServiceClient.ExportMemos({ filter: `creator == "${user.name}"` });
    const downloadUrl = window.URL.createObjectURL(new Blob([content]));
    downloadFileFromUrl(downloadUrl, `${user.username}_notes_markdown.zip`);
    URL.revokeObjectURL(downloadUrl);
  };

  const isHost = user.role === User_Role.HOST;

  return (
    <div className="flex flex-col w-full gap-2 pt-2 pb-4">
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
          <Menu className="text-sm" size="sm" placement="bottom-start">
            <MenuItem onClick={() => showChangeMemberPasswordDialog(user)}>
              <Lock className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("setting.account-section.change-password")}</span>
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <LogOutIcon className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("common.sign-out")}</span>
            </MenuItem>
            {/* <MenuItem onClick={handleTest}>
              <span className="truncate">输出当前用户信息</span>
            </MenuItem> */}
          </Menu>
        </Dropdown>
      </div>
      <p className="mt-2 font-medium text-gray-700 dark:text-gray-500">{t("setting.account-section.data")}</p>
      {/* <div className="flex flex-row items-center justify-between w-full">
        <span>{t("common.language")}</span>
        <Dropdown>
          <MenuButton slots={{ root: "div" }}>
            <span className="flex items-center justify-center -ml-1 rounded-full hover:opacity-70">
              <MoreVerticalIcon className="w-4 h-4 mx-auto text-gray-500 dark:text-gray-400" />
            </span>
          </MenuButton>
          <Menu placement="bottom-start" style={{ zIndex: "9999" }}>
            <MenuItem>
              <LogOutIcon className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("common.sign-out")}</span>
            </MenuItem>
            <MenuItem>
              <SmileIcon className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("common.about")}</span>
            </MenuItem>
          </Menu>
        </Dropdown>
      </div> */}
      <div className="flex flex-row items-center justify-between w-full">
        <span>{t("setting.account-section.export-notes")}</span>
        <Dropdown>
          <MenuButton slots={{ root: "div" }}>
            <span className="flex items-center justify-center -ml-1 rounded-full hover:opacity-70">
              <ArrowDownToLine className="w-4 h-4 mx-auto text-gray-500 dark:text-gray-400" />
            </span>
          </MenuButton>
          <Menu placement="bottom-end" style={{ zIndex: "9999" }}>
            <MenuItem onClick={() => downloadExportedMemos(user)}>
              <BookText className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("setting.account-section.export-notes-markdown")}</span>
            </MenuItem>
            <MenuItem onClick={handleExportXml}>
              <Rss className="w-4 h-auto opacity-60" />
              <span className="truncate">{t("setting.account-section.export-notes-xml")}</span>
            </MenuItem>
          </Menu>
        </Dropdown>
      </div>
      {isHost ? <AccessTokenSection /> : null}
    </div>
  );
};

export default MyAccountSection;
