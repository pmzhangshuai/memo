import { List, ListItem } from "@mui/joy";
import { Button, Input } from "@usememos/mui";
import { XIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { memoServiceClient } from "@/grpcweb";
import useLoading from "@/hooks/useLoading";
import { useUserStatsStore } from "@/store/v1";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";

interface Props extends DialogProps {
  tag: string;
}

const RenameTagDialog: React.FC<Props> = (props: Props) => {
  const { tag, destroy } = props;
  const t = useTranslate();
  const userStatsStore = useUserStatsStore();
  const [newName, setNewName] = useState(tag);
  const requestState = useLoading(false);

  const handleTagNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value.trim());
  };

  const handleConfirm = async () => {
    if (!newName || newName.includes(" ")) {
      toast.error("Tag name cannot be empty or contain spaces");
      return;
    }
    if (newName === tag) {
      toast.error("New name cannot be the same as the old name");
      return;
    }

    try {
      await memoServiceClient.renameMemoTag({
        parent: "memos/-",
        oldTag: tag,
        newTag: newName,
      });
      toast.success("Rename tag successfully");
      userStatsStore.setStateId();
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }
    destroy();
  };

  return (
    <>
      <div className="dialog-header-container">
        <p className="title-text">{t("common.rename-tag")}</p>
        <Button size="sm" variant="plain" onClick={() => destroy()}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <div className="max-w-xs dialog-content-container">
        <div className="flex flex-col items-start justify-start w-full mb-3">
          <div className="relative flex flex-row items-center justify-start w-full mb-2 space-x-2">
            <span className="w-20 text-sm text-right whitespace-nowrap shrink-0">{t("common.name-old")}</span>
            <Input className="w-full" readOnly disabled type="text" placeholder="A new tag name" value={tag} />
          </div>
          <div className="relative flex flex-row items-center justify-start w-full mb-2 space-x-2">
            <span className="w-20 text-sm text-right whitespace-nowrap shrink-0">{t("common.name-new")}</span>
            <Input className="w-full" type="text" placeholder="A new tag name" value={newName} onChange={handleTagNameInputChange} />
          </div>
          <p className="mt-2 text-sm leading-relaxed">{t("common.rename-tip")}</p>
        </div>
        <div className="flex flex-row items-center justify-end w-full space-x-2">
          <Button variant="plain" disabled={requestState.isLoading} onClick={destroy}>
            {t("common.cancel")}
          </Button>
          <Button color="primary" disabled={requestState.isLoading} onClick={handleConfirm}>
            {t("common.confirm")}
          </Button>
        </div>
      </div>
    </>
  );
};

function showRenameTagDialog(props: Pick<Props, "tag">) {
  generateDialog(
    {
      className: "rename-tag-dialog",
      dialogName: "rename-tag-dialog",
    },
    RenameTagDialog,
    props,
  );
}

export default showRenameTagDialog;
