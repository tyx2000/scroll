# React Scroll Container

一个面向 React 的高可定制滚动容器，支持：

- 下拉触发回调
- 上滑接近底部自动触发回调
- 自定义上/下方向的触发阈值
- 自定义上下 loading 图标
- 自定义 loading 图标是在内容层上方悬浮，还是占据内容顶部/底部位置
- 支持受控和非受控 loading 状态
- 支持通过 render props 完整接管状态展示

## 安装

```bash
npm install react-scroll-container-kit
```

## 本地开发

```bash
npm install
npm run dev
```

测试和构建：

```bash
npm run test
npm run build
```

如果需要构建示例页静态资源，会输出到 `demo-dist/`：

```bash
npm run build:demo
```

`npm run build` 会在构建完成后输出一张对齐的体积对比表，包含原始体积、`gzip`、`brotli` 和压缩节省比例。

## GitHub Actions

仓库里已经预留了：

- [ci.yml](/Users/adib/Desktop/practices/react-scroll/.github/workflows/ci.yml) 统一处理手动校验和可选的 npm 发布

这个 workflow 使用 `workflow_dispatch`，可以在 GitHub Actions 页面手动选择分支后再运行，并通过 `publish_to_npm` 决定是只做校验，还是校验后发布到 npm。

发布前需要在 GitHub 仓库 Secrets 中添加：

```text
NPM_TOKEN=<your npm access token>
```

## 快速使用

```tsx
import { ScrollContainer } from "react-scroll-container-kit";

export function Demo() {
  return (
    <ScrollContainer
      height={480}
      pullDownThreshold={88}
      pullUpThreshold={120}
      onPullDown={async () => {
        await refreshList();
      }}
      onPullUp={async () => {
        await loadMore();
      }}
    >
      <div>{/* content */}</div>
    </ScrollContainer>
  );
}
```

## 示例页内容

根目录已经补了一个 Vite 示例页，运行 `npm run dev` 后即可看到：

- 上滑加载更多
- 下拉刷新
- 自定义上下 loading 图标
- 可实时调节上下触发阈值

## 主要 API

### 基础布局

| Prop | 说明 | 默认值 |
| --- | --- | --- |
| `height` | 容器高度 | `"100%"` |
| `minHeight` / `maxHeight` | 最小/最大高度 | - |
| `className` / `style` | 容器样式 | - |
| `contentClassName` / `contentStyle` | 内容层样式 | - |

### 下拉加载

| Prop | 说明 | 默认值 |
| --- | --- | --- |
| `pullDownEnabled` | 是否启用下拉加载 | `true` |
| `pullDownThreshold` | 触发回调所需下拉距离 | `72` |
| `maxPullDownDistance` | 下拉最大位移 | `140` |
| `pullDownResistance` | 下拉阻尼系数 | `0.5` |
| `pullDownLoading` | 受控 loading 状态 | 非受控 |
| `onPullDown` | 下拉达到阈值后触发 | - |
| `keepPullDownVisibleWhileLoading` | 回调执行期间是否保留提示区域 | `true` |
| `pullDownLoadingHoldDistance` | loading 时内容保持下压的距离 | 自动计算 |

### 上滑加载

| Prop | 说明 | 默认值 |
| --- | --- | --- |
| `pullUpEnabled` | 是否启用上滑加载 | `true` |
| `pullUpThreshold` | 距离底部多少像素时触发回调 | `96` |
| `pullUpLoading` | 受控 loading 状态 | 非受控 |
| `onPullUp` | 接近底部时触发 | - |
| `keepPullUpVisibleWhileLoading` | 回调执行期间是否保留提示区域 | `true` |

### 指示器展示

| Prop | 说明 | 默认值 |
| --- | --- | --- |
| `indicatorMinHeight` | 指示器最小展示高度 | `56` |
| `pullDownIndicatorMode` | 下拉指示器展示模式，`overlay` 或 `inline` | `"overlay"` |
| `pullUpIndicatorMode` | 上滑指示器展示模式，`overlay` 或 `inline` | `"overlay"` |
| `pullDownIndicatorOffset` | overlay 模式下距离顶部偏移 | `12` |
| `pullUpIndicatorOffset` | overlay 模式下距离底部偏移 | `12` |
| `pullDownLoadingIndicator` | 自定义下拉 loading 图标 | - |
| `pullUpLoadingIndicator` | 自定义上滑 loading 图标 | - |
| `renderPullDownIndicator` | 自定义下拉整块 UI | - |
| `renderPullUpIndicator` | 自定义上滑整块 UI | - |
| `pullDownIndicatorClassName` / `pullUpIndicatorClassName` | 指示器外层 className | - |
| `pullDownIndicatorStyle` / `pullUpIndicatorStyle` | 指示器外层 style | - |

## 指示器状态

`renderPullDownIndicator` 和 `renderPullUpIndicator` 会收到以下状态：

```ts
type ScrollPhase = "idle" | "pulling" | "armed" | "loading";

interface IndicatorRenderState {
  direction: "down" | "up";
  phase: ScrollPhase;
  progress: number;
  threshold: number;
  distance: number;
  loading: boolean;
  mode: "overlay" | "inline";
}
```

其中：

- `phase === "armed"` 表示已经超过阈值，松手后将触发回调
- `progress` 适合驱动进度条、动画缩放、透明度等
- `mode` 可用于让你的自定义组件区分悬浮式和占位式布局

## 自定义 loading 图标

```tsx
<ScrollContainer
  pullDownLoadingIndicator={
    <img src="/spinner.svg" alt="" width={18} height={18} />
  }
  pullUpLoadingIndicator={<MyLoader />}
  onPullDown={refreshList}
  onPullUp={loadMore}
>
  {children}
</ScrollContainer>
```

## 完全自定义提示层

```tsx
<ScrollContainer
  pullDownIndicatorMode="inline"
  pullUpIndicatorMode="overlay"
  renderPullDownIndicator={({ phase, progress }) => (
    <div
      style={{
        width: 220,
        opacity: Math.max(progress, 0.35),
        textAlign: "center"
      }}
    >
      {phase === "loading" ? "正在刷新..." : "继续下拉"}
    </div>
  )}
  renderPullUpIndicator={({ loading }) =>
    loading ? <div style={{ padding: 12 }}>加载更多中...</div> : null
  }
  onPullDown={refreshList}
  onPullUp={loadMore}
>
  {children}
</ScrollContainer>
```

## 额外可扩展点

这个版本已经把你提到的核心诉求抽成了可配置项，另外还补了几类后续常见需求：

- 受控 loading：服务端分页、React Query、SWR 场景更容易集成
- 内容层独立样式：可直接做卡片流、聊天流、瀑布流
- 阻尼、位移、阈值分离：更容易调出偏原生或偏强反馈的手感
- overlay / inline 分离：既能做悬浮图标，也能做占据顶部或底部的提示条

如果你后面还想加：

- `hasMore` / `noMore` 状态
- 反向列表聊天场景
- 横向滚动支持
- 虚拟列表适配

建议直接在这个组件上继续扩展。
