import { Textarea, Select, Option } from "@mui/joy";
import { Button, Input } from "@usememos/mui";
import { isEqual } from "lodash-es";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { authServiceClient } from "@/grpcweb";
import { convertFileToBase64 } from "@/helpers/utils";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUserStore, useWorkspaceSettingStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import { User as UserPb } from "@/types/proto/api/v1/user_service";
import { WorkspaceGeneralSetting, WorkspaceSettingKey } from "@/types/proto/store/workspace_setting";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";
import UserAvatar from "./UserAvatar";

type Props = DialogProps;

interface State {
  avatarUrl: string;
  username: string;
  nickname: string;
  email: string;
  description: string;
  gender: string;
  birthDate: Date;
  location: string;
  industry: string;
  occupation: string;
  university: string;
}

const UpdateAccountDialog: React.FC<Props> = ({ destroy }: Props) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const userStore = useUserStore();
  const [state, setState] = useState<State>({
    avatarUrl: currentUser.avatarUrl,
    username: currentUser.username,
    nickname: currentUser.nickname,
    email: currentUser.email,
    description: currentUser.description,
    gender: currentUser.gender ?? "Other",
    birthDate:
      currentUser.birthDate && currentUser.birthDate >= new Date(1901, 0, 1)
        ? currentUser.birthDate
        : (currentUser.createTime ?? new Date()),
    location: currentUser.location,
    industry: currentUser.industry,
    occupation: currentUser.occupation,
    university: currentUser.university,
  });
  const workspaceSettingStore = useWorkspaceSettingStore();
  const workspaceGeneralSetting =
    workspaceSettingStore.getWorkspaceSettingByKey(WorkspaceSettingKey.GENERAL)?.generalSetting || WorkspaceGeneralSetting.fromPartial({});

  const handleCloseBtnClick = async () => {
    destroy();
  };

  const setPartialState = (partialState: Partial<State>) => {
    setState((state) => {
      return {
        ...state,
        ...partialState,
      };
    });
  };

  const handleAvatarChanged = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const image = files[0];
      if (image.size > 2 * 1024 * 1024) {
        toast.error("Max file size is 2MB");
        return;
      }
      try {
        const base64 = await convertFileToBase64(image);
        setPartialState({
          avatarUrl: base64,
        });
      } catch (error) {
        console.error(error);
        toast.error(`Failed to convert image to base64`);
      }
    }
  };

  const handleNicknameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartialState({
      nickname: e.target.value as string,
    });
  };

  const handleUsernameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartialState({
      username: e.target.value as string,
    });
  };

  const handleEmailChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        email: e.target.value as string,
      };
    });
  };

  const handleDescriptionChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((state) => {
      return {
        ...state,
        description: e.target.value as string,
      };
    });
  };

  const handleGenderChanged = (event: React.SyntheticEvent | null, newValue: string | null) => {
    // console.log("GenderChanged:", newValue);
    setState((state) => {
      return {
        ...state,
        gender: newValue ?? "Other",
      };
    });
  };

  const handleBirthDateChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        birthDate: new Date(e.target.value),
      };
    });
  };

  const handleLocationChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        location: e.target.value as string,
      };
    });
  };

  const handleIndustryChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        industry: e.target.value as string,
      };
    });
  };

  const handleOccupationChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        occupation: e.target.value as string,
      };
    });
  };

  const handleUniversityChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        university: e.target.value as string,
      };
    });
  };

  const handleSaveBtnClick = async () => {
    if (state.username === "") {
      toast.error(t("message.fill-all"));
      return;
    }

    try {
      const updateMask = [];
      if (!isEqual(currentUser.username, state.username)) {
        updateMask.push("username");
      }
      if (!isEqual(currentUser.nickname, state.nickname)) {
        updateMask.push("nickname");
      }
      if (!isEqual(currentUser.email, state.email)) {
        updateMask.push("email");
      }
      if (!isEqual(currentUser.avatarUrl, state.avatarUrl)) {
        updateMask.push("avatar_url");
      }
      if (!isEqual(currentUser.description, state.description)) {
        updateMask.push("description");
      }
      if (!isEqual(currentUser.gender, state.gender)) {
        updateMask.push("gender");
      }
      if (!isEqual(currentUser.birthDate, state.birthDate)) {
        updateMask.push("birth_date");
      }
      if (!isEqual(currentUser.location, state.location)) {
        updateMask.push("location");
      }
      if (!isEqual(currentUser.industry, state.industry)) {
        updateMask.push("industry");
      }
      if (!isEqual(currentUser.occupation, state.occupation)) {
        updateMask.push("occupation");
      }
      if (!isEqual(currentUser.university, state.university)) {
        updateMask.push("university");
      }
      // console.log("original user:", currentUser);
      // console.log("update user:", state);
      await userStore.updateUser(
        UserPb.fromPartial({
          name: currentUser.name,
          username: state.username,
          nickname: state.nickname,
          email: state.email,
          avatarUrl: state.avatarUrl,
          description: state.description,
          gender: state.gender,
          birthDate: state.birthDate,
          location: state.location,
          industry: state.industry,
          occupation: state.occupation,
          university: state.university,
        }),
        updateMask,
      );
      toast.success(t("message.update-succeed"));
      // console.log("update user succeed:", currentUser);
      handleCloseBtnClick();
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }
  };

  return (
    <>
      <div className="dialog-header-container !w-64">
        <p className="title-text">{t("setting.account-section.update-information")}</p>
        <Button size="sm" variant="plain" onClick={handleCloseBtnClick}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <div className="space-y-2 overflow-y-scroll dialog-content-container" style={{ maxHeight: "70vh" }}>
        <div className="flex flex-row items-center justify-start w-full">
          <span className="mr-2 text-sm">{t("common.avatar")}</span>
          <label className="relative cursor-pointer hover:opacity-80">
            <UserAvatar className="!w-10 !h-10" avatarUrl={state.avatarUrl} />
            <input type="file" accept="image/*" className="absolute inset-0 invisible w-full h-full" onChange={handleAvatarChanged} />
          </label>
          {state.avatarUrl && (
            <XIcon
              className="w-4 h-auto ml-1 cursor-pointer opacity-60 hover:opacity-80"
              onClick={() =>
                setPartialState({
                  avatarUrl: "",
                })
              }
            />
          )}
        </div>
        <p className="text-sm">
          {t("common.username")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.username-note")})</span>
        </p>
        <Input
          className="w-full"
          value={state.username}
          onChange={handleUsernameChanged}
          disabled={workspaceGeneralSetting.disallowChangeUsername}
        />
        <p className="text-sm">
          {t("common.nickname")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.nickname-note")})</span>
        </p>
        <Input
          className="w-full"
          value={state.nickname}
          onChange={handleNicknameChanged}
          disabled={workspaceGeneralSetting.disallowChangeNickname}
        />
        <p className="text-sm">
          {t("common.email")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth type="email" value={state.email} onChange={handleEmailChanged} />
        <p className="text-sm">
          {t("common.gender")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Select
          size="md"
          className="w-full"
          placeholder={t("common.select-placeholder")}
          defaultValue={state.gender}
          onChange={handleGenderChanged}
        >
          <Option value="Other">{t("common.gender-other")}</Option>
          <Option value="Male">{t("common.gender-male")}</Option>
          <Option value="Female">{t("common.gender-female")}</Option>
        </Select>
        {/* <Input fullWidth value={state.gender} onChange={handleGenderChanged} /> */}
        <p className="text-sm">
          {t("common.birthDate")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input type="date" fullWidth value={state.birthDate.toISOString().split("T")[0]} onChange={handleBirthDateChanged} />
        <p className="text-sm">
          {t("common.location")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth value={state.location} onChange={handleLocationChanged} />
        <p className="text-sm">
          {t("common.industry")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth value={state.industry} onChange={handleIndustryChanged} />
        <p className="text-sm">
          {t("common.occupation")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth value={state.occupation} onChange={handleOccupationChanged} />
        <p className="text-sm">
          {t("common.university")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth value={state.university} onChange={handleUniversityChanged} />
        <p className="text-sm">
          {t("common.description")}
          <span className="ml-1 text-sm text-gray-400">({t("setting.account-section.email-note")})</span>
        </p>
        <Textarea className="w-full" size="md" minRows={2} maxRows={4} value={state.description} onChange={handleDescriptionChanged} />
      </div>
      <div className="flex flex-row items-center justify-end w-full pt-4 space-x-2">
        <Button onClick={handleCloseBtnClick}>{t("common.cancel")}</Button>
        <Button color="primary" onClick={handleSaveBtnClick}>
          {t("common.save")}
        </Button>
      </div>
    </>
  );
};

function showUpdateAccountDialog() {
  generateDialog(
    {
      className: "update-account-dialog",
      dialogName: "update-account-dialog",
    },
    UpdateAccountDialog,
  );
}

export default showUpdateAccountDialog;
