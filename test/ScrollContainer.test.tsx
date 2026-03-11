import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScrollContainer } from "../src";

function setScrollMetrics(
  element: HTMLElement,
  {
    scrollHeight,
    clientHeight,
    scrollTop
  }: { scrollHeight: number; clientHeight: number; scrollTop: number }
) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: scrollTop
  });
}

describe("ScrollContainer", () => {
  it("triggers pull-down refresh only after exceeding the custom threshold", async () => {
    const onPullDown = vi.fn();

    render(
      <ScrollContainer
        data-testid="scroll"
        height={300}
        pullDownThreshold={90}
        onPullDown={onPullDown}
      >
        <div style={{ height: 1200 }}>content</div>
      </ScrollContainer>
    );

    const container = screen.getByTestId("scroll");

    fireEvent.mouseDown(container, { button: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientY: 120 });
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(onPullDown).not.toHaveBeenCalled();
    });

    fireEvent.mouseDown(container, { button: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientY: 200 });
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(onPullDown).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the built-in loading state while an async pull-down callback is pending", async () => {
    let resolveRefresh: (() => void) | undefined;
    const onPullDown = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    render(
      <ScrollContainer
        data-testid="scroll"
        height={300}
        pullDownThreshold={60}
        onPullDown={onPullDown}
      >
        <div style={{ height: 1200 }}>content</div>
      </ScrollContainer>
    );

    const container = screen.getByTestId("scroll");

    fireEvent.mouseDown(container, { button: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientY: 160 });
    fireEvent.mouseUp(window);

    expect(await screen.findByText("加载中...")).toBeInTheDocument();

    await act(async () => {
      resolveRefresh?.();
    });

    await waitFor(() => {
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
    });
  });

  it("triggers pull-up loading when scrolling within the custom bottom threshold", async () => {
    const onPullUp = vi.fn();

    render(
      <ScrollContainer
        data-testid="scroll"
        height={300}
        pullUpThreshold={140}
        onPullUp={onPullUp}
      >
        <div style={{ height: 1200 }}>content</div>
      </ScrollContainer>
    );

    const container = screen.getByTestId("scroll");
    setScrollMetrics(container, {
      scrollHeight: 1200,
      clientHeight: 300,
      scrollTop: 770
    });

    fireEvent.scroll(container);

    await waitFor(() => {
      expect(onPullUp).toHaveBeenCalledTimes(1);
    });
  });

  it("renders custom loading indicators for both directions in controlled mode", () => {
    render(
      <ScrollContainer
        data-testid="scroll"
        height={300}
        pullDownLoading
        pullUpLoading
        pullDownLoadingIndicator={<span>custom-refresh</span>}
        pullUpLoadingIndicator={<span>custom-more</span>}
      >
        <div style={{ height: 1200 }}>content</div>
      </ScrollContainer>
    );

    expect(screen.getByText("custom-refresh")).toBeInTheDocument();
    expect(screen.getByText("custom-more")).toBeInTheDocument();
  });
});
