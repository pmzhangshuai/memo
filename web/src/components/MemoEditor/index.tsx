import { Select, Option, Divider } from "@mui/joy";
import { Button } from "@usememos/mui";
import type { Locale } from "date-fns";
import zhCN from "date-fns/locale/zh-CN";
import { isEqual, uniqBy } from "lodash-es";
import { HashIcon, List, ListOrdered, LoaderIcon, Quote, SendIcon } from "lucide-react";
import { observer } from "mobx-react-lite";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { memoServiceClient } from "@/grpcweb";
import { TAB_SPACE_WIDTH } from "@/helpers/consts";
import { isValidUrl } from "@/helpers/utils";
import useAsyncEffect from "@/hooks/useAsyncEffect";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useMemoStore, useResourceStore, useWorkspaceSettingStore } from "@/store/v1";
import { userStore } from "@/store/v2";
import { MemoRelation, MemoRelation_Memo, MemoRelation_Type } from "@/types/proto/api/v1/memo_relation_service";
import { Location, Memo, Visibility } from "@/types/proto/api/v1/memo_service";
import { Resource } from "@/types/proto/api/v1/resource_service";
import { UserSetting } from "@/types/proto/api/v1/user_service";
import { WorkspaceMemoRelatedSetting } from "@/types/proto/api/v1/workspace_setting_service";
import { WorkspaceSettingKey } from "@/types/proto/store/workspace_setting";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import { convertVisibilityFromString, convertVisibilityToString } from "@/utils/memo";
import VisibilityIcon from "../VisibilityIcon";
import AddMemoRelationPopover from "./ActionButton/AddMemoRelationPopover";
import LocationSelector from "./ActionButton/LocationSelector";
import MarkdownMenu from "./ActionButton/MarkdownMenu";
import TextMenu from "./ActionButton/TextMenu";
import UploadResourceButton from "./ActionButton/UploadResourceButton";
import Editor, { EditorRefActions } from "./Editor";
import RelationListView from "./RelationListView";
import ResourceListView from "./ResourceListView";
import { handleEditorKeydownWithMarkdownShortcuts, hyperlinkHighlightedText } from "./handlers";
import { MemoEditorContext } from "./types";

export interface Props {
  className?: string;
  cacheKey?: string;
  placeholder?: string;
  // The name of the memo to be edited.
  memoName?: string;
  // The name of the parent memo if the memo is a comment.
  parentMemoName?: string;
  action?: string;
  relatedMemoName?: string;
  autoFocus?: boolean;
  onConfirm?: (memoName: string) => void;
  onCancel?: () => void;
}

interface State {
  memoVisibility: Visibility;
  resourceList: Resource[];
  relationList: MemoRelation[];
  location: Location | undefined;
  isUploadingResource: boolean;
  isRequesting: boolean;
  isComposing: boolean;
}

const MemoEditor = observer((props: Props): JSX.Element => {
  const { className, cacheKey, memoName, action, relatedMemoName, parentMemoName, autoFocus, onConfirm, onCancel } = props;
  const t = useTranslate();
  const { i18n } = useTranslation();
  const workspaceSettingStore = useWorkspaceSettingStore();
  const memoStore = useMemoStore();
  const resourceStore = useResourceStore();
  const currentUser = useCurrentUser();
  const [state, setState] = useState<State>({
    memoVisibility: Visibility.PRIVATE,
    resourceList: [],
    relationList: [],
    location: undefined,
    isUploadingResource: false,
    isRequesting: false,
    isComposing: false,
  });
  const [displayTime, setDisplayTime] = useState<Date | undefined>();
  const [hasContent, setHasContent] = useState<boolean>(false);
  const editorRef = useRef<EditorRefActions>(null);
  const userSetting = userStore.state.userSetting as UserSetting;
  const contentCacheKey = `${currentUser.name}-${cacheKey || ""}`;
  const [contentCache, setContentCache] = useLocalStorage<string>(contentCacheKey, "");
  const referenceRelations = memoName
    ? state.relationList.filter(
        (relation) =>
          relation.memo?.name === memoName && relation.relatedMemo?.name !== memoName && relation.type === MemoRelation_Type.REFERENCE,
      )
    : state.relationList.filter((relation) => relation.type === MemoRelation_Type.REFERENCE);
  const workspaceMemoRelatedSetting =
    workspaceSettingStore.getWorkspaceSettingByKey(WorkspaceSettingKey.MEMO_RELATED)?.memoRelatedSetting ||
    WorkspaceMemoRelatedSetting.fromPartial({});

  useEffect(() => {
    editorRef.current?.setContent(contentCache || "");
  }, []);

  useEffect(() => {
    if (autoFocus) {
      handleEditorFocus();
    }
  }, [autoFocus]);

  useEffect(() => {
    let visibility = userSetting.memoVisibility;
    if (workspaceMemoRelatedSetting.disallowPublicVisibility && visibility === "PUBLIC") {
      visibility = "PRIVATE";
    }
    setState((prevState) => ({
      ...prevState,
      memoVisibility: convertVisibilityFromString(visibility),
    }));
  }, [userSetting.memoVisibility, workspaceMemoRelatedSetting.disallowPublicVisibility]);

  useAsyncEffect(async () => {
    if (!memoName || action) {
      return;
    }

    const memo = await memoStore.getOrFetchMemoByName(memoName);
    if (memo) {
      handleEditorFocus();
      setDisplayTime(memo.displayTime);
      setState((prevState) => ({
        ...prevState,
        memoVisibility: memo.visibility,
        resourceList: memo.resources,
        relationList: memo.relations,
        location: memo.location,
      }));
      if (!contentCache) {
        editorRef.current?.setContent(memo.content ?? "");
      }
    }
  }, [memoName, action]);

  const handleCompositionStart = () => {
    setState((prevState) => ({
      ...prevState,
      isComposing: true,
    }));
  };

  const handleCompositionEnd = () => {
    setState((prevState) => ({
      ...prevState,
      isComposing: false,
    }));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editorRef.current) {
      return;
    }

    const isMetaKey = event.ctrlKey || event.metaKey;
    if (isMetaKey) {
      if (event.key === "Enter") {
        void handleSaveBtnClick();
        return;
      }
      if (!workspaceMemoRelatedSetting.disableMarkdownShortcuts) {
        handleEditorKeydownWithMarkdownShortcuts(event, editorRef.current);
      }
    }
    if (event.key === "Tab" && !state.isComposing) {
      event.preventDefault();
      const tabSpace = " ".repeat(TAB_SPACE_WIDTH);
      const cursorPosition = editorRef.current.getCursorPosition();
      const selectedContent = editorRef.current.getSelectedContent();
      editorRef.current.insertText(tabSpace);
      if (selectedContent) {
        editorRef.current.setCursorPosition(cursorPosition + TAB_SPACE_WIDTH);
      }
      return;
    }
  };

  const handleMemoVisibilityChange = (visibility: Visibility) => {
    setState((prevState) => ({
      ...prevState,
      memoVisibility: visibility,
    }));
    // 检查是否选择私密，并且编辑器内容中不包含“#私密”
    if (visibility === Visibility.PRIVATE && !editorRef.current?.getContent().includes("#私密")) {
      // 自动在编辑器中输入“#私密”
      editorRef.current?.insertText("#私密 ");
      // 确保光标在插入文本之后
      setTimeout(() => {
        editorRef.current?.scrollToCursor();
        editorRef.current?.focus();
      });
    }
  };

  const handleSetResourceList = (resourceList: Resource[]) => {
    setState((prevState) => ({
      ...prevState,
      resourceList,
    }));
  };

  const handleSetRelationList = (relationList: MemoRelation[]) => {
    setState((prevState) => ({
      ...prevState,
      relationList,
    }));
  };

  useEffect(() => {
    if (action === "forward" && relatedMemoName) {
      // console.log("forward:", relatedMemoName);
      if (!editorRef.current) {
        toast.error(t("message.failed-to-embed-memo"));
      } else {
        const cursorPosition = editorRef.current.getCursorPosition();
        const prevValue = editorRef.current.getContent().slice(0, cursorPosition);
        if (prevValue !== "" && !prevValue.endsWith("\n")) {
          editorRef.current.insertText("\n");
        }
        editorRef.current.insertText(`\n![[${relatedMemoName}]]`);
        editorRef.current.setCursorPosition(0);
        setTimeout(() => {
          editorRef.current?.scrollToCursor();
          editorRef.current?.focus();
        });
      }
    } else if (action === "mark" && relatedMemoName) {
      // console.log("mark:", relatedMemoName);
      const newRelation = {
        memo: MemoRelation_Memo.fromPartial({ name: memoName }),
        relatedMemo: MemoRelation_Memo.fromPartial({ name: relatedMemoName }),
        type: MemoRelation_Type.REFERENCE,
      };
      // 使用filter检查是否存在相同的relatedMemo
      const existingRelation = state.relationList.find((relation) => relation.relatedMemo?.name === relatedMemoName);
      if (!existingRelation) {
        // 如果不存在，则添加到列表中，并确保没有重复的relatedMemo
        setState((prevState) => ({
          ...prevState,
          relationList: uniqBy([...prevState.relationList, newRelation], (relation) => relation.relatedMemo?.name),
        }));
      }
      setTimeout(() => {
        editorRef.current?.scrollToCursor();
        editorRef.current?.focus();
      });
    }
  }, [action, relatedMemoName]);
  // useEffect(() => {
  //   console.log("Updated relationList:", state.relationList);
  //   console.log("referenceRelations:", referenceRelations);
  // }, [state.relationList]);

  const handleUploadResource = async (file: File) => {
    setState((state) => {
      return {
        ...state,
        isUploadingResource: true,
      };
    });

    const { name: filename, size, type } = file;
    const buffer = new Uint8Array(await file.arrayBuffer());

    try {
      const resource = await resourceStore.createResource({
        resource: Resource.fromPartial({
          filename,
          size,
          type,
          content: buffer,
        }),
      });
      setState((state) => {
        return {
          ...state,
          isUploadingResource: false,
        };
      });
      return resource;
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }
  };

  const uploadMultiFiles = async (files: FileList) => {
    const uploadedResourceList: Resource[] = [];
    for (const file of files) {
      const resource = await handleUploadResource(file);
      if (resource) {
        uploadedResourceList.push(resource);
        if (memoName) {
          await resourceStore.updateResource({
            resource: Resource.fromPartial({
              name: resource.name,
              memo: memoName,
            }),
            updateMask: ["memo"],
          });
        }
      }
    }
    if (uploadedResourceList.length > 0) {
      setState((prevState) => ({
        ...prevState,
        resourceList: [...prevState.resourceList, ...uploadedResourceList],
      }));
    }
  };

  const handleDropEvent = async (event: React.DragEvent) => {
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      await uploadMultiFiles(event.dataTransfer.files);
    }
  };

  const handlePasteEvent = async (event: React.ClipboardEvent) => {
    if (event.clipboardData && event.clipboardData.files.length > 0) {
      event.preventDefault();
      await uploadMultiFiles(event.clipboardData.files);
    } else if (
      editorRef.current != null &&
      editorRef.current.getSelectedContent().length != 0 &&
      isValidUrl(event.clipboardData.getData("Text"))
    ) {
      event.preventDefault();
      hyperlinkHighlightedText(editorRef.current, event.clipboardData.getData("Text"));
    }
  };

  const handleContentChange = (content: string) => {
    setHasContent(content !== "");
    if (cacheKey && content !== "") {
      setContentCache(content);
    } else {
      localStorage.removeItem(contentCacheKey);
    }
    // 检查编辑器内容中是否包含“#私密”
    if (content.includes("#私密")) {
      // 如果包含，则自动将选择框的选项设置为“私密”
      setState((prevState) => ({
        ...prevState,
        memoVisibility: Visibility.PRIVATE,
      }));
    } else if (content.includes("#公开")) {
      setState((prevState) => ({
        ...prevState,
        memoVisibility: Visibility.PUBLIC,
      }));
    }
  };

  const handleSaveBtnClick = async () => {
    if (state.isRequesting) {
      return;
    }

    setState((state) => {
      return {
        ...state,
        isRequesting: true,
      };
    });
    const content = editorRef.current?.getContent() ?? "";
    try {
      // Update memo.
      if (memoName) {
        const prevMemo = await memoStore.getOrFetchMemoByName(memoName);
        if (prevMemo) {
          const updateMask = new Set<string>();
          const memoPatch: Partial<Memo> = {
            name: prevMemo.name,
            content,
          };
          if (!isEqual(content, prevMemo.content)) {
            updateMask.add("content");
            memoPatch.content = content;
          }
          if (!isEqual(state.memoVisibility, prevMemo.visibility)) {
            updateMask.add("visibility");
            memoPatch.visibility = state.memoVisibility;
          }
          if (!isEqual(state.resourceList, prevMemo.resources)) {
            updateMask.add("resources");
            memoPatch.resources = state.resourceList;
          }
          if (!isEqual(state.relationList, prevMemo.relations)) {
            updateMask.add("relations");
            memoPatch.relations = state.relationList;
          }
          if (!isEqual(state.location, prevMemo.location)) {
            updateMask.add("location");
            memoPatch.location = state.location;
          }
          if (["content", "resources", "relations", "location"].some((key) => updateMask.has(key))) {
            updateMask.add("update_time");
          }
          if (!isEqual(displayTime, prevMemo.displayTime)) {
            updateMask.add("display_time");
            memoPatch.displayTime = displayTime;
          }
          if (updateMask.size === 0) {
            toast.error("No changes detected");
            if (onCancel) {
              onCancel();
            }
            return;
          }
          const memo = await memoStore.updateMemo(memoPatch, Array.from(updateMask));
          if (onConfirm) {
            onConfirm(memo.name);
          }
        }
      } else {
        // Create memo or memo comment.
        const request = !parentMemoName
          ? memoStore.createMemo({
              memo: Memo.fromPartial({
                content,
                visibility: state.memoVisibility,
                resources: state.resourceList,
                relations: state.relationList,
                location: state.location,
              }),
            })
          : memoServiceClient
              .createMemoComment({
                name: parentMemoName,
                comment: {
                  content,
                  visibility: state.memoVisibility,
                  resources: state.resourceList,
                  relations: state.relationList,
                  location: state.location,
                },
              })
              .then((memo) => memo);
        const memo = await request;
        if (onConfirm) {
          onConfirm(memo.name);
        }
      }
      editorRef.current?.setContent("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }

    localStorage.removeItem(contentCacheKey);
    setState((state) => {
      return {
        ...state,
        isRequesting: false,
        resourceList: [],
        relationList: [],
        location: undefined,
      };
    });
  };

  const handleCancelBtnClick = () => {
    localStorage.removeItem(contentCacheKey);

    if (onCancel) {
      onCancel();
    }
  };

  const handleEditorFocus = () => {
    editorRef.current?.focus();
  };

  const handleTagClick = () => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.insertText("#");
    // 手动触发input
    const inputEvent = new Event("input", { bubbles: true });
    editorRef.current.getEditor()?.dispatchEvent(inputEvent);
  };

  const handleListClick = () => {
    if (!editorRef.current) {
      return;
    }

    // 获取当前光标位置
    const currentPosition = editorRef.current.getCursorPosition();
    const currentLineNumber = editorRef.current.getCursorLineNumber();
    const currentLine = editorRef.current.getLine(currentLineNumber);

    // 检查当前行是否已经是列表项，如果不是则添加
    let newLine = "";
    let cursorChange = 0;
    if (!/^- /.test(currentLine)) {
      newLine = "- " + currentLine;
      cursorChange = 2; // 光标移动到列表标记之后
    } else {
      // 如果已经是列表项，可以选择移除列表标记或不做任何操作
      // 这里我们简单地不做任何操作
      return;
    }

    // 更新当前行内容
    editorRef.current.setLine(currentLineNumber, newLine);

    // 设置光标位置
    editorRef.current.setCursorPosition(currentPosition + cursorChange);

    // 确保光标可见并聚焦
    setTimeout(() => {
      editorRef.current?.scrollToCursor();
      editorRef.current?.focus();
    });
  };

  const handleListOrderedClick = () => {
    if (!editorRef.current) {
      return;
    }

    // 获取当前光标位置
    const currentPosition = editorRef.current.getCursorPosition();
    const currentLineNumber = editorRef.current.getCursorLineNumber();
    const currentLine = editorRef.current.getLine(currentLineNumber);

    // 检查当前行是否已经是有序列表项
    let newLine = "";
    let cursorChange = 0;
    const lastOrderedLineIndex = editorRef.current
      .getContent()
      .split("\n")
      .slice(0, currentLineNumber)
      .reverse()
      .findIndex((line) => /^\d+\. /.test(line));
    const nextOrderNumber =
      lastOrderedLineIndex !== -1
        ? parseInt(editorRef.current.getLine(currentLineNumber - lastOrderedLineIndex - 1).match(/^\d+/)?.[0] ?? "1", 10) + 1
        : 1;

    if (!/^\d+\. /.test(currentLine)) {
      newLine = `${nextOrderNumber}. ` + currentLine;
      cursorChange = `${nextOrderNumber}. `.length; // 光标移动到列表标记之后
    } else {
      // 如果已经是有序列表项，可以选择更新序号或不做任何操作
      // 这里我们简单地不做任何操作
      return;
    }

    // 更新当前行内容
    editorRef.current.setLine(currentLineNumber, newLine);

    // 设置光标位置
    editorRef.current.setCursorPosition(currentPosition + cursorChange);

    // 确保光标可见并聚焦
    setTimeout(() => {
      editorRef.current?.scrollToCursor();
      editorRef.current?.focus();
    });
  };

  // const handleCheckboxClick = () => {
  //   if (!editorRef.current) {
  //     return;
  //   }

  //   const currentPosition = editorRef.current.getCursorPosition();
  //   const currentLineNumber = editorRef.current.getCursorLineNumber();
  //   const currentLine = editorRef.current.getLine(currentLineNumber);
  //   let newLine = "";
  //   let cursorChange = 0;
  //   if (/^- \[( |x|X)\] /.test(currentLine)) {
  //     newLine = currentLine.replace(/^- \[( |x|X)\] /, "");
  //     cursorChange = -6;
  //   } else if (/^\d+\. |- /.test(currentLine)) {
  //     const match = currentLine.match(/^\d+\. |- /) ?? [""];
  //     newLine = currentLine.replace(/^\d+\. |- /, "- [ ] ");
  //     cursorChange = -match[0].length + 6;
  //   } else {
  //     newLine = "- [ ] " + currentLine;
  //     cursorChange = 6;
  //   }
  //   editorRef.current.setLine(currentLineNumber, newLine);
  //   editorRef.current.setCursorPosition(currentPosition + cursorChange);
  //   setTimeout(() => {
  //     editorRef.current?.scrollToCursor();
  //     editorRef.current?.focus();
  //   });
  // };

  const handleQuoteClick = () => {
    if (!editorRef.current) {
      return;
    }

    // 获取当前选中的文本和光标位置
    const selectedText = editorRef.current.getSelectedContent();

    if (!selectedText) {
      // 如果没有选中的文本，则不进行任何操作
      return;
    }

    // 为选中的文本添加 Markdown 语法
    const newText = `\n> ${selectedText}\n`;

    // 更新编辑器内容
    editorRef.current.setSelectedContent(newText);
  };

  // const handleCodeBlockClick = () => {
  //   if (!editorRef.current) {
  //     return;
  //   }
  //   // 获取当前光标的位置
  //   const cursorPosition = editorRef.current.getCursorPosition();
  //   // 获取光标位置之前的内容
  //   const prevValue = editorRef.current.getContent().slice(0, cursorPosition);
  //   // 如果前文内容为空（prevValue === ""）或以前文内容以换行符结尾（prevValue.endsWith("\n")），则在当前位置直接插入一个空的代码块
  //   if (prevValue === "" || prevValue.endsWith("\n")) {
  //     editorRef.current.insertText("", "```\n", "\n```");
  //   } else {
  //     // 否则，函数在当前位置之前插入一个换行符，然后插入一个空的代码块
  //     editorRef.current.insertText("", "\n```\n", "\n```");
  //   }
  //   setTimeout(() => {
  //     // 插入操作完成后，编辑器会滚动到光标位置并聚焦
  //     editorRef.current?.scrollToCursor();
  //     editorRef.current?.focus();
  //   });
  // };

  // const [menuStatus, setMenuStatus] = useState(false);
  // const isOnButton = React.useRef(false);
  // const internalOpen = React.useRef(open);

  // const buttonRef = React.useRef<HTMLButtonElement>(null);
  // const [open, setOpen] = React.useState(false);
  // const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  // const open = Boolean(anchorEl);
  // const id = open ? "simple-popper" : undefined;
  // const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  //   setAnchorEl(anchorEl ? null : event.currentTarget);
  // };

  const editorConfig = useMemo(
    () => ({
      className: "",
      initialContent: "",
      placeholder: props.placeholder ?? t("editor.any-thoughts"),
      onContentChange: handleContentChange,
      onPaste: handlePasteEvent,
    }),
    [i18n.language],
  );

  const allowSave = (hasContent || state.resourceList.length > 0) && !state.isUploadingResource && !state.isRequesting;

  registerLocale("zh-Hans", zhCN as unknown as Locale);

  return (
    <MemoEditorContext.Provider
      value={{
        resourceList: state.resourceList,
        relationList: state.relationList,
        setResourceList: (resourceList: Resource[]) => {
          setState((prevState) => ({
            ...prevState,
            resourceList,
          }));
        },
        setRelationList: (relationList: MemoRelation[]) => {
          setState((prevState) => ({
            ...prevState,
            relationList,
          }));
        },
        memoName,
      }}
    >
      <div
        className={`${
          className ?? ""
        } relative w-full flex flex-col justify-start items-start bg-white dark:bg-zinc-800 px-4 pt-4 rounded-lg border border-gray-200 hover:border-primary dark:border-zinc-700 dark:hover:border-primary-darker`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onDrop={handleDropEvent}
        onFocus={handleEditorFocus}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      >
        {memoName && displayTime && (
          <DatePicker
            selected={displayTime}
            onChange={(date) => date && setDisplayTime(date)}
            showTimeSelect
            showMonthDropdown
            showYearDropdown
            yearDropdownItemNumber={5}
            dateFormatCalendar=" "
            locale={i18n.language}
            customInput={<span className="text-sm text-gray-400 cursor-pointer dark:text-gray-500">{displayTime.toLocaleString()}</span>}
            calendarClassName="ml-24 sm:ml-44"
          />
        )}
        <Editor ref={editorRef} {...editorConfig} />
        <ResourceListView resourceList={state.resourceList} setResourceList={handleSetResourceList} />
        <RelationListView relationList={referenceRelations} setRelationList={handleSetRelationList} />
        <Divider className="!mt-2 opacity-40" />
        <div className="flex flex-row items-center justify-between w-full gap-2 py-3 dark:border-t-zinc-500">
          <div className="relative flex flex-row items-center justify-start mr-4 overflow-auto" onFocus={(e) => e.stopPropagation()}>
            <div className="flex flex-row items-center justify-start -space-x-1 opacity-80 dark:opacity-60">
              <Select
                className="!text-sm"
                variant="plain"
                size="sm"
                value={state.memoVisibility}
                startDecorator={<VisibilityIcon visibility={state.memoVisibility} />}
                onChange={(_, visibility) => {
                  if (visibility) {
                    handleMemoVisibilityChange(visibility);
                  }
                }}
              >
                {/* [Visibility.PRIVATE, Visibility.PROTECTED, Visibility.PUBLIC] */}
                {[Visibility.PUBLIC, Visibility.PRIVATE].map((item) => (
                  <Option key={item} value={item} className="whitespace-nowrap !text-sm">
                    {t(`memo.visibility.${convertVisibilityToString(item).toLowerCase()}` as any)}
                  </Option>
                ))}
              </Select>
              <div title={t("common.tags")}>
                <Button size="sm" variant="plain" className="hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleTagClick}>
                  <HashIcon className="w-5 h-5 mx-auto" />
                </Button>
                {/* <TagSelector editorRef={editorRef} /> */}
              </div>
              <TextMenu editorRef={editorRef} />
              <Button size="sm" variant="plain" className="hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleListClick}>
                <List className="w-5 h-5 mx-auto" />
              </Button>
              <Button size="sm" variant="plain" className="hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleListOrderedClick}>
                <ListOrdered className="w-5 h-5 mx-auto" />
              </Button>
              <div title={t("common.quote")}>
                <Button size="sm" variant="plain" className="hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleQuoteClick}>
                  <Quote className="w-5 h-5 mx-auto" />
                </Button>
              </div>
              <UploadResourceButton editorRef={editorRef} />
              <AddMemoRelationPopover editorRef={editorRef} />
              <MarkdownMenu editorRef={editorRef} />
              {/* <Dropdown>
                  <MenuButton slots={{ root: "div" }}>
                    <Button size="sm" variant="plain">
                      <MoreVerticalIcon className="w-5 h-5 mx-auto" />
                    </Button>
                  </MenuButton>
                  <Menu className="text-sm" size="sm" placement="bottom-start">
                    <MenuItem onClick={handleCodeBlockClick}>
                      <Code2Icon className="w-4 h-auto" />
                      <span>{t("markdown.code-block")}</span>
                    </MenuItem>
                    <MenuItem onClick={handleCheckboxClick}>
                      <CheckSquareIcon className="w-4 h-auto" />
                      <span>{t("markdown.checkbox")}</span>
                    </MenuItem>
                  </Menu>
                </Dropdown> */}
              {workspaceMemoRelatedSetting.enableLocation && (
                <LocationSelector
                  location={state.location}
                  onChange={(location) =>
                    setState((prevState) => ({
                      ...prevState,
                      location,
                    }))
                  }
                />
              )}
            </div>
          </div>
          <div className="flex flex-row items-center justify-end gap-2 shrink-0">
            {props.onCancel && (
              <Button size="sm" variant="plain" disabled={state.isRequesting} onClick={handleCancelBtnClick}>
                {t("common.cancel")}
              </Button>
            )}
            <Button size="sm" color="primary" disabled={!allowSave || state.isRequesting} onClick={handleSaveBtnClick}>
              {!state.isRequesting ? <SendIcon className="w-4 h-auto mx-1" /> : <LoaderIcon className="w-4 h-auto mx-1 animate-spin" />}
            </Button>
          </div>
        </div>
      </div>
    </MemoEditorContext.Provider>
  );
});

export default MemoEditor;
