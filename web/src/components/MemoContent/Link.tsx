import { Link as MLink, Tooltip } from "@mui/joy";
import { Earth, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { markdownServiceClient } from "@/grpcweb";
import { useWorkspaceSettingStore } from "@/store/v1";
import { LinkMetadata } from "@/types/proto/api/v1/markdown_service";
import { WorkspaceMemoRelatedSetting } from "@/types/proto/api/v1/workspace_setting_service";
import { WorkspaceSettingKey } from "@/types/proto/store/workspace_setting";

interface Props {
  url: string;
  text?: string;
}

const getFaviconWithGoogleS2 = (url: string) => {
  try {
    const urlObject = new URL(url);
    // return `https://www.google.com/s2/favicons?sz=128&domain=${urlObject.hostname}`;
    return `https://icons.duckduckgo.com/ip3/${urlObject.hostname}.ico`;
  } catch (error) {
    return undefined;
  }
};

// 域名到默认文本的映射
const getDefaultTitleByDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    switch (hostname) {
      case "mp.weixin.qq.com":
        return "微信公众平台";
      case "www.baidu.com":
        return "百度";
      default:
        return hostname; // 如果没有匹配到，则返回域名
    }
  } catch (error) {
    return url; // 如果 URL 解析出错，则返回原始 URL
  }
};

const Link: React.FC<Props> = ({ text, url }: Props) => {
  const workspaceSettingStore = useWorkspaceSettingStore();
  const workspaceMemoRelatedSetting =
    workspaceSettingStore.getWorkspaceSettingByKey(WorkspaceSettingKey.MEMO_RELATED).memoRelatedSetting ||
    WorkspaceMemoRelatedSetting.fromPartial({});
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata | undefined>();

  useEffect(() => {
    if (workspaceMemoRelatedSetting.enableLinkPreview) {
      (async () => {
        try {
          const linkMetadata = await markdownServiceClient.getLinkMetadata({ link: url });
          setLinkMetadata(linkMetadata);
        } catch (error) {
          console.error("Error fetching URL metadata:", error);
        }
      })();
    }
  }, [url, workspaceMemoRelatedSetting.enableLinkPreview]);

  const handleLinkTo = () => {
    // 在新标签页中打开链接
    window.open(url);
  };

  const [initialized, setInitialized] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const handleMouseEnter = async () => {
    if (!workspaceMemoRelatedSetting.enableLinkPreview) {
      return;
    }

    setShowTooltip(true);
    if (!initialized) {
      try {
        const linkMetadata = await markdownServiceClient.getLinkMetadata({ link: url });
        setLinkMetadata(linkMetadata);
      } catch (error) {
        console.error("Error fetching URL metadata:", error);
      }
      setInitialized(true);
    }
  };

  return text ? (
    <Tooltip
      variant="outlined"
      title={
        linkMetadata && (
          <div className="flex flex-col w-full p-1 max-w-64 sm:max-w-96">
            <div className="flex flex-row items-center justify-start w-full gap-1">
              {getFaviconWithGoogleS2(url) ? (
                <img className="w-5 h-5 rounded" src={getFaviconWithGoogleS2(url)} alt={linkMetadata?.title} />
              ) : (
                <Earth className="w-5 h-5" />
              )}
              <h3 className="text-base truncate dark:opacity-90">{linkMetadata?.title}</h3>
            </div>
            <p className="w-full mt-1 text-sm leading-snug opacity-80 line-clamp-3">
              {linkMetadata.description ? linkMetadata.description : url}
            </p>
          </div>
        )
      }
      open={showTooltip}
      arrow
    >
      <MLink underline="hover" target="_blank" href={url} rel="noopener noreferrer">
        <LinkIcon className="w-4 h-4 pr-1" />
        <span onMouseEnter={handleMouseEnter} onMouseLeave={() => setShowTooltip(false)}>
          {text}
        </span>
      </MLink>
    </Tooltip>
  ) : linkMetadata ? (
    <div
      className="flex flex-col w-full p-3 border border-gray-200 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 hover:shadow max-w-64 sm:max-w-96"
      title={url}
      onClick={handleLinkTo}
    >
      <div className="flex flex-row items-center justify-start w-full gap-1">
        {getFaviconWithGoogleS2(url) ? (
          <img className="w-5 h-5 rounded" src={getFaviconWithGoogleS2(url)} alt="" />
        ) : (
          <Earth className="w-5 h-5" />
        )}
        <h3 className="text-base truncate dark:opacity-90">
          {linkMetadata?.title && linkMetadata?.title !== "title" ? linkMetadata?.title : getDefaultTitleByDomain(url)}
        </h3>
      </div>
      <p className="w-full mt-1 text-sm leading-snug opacity-80 line-clamp-3">
        {linkMetadata.description ? linkMetadata.description : url}
      </p>
    </div>
  ) : (
    <MLink underline="always" target="_blank" href={url} rel="noopener noreferrer">
      <span>{text || url}</span>
    </MLink>
  );
};

export default Link;
