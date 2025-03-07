import { Button, IconButton, Select, Option } from "@mui/joy";
import { Checkbox } from "@usememos/mui";
import copy from "copy-to-clipboard";
import { X, Loader, Download, File, Link } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE } from "@/helpers/consts";
import { getDateTimeString } from "@/helpers/datetime";
import { downloadFileFromUrl } from "@/helpers/utils";
import useCurrentUser from "@/hooks/useCurrentUser";
import useLoading from "@/hooks/useLoading";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import toImage from "@/labs/html2image";
import { useUserStore, useMemoStore, memoNamePrefix, useMemoList } from "@/store/v1";
import { Direction, State } from "@/types/proto/api/v1/common";
// MemoNamePrefix
import { Visibility } from "@/types/proto/api/v1/memo_service";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import { convertVisibilityToString } from "@/utils/memo";
import { generateDialog } from "./Dialog";
import MemoContent from "./MemoContent";
import MemoResourceListView from "./MemoResourceListView";
import UserAvatar from "./UserAvatar";
import VisibilityIcon from "./VisibilityIcon";
import "@/less/share-memo-dialog.less";

interface Props extends DialogProps {
  memoName: string;
  responsiveWidth: { sm: boolean; md: boolean; lg: boolean };
}

const ShareMemoDialog: React.FC<Props> = (props: Props) => {
  const { memoName, destroy } = props;
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const userStore = useUserStore();
  const memoStore = useMemoStore();
  const downloadingImageState = useLoading(false);
  const loadingState = useLoading();
  const memoContainerRef = useRef<HTMLDivElement>(null);
  //   memoStore.getMemoByName(`${MemoNamePrefix}${memoId}`);
  const memo = memoStore.getMemoByName(memoName);
  const user = userStore.getUserByName(memo.creator);
  const readonly = memo?.creator !== currentUser?.name;

  const [isDisplayUser, setIsDisplayUser] = useState(true);
  //   const memoList = useMemoList();

  useEffect(() => {
    (async () => {
      await userStore.getOrFetchUserByName(memo.creator);
      loadingState.setFinish();
    })();
  }, []);

  const [memoCount, setMemoCount] = useState(0);
  useEffect(() => {
    const fetchMemos = async () => {
      const response = await memoStore.fetchMemos({
        parent: memo.creator,
        isFollow: false,
        state: State.NORMAL,
        direction: Direction.DESC,
        filter: "",
        oldFilter: "",
        pageSize: DEFAULT_LIST_MEMOS_PAGE_SIZE,
        pageToken: "",
      });
      setMemoCount(response?.memos?.length || 0);
    };
    fetchMemos();
  }, [memo.creator]);

  const handleCloseBtnClick = () => {
    destroy();
  };

  const handleDownloadImageBtnClick = () => {
    if (!memoContainerRef.current) {
      return;
    }

    downloadingImageState.setLoading();
    toImage(memoContainerRef.current, {
      pixelRatio: window.devicePixelRatio * 2,
    })
      .then((url) => {
        downloadFileFromUrl(url, `memos-${getDateTimeString(Date.now())}.png`);
        downloadingImageState.setFinish();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleDownloadTextFileBtnClick = () => {
    const blob = new Blob([memo.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadFileFromUrl(url, `memos-${getDateTimeString(Date.now())}.md`);
    URL.revokeObjectURL(url);
  };

  const handleCopyLinkBtnClick = () => {
    copy(`${window.location.origin}/${memo.name}`);
    toast.success(t("message.succeed-copy-link"));
  };

  const handleMemoVisibilityOptionChanged = async (visibility: Visibility) => {
    const updatedMemo = await memoStore.updateMemo(
      {
        name: memo.name,
        visibility: visibility,
      },
      ["visibility"],
    );

    if (updatedMemo.visibility == visibility) {
      toast.success(t("message.update-succeed"));
    }
  };

  if (loadingState.isLoading) {
    return null;
  }

  //   const { sm, md, lg } = useResponsiveWidth();
  //   console.log("responsiveWidth:", props.responsiveWidth);
  const { sm, md, lg } = props.responsiveWidth;

  return (
    <>
      <div className="dialog-header-container py-3 px-4 !mb-0 rounded-t-lg">
        <p className="">{t("common.share")}</p>
        <IconButton size="sm" onClick={handleCloseBtnClick}>
          <X className="w-5 h-auto" />
        </IconButton>
      </div>
      <div className="relative flex flex-col items-start justify-start w-full dialog-content-container">
        <div className="flex flex-row items-center justify-between w-full px-4 pb-3 space-x-2">
          <div className="flex flex-row items-center justify-start space-x-2">
            <Button color="neutral" variant="outlined" disabled={downloadingImageState.isLoading} onClick={handleDownloadImageBtnClick}>
              {downloadingImageState.isLoading ? (
                <Loader className="w-4 h-auto mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-auto mr-1" />
              )}
              {t("common.image")}
            </Button>
            {/* <Button color="neutral" variant="outlined" onClick={handleDownloadTextFileBtnClick}>
              <File className="w-4 h-auto mr-1" />
              {t("common.file")}
            </Button> */}
            <Button color="neutral" variant="outlined" onClick={handleCopyLinkBtnClick}>
              <Link className="w-4 h-auto mr-1" />
              {t("common.link")}
            </Button>
          </div>
          <div>
            <Checkbox
              label={t("common.is-show-user-info")}
              size="sm"
              checked={isDisplayUser}
              onChange={() => setIsDisplayUser(!isDisplayUser)}
            />
          </div>
          {/* {!readonly && (
            <Select
              className="w-auto text-sm"
              variant="plain"
              value={memo.visibility}
              startDecorator={<VisibilityIcon visibility={memo.visibility} />}
              onChange={(_, visibility) => {
                if (visibility) {
                  handleMemoVisibilityOptionChanged(visibility);
                }
              }}
            >
              {[Visibility.PRIVATE, Visibility.PUBLIC].map((item) => (
                <Option key={item} value={item} className="whitespace-nowrap">
                  {t(`memo.visibility.${convertVisibilityToString(item).toLowerCase()}` as any)}
                </Option>
              ))}
            </Select>
          )} */}
        </div>
        <div
          className={cn("w-full border-t dark:border-zinc-700 overflow-clip overflow-y-scroll", !md ? "w-[20rem]" : "w-[25rem]")}
          style={{ maxHeight: "70vh" }}
        >
          <div
            className="relative flex flex-col items-start justify-start w-full h-auto bg-white select-none dark:bg-zinc-800"
            ref={memoContainerRef}
          >
            <span className="w-full px-6 pt-5 pb-2 text-sm text-gray-500">{getDateTimeString(memo.displayTime)}</span>
            <div className="w-full px-6 pb-4 space-y-2 text-base">
              <MemoContent memoName={memo.name} nodes={memo.nodes} readonly={true} disableFilter />
              <MemoResourceListView resources={memo.resources} />
            </div>
            {isDisplayUser && (
              <div className="flex flex-row items-center justify-between w-full px-6 py-4 bg-gray-100 dark:bg-zinc-900">
                <div className="flex flex-row items-center justify-start">
                  <UserAvatar className="w-10 h-10 mr-2" avatarUrl={user.avatarUrl} />
                  <div className="flex flex-col items-start justify-center w-auto mr-2 truncate grow">
                    <span className="w-full font-medium leading-tight text-gray-600 truncate text dark:text-gray-300">
                      {user.nickname || user.username}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {memoCount}
                      {t("common.memo-count")}
                    </span>
                  </div>
                </div>
                <span className="text-gray-500 dark:text-gray-400">{t("common.signature")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default function showShareMemoDialog(memoName: string, responsiveWidth: { sm: boolean; md: boolean; lg: boolean }): void {
  generateDialog(
    {
      className: "share-memo-dialog",
      dialogName: "share-memo-dialog",
    },
    ShareMemoDialog,
    { memoName, responsiveWidth },
  );
}
