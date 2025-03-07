import { Popper } from "@mui/base/Popper";
import { Dropdown, Menu, MenuButton, MenuItem, Link, IconButton, styled, MenuList } from "@mui/joy";
import { menuClasses } from "@mui/joy/Menu";
import { Button } from "@usememos/mui";
import { CheckSquareIcon, Code2Icon, MoreVerticalIcon, SquareSlashIcon } from "lucide-react";
import React from "react";
import { cn } from "@/utils";
import { useTranslate } from "@/utils/i18n";
import { EditorRefActions } from "../Editor";

interface Props {
  editorRef: React.RefObject<EditorRefActions>;
}

const Popup = styled(Popper)({
  zIndex: 1000,
});

const MarkdownMenu = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const modifiers = [
    {
      name: "offset",
      options: {
        offset: [0, 10],
      },
    },
  ];
  const isOnMenu = React.useRef(false);
  const createHandleLeaveButton = () => {
    setTimeout(() => {
      if (!isOnMenu.current) {
        setIsMenuOpen(false);
      }
    }, 200);
  };

  const t = useTranslate();

  const { editorRef } = props;
  const handleCodeBlockClick = () => {
    if (!editorRef.current) {
      return;
    }
    // 获取当前光标的位置
    const cursorPosition = editorRef.current.getCursorPosition();
    // 获取光标位置之前的内容
    const prevValue = editorRef.current.getContent().slice(0, cursorPosition);
    // 如果前文内容为空（prevValue === ""）或以前文内容以换行符结尾（prevValue.endsWith("\n")），则在当前位置直接插入一个空的代码块
    if (prevValue === "" || prevValue.endsWith("\n")) {
      editorRef.current.insertText("", "```javascript\n", "\n```");
    } else {
      // 否则，函数在当前位置之前插入一个换行符，然后插入一个空的代码块
      editorRef.current.insertText("", "\n```javascript\n", "\n```");
    }
    setTimeout(() => {
      // 插入操作完成后，编辑器会滚动到光标位置并聚焦
      editorRef.current?.scrollToCursor();
      editorRef.current?.focus();
    });
  };
  const handleCheckboxClick = () => {
    if (!editorRef.current) {
      return;
    }

    const currentPosition = editorRef.current.getCursorPosition();
    const currentLineNumber = editorRef.current.getCursorLineNumber();
    const currentLine = editorRef.current.getLine(currentLineNumber);
    let newLine = "";
    let cursorChange = 0;
    if (/^- \[( |x|X)\] /.test(currentLine)) {
      newLine = currentLine.replace(/^- \[( |x|X)\] /, "");
      cursorChange = -6;
    } else if (/^\d+\. |- /.test(currentLine)) {
      const match = currentLine.match(/^\d+\. |- /) ?? [""];
      newLine = currentLine.replace(/^\d+\. |- /, "- [ ] ");
      cursorChange = -match[0].length + 6;
    } else {
      newLine = "- [ ] " + currentLine;
      cursorChange = 6;
    }
    editorRef.current.setLine(currentLineNumber, newLine);
    editorRef.current.setCursorPosition(currentPosition + cursorChange);
    setTimeout(() => {
      editorRef.current?.scrollToCursor();
      editorRef.current?.focus();
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="plain"
        className={isMenuOpen ? "bg-gray-200 dark:bg-gray-600" : ""}
        onMouseEnter={(event) => {
          setAnchorEl(event.currentTarget);
          setIsMenuOpen(true);
        }}
        onMouseLeave={() => {
          createHandleLeaveButton();
        }}
      >
        <MoreVerticalIcon className="w-5 h-5 mx-auto" />
      </Button>
      <Popup
        open={isMenuOpen}
        anchorEl={anchorEl}
        onMouseEnter={() => {
          isOnMenu.current = true;
        }}
        onMouseLeave={() => {
          setIsMenuOpen(false);
          isOnMenu.current = false;
        }}
        placement="bottom"
        modifiers={modifiers}
      >
        <MenuList className="text-sm" size="sm" variant="outlined" sx={{ boxShadow: "md" }}>
          <MenuItem onClick={handleCodeBlockClick}>
            <Code2Icon className="w-4 h-auto" />
            <span>{t("markdown.code-block")}</span>
          </MenuItem>
          <MenuItem onClick={handleCheckboxClick}>
            <CheckSquareIcon className="w-4 h-auto" />
            <span>{t("markdown.checkbox")}</span>
          </MenuItem>
        </MenuList>
      </Popup>
      {/* <Dropdown
        open={isMenuOpen}
        onOpenChange={(_, isOpen) => {
          if (isOpen) {
            setIsMenuOpen(true);
          }
        }}
      >
        <MenuButton
          slots={{ root: IconButton }}
          slotProps={{ root: { variant: "plain", color: "neutral" } }}
          onMouseEnter={() => {
            setIsMenuOpen(true);
          }}
          onMouseLeave={() => {
            createHandleLeaveButton();
          }}
          sx={[
            {
              "&:focus-visible": {
                bgcolor: "neutral.plainHoverBg",
              },
            },
            isMenuOpen ? { bgcolor: "neutral.plainHoverBg" } : { bgcolor: null },
          ]}
        >
          <MoreVerticalIcon className="w-5 h-5 mx-auto" />
        </MenuButton>
        <Menu
          onMouseEnter={() => {
            isOnMenu.current = true;
          }}
          onMouseLeave={() => {
            setIsMenuOpen(false);
            isOnMenu.current = false;
          }}
          onClose={() => setIsMenuOpen(false)}
          placement="bottom-start"
          modifiers={modifiers}
          className="text-sm"
          size="sm"
          sx={{
            [`& .${menuClasses.listbox}`]: {
              "--List-padding": "var(--ListDivider-gap)",
            },
          }}
        >
          <MenuItem onClick={handleCodeBlockClick}>
            <Code2Icon className="w-4 h-auto" />
            <span>{t("markdown.code-block")}</span>
          </MenuItem>
          <MenuItem onClick={handleCheckboxClick}>
            <CheckSquareIcon className="w-4 h-auto" />
            <span>{t("markdown.checkbox")}</span>
          </MenuItem> */}
      {/* <div className="-mt-0.5 pl-2">
          <Link fontSize={12} href="https://www.usememos.com/docs/getting-started/content-syntax" target="_blank">
            {t("markdown.content-syntax")}
          </Link>
        </div> */}
      {/* </Menu>
      </Dropdown> */}
    </>
  );
};

export default MarkdownMenu;
