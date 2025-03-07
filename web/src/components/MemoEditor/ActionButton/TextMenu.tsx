import { Popper } from "@mui/base/Popper";
import { Dropdown, Menu, MenuButton, MenuItem, Link, styled, MenuList } from "@mui/joy";
import { Button } from "@usememos/mui";
import {
  Bold,
  CaseSensitive,
  CheckSquareIcon,
  Code2Icon,
  Highlighter,
  Italic,
  SquareSlashIcon,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslate } from "@/utils/i18n";
import { EditorRefActions } from "../Editor";

interface Props {
  editorRef: React.RefObject<EditorRefActions>;
}

const Popup = styled(Popper)({
  zIndex: 1000,
});

const TextMenu = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const modifiers = [
    {
      name: "offset",
      options: {
        offset: [0, 10],
      },
    },
  ];
  const isOnMenu = useRef(false);
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
      editorRef.current.insertText("", "```\n", "\n```");
    } else {
      // 否则，函数在当前位置之前插入一个换行符，然后插入一个空的代码块
      editorRef.current.insertText("", "\n```\n", "\n```");
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

  const handleBoldClick = () => {
    if (!editorRef.current) {
      return;
    }

    // 获取当前选中的文本和光标位置
    const selectedText = editorRef.current.getSelectedContent();

    if (!selectedText) {
      // 如果没有选中的文本，则不进行任何操作
      return;
    }

    // 为选中的文本添加加粗 Markdown 语法
    const boldedText = `**${selectedText}**`;

    // 更新编辑器内容
    editorRef.current.setSelectedContent(boldedText);

    // setTimeout(() => {
    //   // 插入操作完成后，编辑器会滚动到光标位置并聚焦
    //   editorRef.current?.scrollToCursor();
    //   editorRef.current?.focus();
    // });
  };

  const handleMenuClick = (option: number) => {
    if (!editorRef.current) {
      return;
    }

    // 获取当前选中的文本和光标位置
    const selectedText = editorRef.current.getSelectedContent();

    if (!selectedText) {
      // 如果没有选中的文本，则不进行任何操作
      return;
    }

    let newText: string;
    // 根据 option 的值决定新文本的内容
    switch (option) {
      case 1:
        newText = `**${selectedText}**`; // 加粗
        break;
      case 2:
        newText = `*${selectedText}*`; // 斜体
        break;
      case 3:
        newText = `~~${selectedText}~~`; // 删除
        break;
      case 4:
        newText = `==${selectedText}==`; // 高亮
        break;
      default:
        // 如果 option 不匹配任何 case，可以选择返回一个默认值或进行其他操作
        newText = selectedText; // 例如，不做任何修改
        break;
    }

    // 更新编辑器内容
    editorRef.current.setSelectedContent(newText);
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
        <CaseSensitive className="w-5 h-5 mx-auto" />
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
        <MenuList
          className="text-sm"
          size="sm"
          variant="outlined"
          sx={{
            "--List-padding": "0.5rem",
            "--ListItemDecorator-size": "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 2rem)",
            gap: 1,
            boxShadow: "md",
          }}
        >
          <MenuItem onClick={() => handleMenuClick(4)}>
            <Highlighter className="w-4 h-auto" />
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick(1)}>
            <Bold className="w-4 h-auto" />
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick(2)}>
            <Italic className="w-4 h-auto" />
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick(3)}>
            <Strikethrough className="w-4 h-auto" />
          </MenuItem>
        </MenuList>
      </Popup>
      {/* <Dropdown>
        <MenuButton slots={{ root: "div" }}>
          <Button size="sm" variant="plain" className={isMenuOpen ? "bg-gray-200 dark:bg-gray-600" : ""}>
            <CaseSensitive className="w-5 h-5 mx-auto" />
          </Button>
        </MenuButton>
        <Menu
          className="text-sm"
          size="sm"
          placement="bottom"
          sx={{
            "--List-padding": "0.5rem",
            "--ListItemDecorator-size": "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 2rem)",
            gap: 1,
          }}
        >
          <MenuItem onClick={() => handleMenuClick(4)}>
            <Highlighter className="w-4 h-auto" />
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick(1)}>
            <Bold className="w-4 h-auto" />
          </MenuItem> */}
      {/* <MenuItem onClick={() => handleMenuClick(5)}>
          <Underline className="w-4 h-auto" />
        </MenuItem> */}
      {/* <MenuItem onClick={() => handleMenuClick(2)}>
            <Italic className="w-4 h-auto" />
          </MenuItem>
          <MenuItem onClick={() => handleMenuClick(3)}>
            <Strikethrough className="w-4 h-auto" />
          </MenuItem>
        </Menu>
      </Dropdown> */}
    </>
  );
};

export default TextMenu;
