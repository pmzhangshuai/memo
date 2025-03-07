import { Button } from "@usememos/mui";
import { PaperclipIcon } from "lucide-react";
import { useContext, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useResourceStore } from "@/store/v1";
import { Resource } from "@/types/proto/api/v1/resource_service";
import { getResourceUrl } from "@/utils/resource";
import { EditorRefActions } from "../Editor";
import { MemoEditorContext } from "../types";

interface Props {
  editorRef: React.RefObject<EditorRefActions>;
}

interface State {
  uploadingFlag: boolean;
}

const UploadResourceButton = (props: Props) => {
  const { editorRef } = props;
  const context = useContext(MemoEditorContext);
  const resourceStore = useResourceStore();
  const [state, setState] = useState<State>({
    uploadingFlag: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = async () => {
    if (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0) {
      return;
    }
    if (state.uploadingFlag) {
      return;
    }

    setState((state) => {
      return {
        ...state,
        uploadingFlag: true,
      };
    });

    const createdResourceList: Resource[] = [];
    try {
      if (!fileInputRef.current || !fileInputRef.current.files) {
        return;
      }
      for (const file of fileInputRef.current.files) {
        const { name: filename, size, type } = file;
        const buffer = new Uint8Array(await file.arrayBuffer());
        const resource = await resourceStore.createResource({
          resource: Resource.fromPartial({
            filename,
            size,
            type,
            content: buffer,
          }),
        });
        createdResourceList.push(resource);
        // console.log("type: ", type); // "image/jpeg", "video/mp4"
        if (type.startsWith("image/")) {
          if (editorRef.current) {
            const resourceUrl = getResourceUrl(resource);
            const cursorPosition = editorRef.current.getCursorPosition();
            const prevValue = editorRef.current.getContent().slice(0, cursorPosition);
            if (prevValue !== "" && !prevValue.endsWith("\n")) {
              editorRef.current.insertText("\n");
            }
            editorRef.current.insertText(`![${filename}](${resource.externalLink ? resourceUrl : resourceUrl + "?thumbnail=true"})\n`);
            setTimeout(() => {
              editorRef.current?.scrollToCursor();
              editorRef.current?.focus();
            });
          } else {
            console.error("editorRef.current is null");
          }
        } else if (type.startsWith("video/")) {
          if (editorRef.current) {
            const resourceUrl = getResourceUrl(resource);
            const cursorPosition = editorRef.current.getCursorPosition();
            const prevValue = editorRef.current.getContent().slice(0, cursorPosition);
            if (prevValue !== "" && !prevValue.endsWith("\n")) {
              editorRef.current.insertText("\n");
            }
            editorRef.current.insertText(
              '```__html\n<video\nclassName="cursor-pointer w-full h-full object-contain bg-zinc-100 dark:bg-zinc-800"\npreload="metadata"\ncrossOrigin="anonymous"\nsrc=' +
                resourceUrl +
                "\ncontrols\n/>\n```",
            );
            setTimeout(() => {
              editorRef.current?.scrollToCursor();
              editorRef.current?.focus();
            });
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }

    context.setResourceList([...context.resourceList, ...createdResourceList]);
    setState((state) => {
      return {
        ...state,
        uploadingFlag: false,
      };
    });
  };

  return (
    <Button className="relative hover:bg-gray-200 dark:hover:bg-gray-600" size="sm" variant="plain" disabled={state.uploadingFlag}>
      <PaperclipIcon className="w-5 h-5 mx-auto" />
      <input
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        ref={fileInputRef}
        disabled={state.uploadingFlag}
        onChange={handleFileInputChange}
        type="file"
        id="files"
        multiple={true}
        accept="*"
      />
    </Button>
  );
};

export default UploadResourceButton;
