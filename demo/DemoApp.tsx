import { useState } from "react";

import { ScrollContainer } from "../src";

interface FeedItem {
  id: string;
  title: string;
  tone: string;
  detail: string;
}

const tones = [
  "Coral",
  "Mint",
  "Sky",
  "Amber",
  "Rose",
  "Teal",
  "Cobalt",
  "Lime"
];

const details = [
  "Touch threshold can be tuned to feel native or aggressive.",
  "Overlay indicators float above cards without changing layout.",
  "Inline indicators reserve space at the edge of the feed.",
  "Controlled loading works well with data fetching libraries.",
  "Bottom loading fires when the list nears the last items.",
  "The indicator UI can be replaced by your own render function."
];

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createItems(prefix: string, count: number, seed: number): FeedItem[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `${prefix}-${seed + index}`;
    return {
      id,
      title: `${prefix} card ${seed + index}`,
      tone: tones[(seed + index) % tones.length],
      detail: details[(seed + index) % details.length]
    };
  });
}

function RefreshGlyph() {
  return (
    <span className="indicator-chip indicator-chip-refresh" aria-hidden="true">
      <span className="indicator-ring" />
      <span className="indicator-core" />
    </span>
  );
}

function LoadMoreGlyph() {
  return (
    <span className="indicator-chip indicator-chip-load" aria-hidden="true">
      <span className="indicator-bar indicator-bar-one" />
      <span className="indicator-bar indicator-bar-two" />
      <span className="indicator-bar indicator-bar-three" />
    </span>
  );
}

export function DemoApp() {
  const [pullDownThreshold, setPullDownThreshold] = useState(84);
  const [pullUpThreshold, setPullUpThreshold] = useState(120);
  const [refreshCount, setRefreshCount] = useState(0);
  const [loadCount, setLoadCount] = useState(0);
  const [items, setItems] = useState<FeedItem[]>(() => createItems("Feed", 14, 1));

  const handleRefresh = async () => {
    await wait(900);
    setRefreshCount((count) => count + 1);
    setItems((current) => [
      ...createItems("Fresh", 3, refreshCount * 3 + 1),
      ...current
    ]);
  };

  const handleLoadMore = async () => {
    await wait(900);
    setLoadCount((count) => count + 1);
    setItems((current) => [
      ...current,
      ...createItems("More", 4, current.length + loadCount + 1)
    ]);
  };

  return (
    <main className="demo-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">React Scroll Container</p>
          <h1>上滑加载、下拉刷新和可调阈值的滚动容器示例</h1>
          <p className="hero-text">
            拖拽卡片流顶部触发刷新，滚动到底部附近触发加载更多。左右控件可以实时调节上下方向阈值，自定义 loading 图标和提示层样式已经接入。
          </p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-label">Refresh Count</span>
            <strong>{refreshCount}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Load More Count</span>
            <strong>{loadCount}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Items</span>
            <strong>{items.length}</strong>
          </article>
        </div>
      </section>

      <section className="workspace">
        <aside className="controls-panel">
          <div className="panel-heading">
            <h2>Threshold Controls</h2>
            <p>调整阈值，直接观察拖拽和触底的触发时机变化。</p>
          </div>

          <label className="control-block">
            <span>Pull Down Threshold</span>
            <strong>{pullDownThreshold}px</strong>
            <input
              type="range"
              min="40"
              max="140"
              step="4"
              value={pullDownThreshold}
              onChange={(event) => {
                setPullDownThreshold(Number(event.target.value));
              }}
            />
          </label>

          <label className="control-block">
            <span>Pull Up Threshold</span>
            <strong>{pullUpThreshold}px</strong>
            <input
              type="range"
              min="60"
              max="220"
              step="4"
              value={pullUpThreshold}
              onChange={(event) => {
                setPullUpThreshold(Number(event.target.value));
              }}
            />
          </label>

          <div className="legend-card">
            <div className="legend-row">
              <RefreshGlyph />
              <span>自定义下拉 loading 图标</span>
            </div>
            <div className="legend-row">
              <LoadMoreGlyph />
              <span>自定义上滑 loading 图标</span>
            </div>
          </div>
        </aside>

        <section className="preview-panel">
          <div className="panel-heading">
            <h2>Interactive Feed</h2>
            <p>下拉刷新使用 overlay 提示，上滑加载使用 inline 提示。</p>
          </div>

          <ScrollContainer
            className="feed-frame"
            contentClassName="feed-content"
            height={520}
            pullDownThreshold={pullDownThreshold}
            pullUpThreshold={pullUpThreshold}
            maxPullDownDistance={160}
            pullDownResistance={0.65}
            indicatorMinHeight={72}
            pullDownIndicatorMode="overlay"
            pullUpIndicatorMode="inline"
            pullDownLoadingIndicator={<RefreshGlyph />}
            pullUpLoadingIndicator={<LoadMoreGlyph />}
            onPullDown={handleRefresh}
            onPullUp={handleLoadMore}
            renderPullDownIndicator={({ loading, phase, progress }) => (
              <div className="signal-card">
                {loading ? <RefreshGlyph /> : <span className="signal-progress">{Math.round(progress * 100)}%</span>}
                <div>
                  <strong>{loading ? "Refreshing feed" : phase === "armed" ? "Release to refresh" : "Pull down to refresh"}</strong>
                  <p>{loading ? "Custom icon is active." : `Threshold ${pullDownThreshold}px`}</p>
                </div>
              </div>
            )}
            renderPullUpIndicator={({ loading }) =>
              loading ? (
                <div className="signal-inline">
                  <LoadMoreGlyph />
                  <span>Loading 4 more cards...</span>
                </div>
              ) : null
            }
          >
            <div className="feed-list">
              {items.map((item, index) => (
                <article className="feed-card" key={item.id}>
                  <div className="feed-card-top">
                    <span className="feed-badge">{item.tone}</span>
                    <span className="feed-index">#{index + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </ScrollContainer>
        </section>
      </section>
    </main>
  );
}
