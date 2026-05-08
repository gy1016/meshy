import { Button, Input } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ChatMessage } from "@/shared/types/chat-message.dto";

interface AiAssistantChatPanelProps {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sending: boolean;
  onSend: () => void;
}

const OVERSCAN_COUNT = 6;
const AUTO_SCROLL_THRESHOLD = 80;

function estimateRowHeight(content: string) {
  const textLength = content.length;
  const lineCount = Math.max(1, Math.ceil(textLength / 22));
  const estimated = 44 + lineCount * 18;
  return Math.min(Math.max(estimated, 56), 260);
}

function createVirtualMetrics(messages: ChatMessage[], measuredHeights: Map<number, number>) {
  const offsets = Array.from<number>({ length: messages.length });
  const heights = Array.from<number>({ length: messages.length });
  let totalHeight = 0;

  for (const [index, message] of messages.entries()) {
    offsets[index] = totalHeight;
    const measured = measuredHeights.get(index);
    const height = measured ?? estimateRowHeight(message.content);
    heights[index] = height;
    totalHeight += height;
  }

  return { offsets, heights, totalHeight };
}

function findStartIndex(offsets: number[], heights: number[], scrollTop: number) {
  let low = 0;
  let high = offsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const rowStart = offsets[mid];
    const rowEnd = rowStart + heights[mid];

    if (rowEnd < scrollTop) {
      low = mid + 1;
      continue;
    }

    if (rowStart > scrollTop) {
      high = mid - 1;
      continue;
    }

    return mid;
  }

  return Math.max(0, low - 1);
}

function findEndIndex(metrics: ReturnType<typeof createVirtualMetrics>, viewportBottom: number) {
  const { offsets, heights } = metrics;
  let index = findStartIndex(offsets, heights, viewportBottom);
  while (index < offsets.length - 1 && offsets[index] < viewportBottom) {
    index += 1;
  }

  return Math.min(offsets.length - 1, index);
}

function useViewportHeight(viewportRef: RefObject<HTMLDivElement | null>) {
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight);
    });
    observer.observe(element);
    setViewportHeight(element.clientHeight);

    return () => observer.disconnect();
  }, [viewportRef]);

  return viewportHeight;
}

function useScrollToBottom(
  viewportRef: RefObject<HTMLDivElement | null>,
  totalHeight: number,
  messageCount: number,
  shouldAutoScroll: boolean,
  setScrollTop: (value: number) => void,
) {
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = totalHeight;
    setScrollTop(viewport.scrollTop);
  }, [messageCount, setScrollTop, shouldAutoScroll, totalHeight, viewportRef]);
}

function useVirtualChat(messages: ChatMessage[]) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState(() => new Map<number, number>());
  const [scrollTop, setScrollTop] = useState(0);
  const [stickToBottom, setStickToBottom] = useState(true);
  const viewportHeight = useViewportHeight(viewportRef);

  const metrics = useMemo(
    () => createVirtualMetrics(messages, measuredHeights),
    [measuredHeights, messages],
  );

  useScrollToBottom(viewportRef, metrics.totalHeight, messages.length, stickToBottom, setScrollTop);

  const visibleStart = findStartIndex(metrics.offsets, metrics.heights, scrollTop);
  const rawVisibleEnd = findEndIndex(metrics, scrollTop + viewportHeight);
  const start = Math.max(0, visibleStart - OVERSCAN_COUNT);
  const end = Math.min(messages.length - 1, rawVisibleEnd + OVERSCAN_COUNT);

  function handleRowMeasure(index: number, node: HTMLDivElement | null) {
    if (!node) return;
    const nextHeight = Math.ceil(node.getBoundingClientRect().height);
    const previousHeight = measuredHeights.get(index);
    if (previousHeight === nextHeight) return;
    setMeasuredHeights((previous) => {
      const entries = [...previous.entries()].filter(([entryIndex]) => entryIndex !== index);
      return new Map([...entries, [index, nextHeight]]);
    });
  }

  return {
    viewportRef,
    metrics,
    scrollTop,
    stickToBottom,
    setScrollTop,
    setStickToBottom,
    start,
    end,
    handleRowMeasure,
  };
}

function ChatHistory(props: { messages: ChatMessage[] }) {
  const virtual = useVirtualChat(props.messages);
  const visibleMessages = props.messages.slice(virtual.start, virtual.end + 1);

  return (
    <div
      ref={virtual.viewportRef}
      className="meshy-ai-chat__viewport"
      onScroll={(event) => {
        const element = event.currentTarget;
        const nextScrollTop = element.scrollTop;
        const distanceToBottom = element.scrollHeight - (nextScrollTop + element.clientHeight);

        virtual.setScrollTop(nextScrollTop);
        virtual.setStickToBottom(distanceToBottom <= AUTO_SCROLL_THRESHOLD);
      }}
    >
      <div className="meshy-ai-chat__spacer" style={{ height: virtual.metrics.totalHeight }}>
        {visibleMessages.map((message, visibleIndex) => {
          const index = virtual.start + visibleIndex;
          const top = virtual.metrics.offsets[index] ?? 0;

          return (
            <div
              key={`${message.role}-${index}`}
              ref={(node) => {
                virtual.handleRowMeasure(index, node);
              }}
              className={`meshy-ai-chat__row ${
                message.role === "user" ? "meshy-ai-chat__row--user" : "meshy-ai-chat__row--assistant"
              }`}
              style={{ top }}
            >
              <div
                className={
                  message.role === "user"
                    ? "meshy-ai-chat__bubble meshy-ai-chat__bubble--user"
                    : "meshy-ai-chat__bubble"
                }
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AiAssistantChatPanel(props: AiAssistantChatPanelProps) {
  return (
    <div className="meshy-ai-chat">
      <ChatHistory messages={props.messages} />
      <div className="meshy-ai-chat__composer">
        <Input.TextArea
          className="meshy-ai-chat__input"
          value={props.chatInput}
          placeholder="输入消息，Shift+Enter 换行"
          autoSize={{ minRows: 2, maxRows: 6 }}
          onChange={(event) => {
            props.setChatInput(event.target.value);
          }}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void props.onSend();
            }
          }}
        />
        <Button type="primary" block loading={props.sending} onClick={() => void props.onSend()}>
          发送
        </Button>
      </div>
    </div>
  );
}
