import {
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type UIEvent as ReactUIEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

export type ScrollPhase = "idle" | "pulling" | "armed" | "loading";
export type IndicatorDisplayMode = "overlay" | "inline";

export interface IndicatorRenderState {
  direction: "down" | "up";
  phase: ScrollPhase;
  progress: number;
  threshold: number;
  distance: number;
  loading: boolean;
  mode: IndicatorDisplayMode;
}

export interface ScrollContainerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll" | "children"> {
  children: ReactNode;
  height?: CSSProperties["height"];
  minHeight?: CSSProperties["minHeight"];
  maxHeight?: CSSProperties["maxHeight"];
  contentClassName?: string;
  contentStyle?: CSSProperties;
  disabled?: boolean;
  pullDownEnabled?: boolean;
  pullUpEnabled?: boolean;
  pullDownThreshold?: number;
  pullUpThreshold?: number;
  maxPullDownDistance?: number;
  pullDownResistance?: number;
  animationDuration?: number;
  indicatorMinHeight?: number;
  pullDownIndicatorMode?: IndicatorDisplayMode;
  pullUpIndicatorMode?: IndicatorDisplayMode;
  pullDownIndicatorOffset?: number;
  pullUpIndicatorOffset?: number;
  keepPullDownVisibleWhileLoading?: boolean;
  keepPullUpVisibleWhileLoading?: boolean;
  pullDownLoadingHoldDistance?: number;
  pullDownLoading?: boolean;
  pullUpLoading?: boolean;
  onPullDown?: () => void | Promise<void>;
  onPullUp?: () => void | Promise<void>;
  onScroll?: (event: ReactUIEvent<HTMLDivElement>) => void;
  renderPullDownIndicator?: (state: IndicatorRenderState) => ReactNode;
  renderPullUpIndicator?: (state: IndicatorRenderState) => ReactNode;
  pullDownLoadingIndicator?: ReactNode;
  pullUpLoadingIndicator?: ReactNode;
  pullDownIndicatorClassName?: string;
  pullUpIndicatorClassName?: string;
  pullDownIndicatorStyle?: CSSProperties;
  pullUpIndicatorStyle?: CSSProperties;
}

const DEFAULT_INDICATOR_HEIGHT = 56;
const DEFAULT_PULL_DOWN_THRESHOLD = 72;
const DEFAULT_PULL_UP_THRESHOLD = 96;
const DEFAULT_MAX_PULL_DISTANCE = 140;
const DEFAULT_PULL_RESISTANCE = 0.5;
const DEFAULT_ANIMATION_DURATION = 220;
const LOADING_HOLD_RATIO = 0.78;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toUnit = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value;

function ArrowIcon({ armed }: { armed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      style={{
        transform: armed ? "rotate(180deg)" : undefined,
        transition: "transform 180ms ease"
      }}
    >
      <path
        d="M12 4v13m0 0 5-5m-5 5-5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        opacity="0.22"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      >
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          dur="0.8s"
          from="0 12 12"
          repeatCount="indefinite"
          to="360 12 12"
          type="rotate"
        />
      </path>
    </svg>
  );
}

function DefaultIndicator({
  direction,
  phase,
  progress,
  loading,
  loadingIndicator
}: IndicatorRenderState & { loadingIndicator?: ReactNode }) {
  if (direction === "up" && !loading) {
    return null;
  }

  const icon = loading
    ? loadingIndicator ?? <SpinnerIcon />
    : <ArrowIcon armed={phase === "armed"} />;

  const label =
    direction === "down"
      ? loading
        ? "加载中..."
        : phase === "armed"
          ? "松开立即加载"
          : `下拉加载 ${(progress * 100).toFixed(0)}%`
      : "正在加载更多...";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "#334155",
        fontSize: 13,
        lineHeight: 1.2,
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        backdropFilter: "blur(12px)"
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function ScrollContainer({
  children,
  className,
  style,
  contentClassName,
  contentStyle,
  height = "100%",
  minHeight,
  maxHeight,
  disabled = false,
  pullDownEnabled = true,
  pullUpEnabled = true,
  pullDownThreshold = DEFAULT_PULL_DOWN_THRESHOLD,
  pullUpThreshold = DEFAULT_PULL_UP_THRESHOLD,
  maxPullDownDistance = DEFAULT_MAX_PULL_DISTANCE,
  pullDownResistance = DEFAULT_PULL_RESISTANCE,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  indicatorMinHeight = DEFAULT_INDICATOR_HEIGHT,
  pullDownIndicatorMode = "overlay",
  pullUpIndicatorMode = "overlay",
  pullDownIndicatorOffset = 12,
  pullUpIndicatorOffset = 12,
  keepPullDownVisibleWhileLoading = true,
  keepPullUpVisibleWhileLoading = true,
  pullDownLoadingHoldDistance,
  pullDownLoading,
  pullUpLoading,
  onPullDown,
  onPullUp,
  onScroll,
  renderPullDownIndicator,
  renderPullUpIndicator,
  pullDownLoadingIndicator,
  pullUpLoadingIndicator,
  pullDownIndicatorClassName,
  pullUpIndicatorClassName,
  pullDownIndicatorStyle,
  pullUpIndicatorStyle,
  ...restProps
}: ScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const mouseDragEnabledRef = useRef(false);
  const pullUpLatchRef = useRef(false);
  const downLoadingRef = useRef(false);
  const upLoadingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullDownPhase, setPullDownPhase] = useState<ScrollPhase>("idle");
  const [pullUpPhase, setPullUpPhase] = useState<ScrollPhase>("idle");
  const [internalPullDownLoading, setInternalPullDownLoading] = useState(false);
  const [internalPullUpLoading, setInternalPullUpLoading] = useState(false);

  const resolvedPullDownLoading = pullDownLoading ?? internalPullDownLoading;
  const resolvedPullUpLoading = pullUpLoading ?? internalPullUpLoading;
  const pullDownHoldDistance = Math.max(
    pullDownLoadingHoldDistance ?? 0,
    indicatorMinHeight,
    Math.round(pullDownThreshold * LOADING_HOLD_RATIO)
  );

  const visiblePullDownDistance = resolvedPullDownLoading
    ? keepPullDownVisibleWhileLoading
      ? Math.max(pullDistance, pullDownHoldDistance)
      : 0
    : pullDistance;

  const topInlineSpace =
    pullDownIndicatorMode === "inline" &&
    (visiblePullDownDistance > 0 || (resolvedPullDownLoading && keepPullDownVisibleWhileLoading))
      ? Math.max(indicatorMinHeight, visiblePullDownDistance)
      : 0;

  const bottomInlineSpace =
    pullUpIndicatorMode === "inline" &&
    resolvedPullUpLoading &&
    keepPullUpVisibleWhileLoading
      ? indicatorMinHeight
      : 0;

  const contentTranslateY =
    pullDownIndicatorMode === "overlay" ? visiblePullDownDistance : 0;
  const showPullDownIndicator =
    visiblePullDownDistance > 0 ||
    (resolvedPullDownLoading && keepPullDownVisibleWhileLoading);

  const pullDownProgress = clamp(
    visiblePullDownDistance / Math.max(pullDownThreshold, 1),
    0,
    1
  );

  const resetPullDown = () => {
    setPullDistance(0);
    setPullDownPhase("idle");
    dragStartYRef.current = null;
    mouseDragEnabledRef.current = false;
  };

  const finishPullDownLoading = () => {
    if (pullDownLoading === undefined) {
      setInternalPullDownLoading(false);
    }

    resetPullDown();
  };

  const finishPullUpLoading = () => {
    if (pullUpLoading === undefined) {
      setInternalPullUpLoading(false);
    }

    setPullUpPhase("idle");
  };

  const runPullDown = async () => {
    if (!onPullDown || downLoadingRef.current) {
      return;
    }

    downLoadingRef.current = true;
    setPullDownPhase("loading");
    setPullDistance(pullDownHoldDistance);

    if (pullDownLoading === undefined) {
      setInternalPullDownLoading(true);
    }

    try {
      await onPullDown();
    } finally {
      downLoadingRef.current = false;
      if (pullDownLoading === undefined) {
        finishPullDownLoading();
      }
    }
  };

  const runPullUp = async () => {
    if (!onPullUp || upLoadingRef.current) {
      return;
    }

    upLoadingRef.current = true;
    setPullUpPhase("loading");

    if (pullUpLoading === undefined) {
      setInternalPullUpLoading(true);
    }

    try {
      await onPullUp();
    } finally {
      upLoadingRef.current = false;
      if (pullUpLoading === undefined) {
        finishPullUpLoading();
      }
    }
  };

  const getPullDistance = (deltaY: number) => {
    const resisted = deltaY * pullDownResistance;
    return clamp(resisted, 0, maxPullDownDistance);
  };

  const beginPullTracking = (clientY: number) => {
    if (disabled || !pullDownEnabled || resolvedPullDownLoading) {
      return;
    }

    dragStartYRef.current = clientY;
  };

  const updatePullTracking = (clientY: number, preventDefault?: () => void) => {
    const element = containerRef.current;
    const startY = dragStartYRef.current;

    if (!element || startY === null || disabled || !pullDownEnabled || resolvedPullDownLoading) {
      return;
    }

    const deltaY = clientY - startY;

    if (deltaY <= 0 && pullDistance <= 0) {
      return;
    }

    if (element.scrollTop > 0 && pullDistance <= 0) {
      return;
    }

    if (deltaY > 0) {
      preventDefault?.();
      const nextDistance = getPullDistance(deltaY);
      setPullDistance(nextDistance);
      setPullDownPhase(nextDistance >= pullDownThreshold ? "armed" : "pulling");
    }
  };

  const endPullTracking = () => {
    if (disabled || !pullDownEnabled) {
      resetPullDown();
      return;
    }

    if (pullDownPhase === "armed") {
      void runPullDown();
      return;
    }

    if (!resolvedPullDownLoading) {
      resetPullDown();
    }
  };

  useEffect(() => {
    if (pullDownLoading === undefined) {
      return;
    }

    if (pullDownLoading) {
      setPullDownPhase("loading");
      setPullDistance(pullDownHoldDistance);
      return;
    }

    if (pullDownPhase === "loading") {
      resetPullDown();
    }
  }, [pullDownHoldDistance, pullDownLoading, pullDownPhase]);

  useEffect(() => {
    if (pullUpLoading === undefined) {
      return;
    }

    if (pullUpLoading) {
      setPullUpPhase("loading");
      return;
    }

    if (pullUpPhase === "loading") {
      setPullUpPhase("idle");
    }
  }, [pullUpLoading, pullUpPhase]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseDragEnabledRef.current) {
        return;
      }

      updatePullTracking(event.clientY, event.preventDefault.bind(event));
    };

    const handleMouseUp = () => {
      if (!mouseDragEnabledRef.current) {
        return;
      }

      mouseDragEnabledRef.current = false;
      endPullTracking();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const handleScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    onScroll?.(event);

    const element = event.currentTarget;

    if (
      disabled ||
      !pullUpEnabled ||
      !onPullUp ||
      resolvedPullUpLoading ||
      upLoadingRef.current
    ) {
      return;
    }

    const distanceToBottom =
      element.scrollHeight - (element.scrollTop + element.clientHeight);
    const isNearBottom = distanceToBottom <= pullUpThreshold;

    if (isNearBottom && !pullUpLatchRef.current) {
      pullUpLatchRef.current = true;
      void runPullUp();
      return;
    }

    if (!isNearBottom) {
      pullUpLatchRef.current = false;
    }
  };

  const pullDownIndicator = useMemo(() => {
    const state: IndicatorRenderState = {
      direction: "down",
      phase: pullDownPhase,
      progress: pullDownProgress,
      threshold: pullDownThreshold,
      distance: visiblePullDownDistance,
      loading: resolvedPullDownLoading,
      mode: pullDownIndicatorMode
    };

    return renderPullDownIndicator
      ? renderPullDownIndicator(state)
      : (
          <DefaultIndicator
            {...state}
            loadingIndicator={pullDownLoadingIndicator}
          />
        );
  }, [
    pullDownIndicatorMode,
    pullDownLoadingIndicator,
    pullDownPhase,
    pullDownProgress,
    pullDownThreshold,
    renderPullDownIndicator,
    resolvedPullDownLoading,
    visiblePullDownDistance
  ]);

  const pullUpIndicator = useMemo(() => {
    const state: IndicatorRenderState = {
      direction: "up",
      phase: pullUpPhase,
      progress: resolvedPullUpLoading ? 1 : 0,
      threshold: pullUpThreshold,
      distance: resolvedPullUpLoading ? indicatorMinHeight : 0,
      loading: resolvedPullUpLoading,
      mode: pullUpIndicatorMode
    };

    return renderPullUpIndicator
      ? renderPullUpIndicator(state)
      : (
          <DefaultIndicator
            {...state}
            loadingIndicator={pullUpLoadingIndicator}
          />
        );
  }, [
    indicatorMinHeight,
    pullUpIndicatorMode,
    pullUpLoadingIndicator,
    pullUpPhase,
    pullUpThreshold,
    renderPullUpIndicator,
    resolvedPullUpLoading
  ]);

  const sharedIndicatorWrapStyle: CSSProperties = {
    minHeight: indicatorMinHeight,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };

  const overlayIndicatorBaseStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 2,
    pointerEvents: "none"
  };

  return (
    <div
      {...restProps}
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      onTouchStart={(event: ReactTouchEvent<HTMLDivElement>) => {
        beginPullTracking(event.touches[0]?.clientY ?? 0);
      }}
      onTouchMove={(event: ReactTouchEvent<HTMLDivElement>) => {
        updatePullTracking(
          event.touches[0]?.clientY ?? 0,
          event.preventDefault.bind(event)
        );
      }}
      onTouchEnd={() => {
        endPullTracking();
      }}
      onTouchCancel={() => {
        resetPullDown();
      }}
      onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
          return;
        }

        beginPullTracking(event.clientY);
        mouseDragEnabledRef.current = true;
      }}
      style={{
        position: "relative",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
        height: toUnit(height),
        minHeight: toUnit(minHeight),
        maxHeight: toUnit(maxHeight),
        ...style
      }}
    >
      {pullDownIndicatorMode === "overlay" && showPullDownIndicator && (
          <div
            className={pullDownIndicatorClassName}
            style={{
              ...overlayIndicatorBaseStyle,
              top: pullDownIndicatorOffset,
              ...sharedIndicatorWrapStyle,
              ...pullDownIndicatorStyle
            }}
          >
            {pullDownIndicator}
          </div>
        )}

      <div
        className={contentClassName}
        style={{
          position: "relative",
          transform: contentTranslateY
            ? `translate3d(0, ${contentTranslateY}px, 0)`
            : undefined,
          transition:
            dragStartYRef.current === null
              ? `transform ${animationDuration}ms ease`
              : undefined,
          willChange: visiblePullDownDistance > 0 ? "transform" : undefined,
          ...contentStyle
        }}
      >
        {pullDownIndicatorMode === "inline" && topInlineSpace > 0 && (
          <div
            className={pullDownIndicatorClassName}
            style={{
              ...sharedIndicatorWrapStyle,
              height: topInlineSpace,
              ...pullDownIndicatorStyle
            }}
          >
            {pullDownIndicator}
          </div>
        )}

        {children}

        {pullUpIndicatorMode === "inline" &&
          resolvedPullUpLoading &&
          keepPullUpVisibleWhileLoading && (
            <div
              className={pullUpIndicatorClassName}
              style={{
                ...sharedIndicatorWrapStyle,
                height: bottomInlineSpace,
                ...pullUpIndicatorStyle
              }}
            >
              {pullUpIndicator}
            </div>
          )}
      </div>

      {pullUpIndicatorMode === "overlay" &&
        resolvedPullUpLoading &&
        keepPullUpVisibleWhileLoading && (
          <div
            className={pullUpIndicatorClassName}
            style={{
              ...overlayIndicatorBaseStyle,
              bottom: pullUpIndicatorOffset,
              ...sharedIndicatorWrapStyle,
              ...pullUpIndicatorStyle
            }}
          >
            {pullUpIndicator}
          </div>
        )}
    </div>
  );
}
