import { Popper } from "@mui/base/Popper";
import { MenuItem, MenuList, styled } from "@mui/joy";
import Fuse from "fuse.js";
import { t } from "i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import useClickAway from "react-use/lib/useClickAway";
import getCaretCoordinates from "textarea-caret";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useUserStatsTags } from "@/store/v1";
import { EditorRefActions } from ".";

const Popup = styled(Popper)({
  zIndex: 1000,
});

type Props = {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  editorActions: React.ForwardedRef<EditorRefActions>;
};

type Position = { left: number; top: number; height: number };

const TagSuggestions = ({ editorRef, editorActions }: Props) => {
  const { md } = useResponsiveWidth();
  const [position, setPosition] = useState<Position | null>(null);
  const [open, setOpen] = useState(false);
  const tags = Object.entries(useUserStatsTags())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const getCurrentWord = (): [word: string, startIndex: number] => {
    const editor = editorRef.current;
    if (!editor) return ["", 0];
    const cursorPos = editor.selectionEnd;
    // const before = editor.value.slice(0, cursorPos).match(/\S*$/) || { 0: "", index: cursorPos };
    // const after = editor.value.slice(cursorPos).match(/^\S*/) || { 0: "" };
    // 匹配光标位置前后的所有字符，包括空白字符
    const before = editor.value.slice(0, cursorPos).match(/.*\S*$/) || { 0: "", index: cursorPos };
    const after = editor.value.slice(cursorPos).match(/^\s*\S*/) || [""];
    const word = (before[0].match(/\S*$/) || [""])[0] + (after[0] || "");
    // 单词的起始位置是 before 匹配结果的起始位置或光标位置（如果没有匹配到非空白字符）
    const startIndex = before.index === undefined ? cursorPos : before.index + before[0].length - word.length;
    // return [before[0] + after[0], before.index ?? cursorPos];
    return [word, startIndex];
  };

  const suggestionsRef = useRef<string[]>([]);
  const hashIndex = getCurrentWord()[0].indexOf("#");
  const search = getCurrentWord()[0]
    .slice(hashIndex + 1)
    .toLowerCase();
  suggestionsRef.current =
    search === ""
      ? tags
      : (() => {
          const fuse = new Fuse(tags);
          return fuse.search(search).map((result) => result.item);
        })();

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const [word, index] = getCurrentWord();
    const isActive = word.indexOf("#") !== -1;

    // 获取光标位置
    const caretCordinates = getCaretCoordinates(editor, index);
    caretCordinates.top -= editor.scrollTop;
    // 计算光标相对于页面的绝对位置
    const absoluteCaretPosition = {
      top: caretCordinates.top + editor.getBoundingClientRect().top + (md ? caretCordinates.height : 0),
      left: caretCordinates.left + editor.getBoundingClientRect().left,
      height: caretCordinates.height + editor.getBoundingClientRect().height,
    };
    if (isActive) {
      setPosition(absoluteCaretPosition);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const listenersAreRegisteredRef = useRef(false);
  const registerListeners = () => {
    const editor = editorRef.current;
    if (!editor || listenersAreRegisteredRef.current) return;
    // editor.addEventListener("click", () => setOpen(false));
    // editor.addEventListener("blur", () => setOpen(false));
    // editor.addEventListener("keydown", handleKeyDown);
    editor.addEventListener("input", handleInput);
    listenersAreRegisteredRef.current = true;
  };
  useEffect(registerListeners, [!!editorRef.current]);

  const virtualAnchorElement = useMemo(() => {
    if (!position) return null;
    return {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        top: position.top,
        left: position.left,
        right: position.left,
        bottom: position.top,
        x: position.left, // 添加 x 属性
        y: position.top, // 添加 y 属性
        toJSON: () => {}, // 添加 toJSON 方法
      }),
    };
  }, [position]);

  const containerRef = useRef<HTMLUListElement>(null);
  useClickAway(containerRef, () => {
    setOpen(false);
  });

  const autocomplete = (tag: string) => {
    if (!editorActions || !("current" in editorActions) || !editorActions.current) return;
    const [word, index] = getCurrentWord();
    const hashIndex = word.indexOf("#");
    const removeLength = word.length - hashIndex;
    editorActions.current.removeText(index + hashIndex, removeLength);
    editorActions.current.insertText(`#${tag} `);
    setOpen(false);
    setTimeout(() => {
      editorRef.current?.focus();
    });
  };

  return (
    <Popup open={open} anchorEl={virtualAnchorElement} placement={md ? "bottom-start" : "top-start"} disablePortal>
      <MenuList ref={containerRef} variant="outlined" sx={{ boxShadow: "md" }}>
        {suggestionsRef.current.length > 0 ? (
          suggestionsRef.current.map((tag, i) => (
            <MenuItem key={tag} onClick={() => autocomplete(tag)}>
              #{tag}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <span className="text-sm leading-5"></span>
            {t("common.no-tag-found")}
          </MenuItem>
        )}
      </MenuList>
    </Popup>
  );
};

export default TagSuggestions;
