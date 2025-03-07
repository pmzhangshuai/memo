import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useMemoStore } from "@/store/v1";
import { Memo } from "@/types/proto/api/v1/memo_service";
import { generateDialog } from "./Dialog";
import "@/less/preview-image-dialog.less";

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_UNIT = 0.25;

interface Props extends DialogProps {
  imgUrls: string[];
  initialIndex: number;
  memoName?: string;
  // parentPage?: string;
  onNavigate?: (route: string) => void;
}

interface State {
  scale: number;
  originX: number;
  originY: number;
}

const defaultState: State = {
  scale: 1,
  originX: -1,
  originY: -1,
};

const PreviewImageDialog: React.FC<Props> = ({ destroy, imgUrls, initialIndex, memoName, onNavigate }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [state, setState] = useState<State>(defaultState);
  let startX = -1;
  let endX = -1;

  const memoStore = useMemoStore();
  const [memo, setMemo] = useState<Memo | null>(null);
  useEffect(() => {
    if (memoName) {
      (async () => {
        const memo = await memoStore.getOrFetchMemoByName(memoName);
        setMemo(memo);
      })();
    } else {
      return;
    }
  }, [memoName]);

  const handleCloseBtnClick = () => {
    destroyAndResetViewport();
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length > 1) {
      // two or more fingers, ignore
      return;
    }
    startX = event.touches[0].clientX;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length > 1) {
      // two or more fingers, ignore
      return;
    }
    endX = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length > 1) {
      // two or more fingers, ignore
      return;
    }
    if (startX > -1 && endX > -1) {
      const distance = startX - endX;
      if (distance > 50) {
        showNextImg();
      } else if (distance < -50) {
        showPrevImg();
      }
    }

    endX = -1;
    startX = -1;
  };

  const showPrevImg = () => {
    if (currentIndex > 0) {
      setState(defaultState);
      setCurrentIndex(currentIndex - 1);
    } else {
      destroyAndResetViewport();
    }
  };

  const showNextImg = () => {
    if (currentIndex < imgUrls.length - 1) {
      setState(defaultState);
      setCurrentIndex(currentIndex + 1);
    } else {
      destroyAndResetViewport();
    }
  };

  // const handleImgContainerClick = (event: React.MouseEvent) => {
  //   if (event.clientX < window.innerWidth / 2) {
  //     showPrevImg();
  //   } else {
  //     showNextImg();
  //   }
  // };

  // const navigateTo = useNavigateTo();
  // const parent = parentPage || location.pathname;
  // const handleGotoMemoDetailPage = useCallback(() => {
  //   navigateTo(`/${memo?.name}`, {
  //     state: {
  //       from: parent,
  //     },
  //   });
  // }, [memo?.name, parent]);

  const [showNavButtons, setShowNavButtons] = useState(true); // 控制导航按钮的显示状态
  const handleImageClick = () => {
    setShowNavButtons(!showNavButtons); // 切换导航按钮的显示状态
  };

  const handleImageContainerKeyDown = (event: KeyboardEvent) => {
    if (event.key == "ArrowLeft") {
      showPrevImg();
    } else if (event.key == "ArrowRight") {
      showNextImg();
    }
  };

  const handleImgContainerScroll = (event: React.WheelEvent) => {
    const offsetX = event.nativeEvent.offsetX;
    const offsetY = event.nativeEvent.offsetY;
    const sign = event.deltaY < 0 ? 1 : -1;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.scale + sign * SCALE_UNIT));
    setState({
      ...state,
      originX: offsetX,
      originY: offsetY,
      scale: scale,
    });
  };

  const setViewportScalable = () => {
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      const contentAttrs = viewport.getAttribute("content");
      if (contentAttrs) {
        viewport.setAttribute("content", contentAttrs.replace("user-scalable=no", "user-scalable=yes"));
      }
    }
  };

  const destroyAndResetViewport = () => {
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      const contentAttrs = viewport.getAttribute("content");
      if (contentAttrs) {
        viewport.setAttribute("content", contentAttrs.replace("user-scalable=yes", "user-scalable=no"));
      }
    }
    destroy();
  };

  const imageComputedStyle = {
    transform: `scale(${state.scale})`,
    transformOrigin: `${state.originX === -1 ? "center" : `${state.originX}px`} ${state.originY === -1 ? "center" : `${state.originY}px`}`,
  };

  useEffect(() => {
    setViewportScalable();
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleImageContainerKeyDown);
    return () => {
      document.removeEventListener("keydown", handleImageContainerKeyDown);
    };
  }, [currentIndex]);

  return (
    <>
      <div className="btns-container">
        <button className="btn" onClick={handleCloseBtnClick}>
          <XIcon className="icon-img" />
        </button>
      </div>
      <div className="img-container">
        <img
          style={imageComputedStyle}
          src={imgUrls[currentIndex]}
          onClick={handleImageClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleImgContainerScroll}
          decoding="async"
          loading="lazy"
        />
        {showNavButtons && currentIndex > 0 && (
          <button
            className="absolute p-2 text-white transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full cursor-pointer top-1/2 left-10"
            onClick={showPrevImg}
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
        {showNavButtons && currentIndex < imgUrls.length - 1 && (
          <button
            className="absolute p-2 text-white transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full cursor-pointer top-1/2 right-10"
            onClick={showNextImg}
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}
        {showNavButtons && memo && (
          <div className="absolute bottom-0 left-0 right-0 p-2 text-white bg-black bg-opacity-20">
            <div className="text-sm">{memo.displayTime?.toLocaleString()}</div>
            <div className="text-sm leading-relaxed memo-content">{memo.content}</div>
            <div
              className="py-2 text-sm text-right underline cursor-pointer"
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`/${memo.name}`);
                  handleCloseBtnClick();
                }
              }}
            >
              {"查看详情>>"}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default function showPreviewImageDialog(
  imgUrls: string[] | string,
  initialIndex?: number,
  memoName?: string,
  // parentPage?: string,
  onNavigate?: (route: string) => void,
): void {
  generateDialog(
    {
      className: "preview-image-dialog",
      dialogName: "preview-image-dialog",
    },
    PreviewImageDialog,
    {
      imgUrls: Array.isArray(imgUrls) ? imgUrls : [imgUrls],
      initialIndex: initialIndex || 0,
      memoName: memoName,
      // parentPage: parentPage,
      onNavigate: onNavigate,
    },
  );
}
