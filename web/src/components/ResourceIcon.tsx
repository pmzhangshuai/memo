import {
  BinaryIcon,
  BookIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileEditIcon,
  FileIcon,
  FileTextIcon,
  FileVideo2Icon,
  SheetIcon,
} from "lucide-react";
import React from "react";
import { Resource } from "@/types/proto/api/v1/resource_service";
import { cn } from "@/utils";
import { getResourceType, getResourceUrl } from "@/utils/resource";
import showPreviewImageDialog from "./PreviewImageDialog";
import SquareDiv from "./kit/SquareDiv";
import { useNavigate } from "react-router-dom";

interface Props {
  resource: Resource;
  className?: string;
  strokeWidth?: number;
  // parentPage?: string;
}

const ResourceIcon = (props: Props) => {
  const { resource } = props;
  const resourceType = getResourceType(resource);
  const resourceUrl = getResourceUrl(resource);
  const className = cn("w-full h-auto", props.className);
  const strokeWidth = props.strokeWidth;

  const previewResource = () => {
    window.open(resourceUrl);
  };

  // const parentPage = props.parentPage || location.pathname;
  const navigateTo = useNavigate();
  const handleNavigate = (route: string) => {
    // 执行导航操作，例如使用 useNavigate 钩子
    navigateTo(route);
  };
  if (resourceType === "image/*") {
    return (
      <SquareDiv className={cn(className, "flex items-center justify-center overflow-clip")}>
        <img
          className="object-cover min-w-full min-h-full"
          src={resource.externalLink ? resourceUrl : resourceUrl + "?thumbnail=true"}
          onClick={() => showPreviewImageDialog(resourceUrl, undefined, resource.memo, handleNavigate)}
          decoding="async"
          loading="lazy"
        />
      </SquareDiv>
    );
  }

  const getResourceIcon = () => {
    switch (resourceType) {
      case "video/*":
        return <FileVideo2Icon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "audio/*":
        return <FileAudioIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "text/*":
        return <FileTextIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/epub+zip":
        return <BookIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/pdf":
        return <BookIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/msword":
        return <FileEditIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/msexcel":
        return <SheetIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/zip":
        return <FileArchiveIcon onClick={previewResource} strokeWidth={strokeWidth} className="w-full h-auto" />;
      case "application/x-java-archive":
        return <BinaryIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
      default:
        return <FileIcon strokeWidth={strokeWidth} className="w-full h-auto" />;
    }
  };

  return (
    <div onClick={previewResource} className={cn(className, "max-w-[4rem] opacity-50")}>
      {getResourceIcon()}
    </div>
  );
};

export default React.memo(ResourceIcon);
