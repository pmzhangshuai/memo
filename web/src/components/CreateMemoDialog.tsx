import { Button } from "@usememos/mui";
import { XIcon } from "lucide-react";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";
import MemoEditor from "./MemoEditor";

interface CreateMemoDialogProps extends DialogProps {
  action?: string;
  relatedMemoName?: string;
}

const CreateMemoDialog: React.FC<CreateMemoDialogProps> = ({ destroy, action, relatedMemoName }: CreateMemoDialogProps) => {
  const t = useTranslate();

  const handleCloseBtnClick = (memoName?: string) => {
    destroy();
  };

  const { md } = useResponsiveWidth();
  
  return (
    <>
      <div className="flex flex-row items-center justify-between w-full mb-4">
        <p className="title-text">{t("memo.create-memo")}</p>
        <Button size="sm" variant="plain" onClick={() => handleCloseBtnClick()}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <div className={cn("flex flex-col items-start justify-start", !md ? "w-[20rem]" : "w-[26rem]")}>
        <MemoEditor className="border-none !p-0 -mb-2" action={action} relatedMemoName={relatedMemoName} onConfirm={handleCloseBtnClick} />
      </div>
      {/* <div className="dialog-header-container !w-64c">
        <p className="title-text">{t("memo.create-memo")}</p>
        <Button size="sm" variant="plain" onClick={() => handleCloseBtnClick()}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <MemoEditor className="mb-4" action={action} relatedMemoName={relatedMemoName} onConfirm={handleCloseBtnClick} /> */}
    </>
  );
};

function showCreateMemoDialog(action?: string, relatedMemoName?: string) {
  generateDialog(
    {
      className: "create-memo-dialog",
      dialogName: "create-memo-dialog",
    },
    CreateMemoDialog,
    {
      action: action,
      relatedMemoName: relatedMemoName,
    },
  );
}

export default showCreateMemoDialog;
