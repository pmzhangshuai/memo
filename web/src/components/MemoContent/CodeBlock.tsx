import copy from "copy-to-clipboard";
import hljs from "highlight.js";
import { CopyIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { cn } from "@/utils";
import MermaidBlock from "./MermaidBlock";
import { BaseProps } from "./types";
import DOMPurify from "dompurify";

// Special languages that are rendered differently.
enum SpecialLanguage {
  HTML = "__html",
  MERMAID = "mermaid",
}

interface Props extends BaseProps {
  language: string;
  content: string;
}

const CodeBlock: React.FC<Props> = ({ language, content }: Props) => {
  const formatedLanguage = useMemo(() => (language || "").toLowerCase() || "text", [language]);

  // Users can set Markdown code blocks as `__html` to render HTML directly.
  if (formatedLanguage === SpecialLanguage.HTML) {
    // return (
    //   <div
    //     className="w-full overflow-auto !my-2"
    //     dangerouslySetInnerHTML={{
    //       __html: content,
    //     }}
    //   />
    // );
    // 使用 DOMPurify 清理 HTML 内容
    const sanitizedHtml = DOMPurify.sanitize(content);
    return (
      <div
        className="w-full overflow-auto !my-2"
        dangerouslySetInnerHTML={{
          __html: sanitizedHtml,
        }}
      />
    );
  } else if (formatedLanguage === SpecialLanguage.MERMAID) {
    return <MermaidBlock content={content} />;
  }

  const highlightedCode = useMemo(() => {
    try {
      const lang = hljs.getLanguage(formatedLanguage);
      if (lang) {
        return hljs.highlight(content, {
          language: formatedLanguage,
        }).value;
      }
    } catch (error) {
      // Skip error and use default highlighted code.
    }

    // Escape any HTML entities when rendering original content.
    return Object.assign(document.createElement("span"), {
      textContent: content,
    }).innerHTML;
  }, [formatedLanguage, content]);

  const handleCopyButtonClick = useCallback(() => {
    copy(content);
    toast.success("Copied to clipboard!");
  }, [content]);

  return (
    <div className="relative w-full my-1 border-l-4 rounded hover:shadow bg-zinc-600 border-zinc-400">
      <div className="flex flex-row items-center justify-between w-full px-2 py-1 text-zinc-400">
        <span className="font-mono text-sm">{formatedLanguage}</span>
        <CopyIcon className="w-4 h-auto cursor-pointer hover:opacity-80" onClick={handleCopyButtonClick} />
      </div>

      <div className="overflow-auto">
        <pre className={cn("no-wrap overflow-auto", "w-full p-2 bg-zinc-700 relative")}>
          <code
            className={cn(`language-${formatedLanguage}`, "block text-sm leading-5 text-zinc-400")}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          ></code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
