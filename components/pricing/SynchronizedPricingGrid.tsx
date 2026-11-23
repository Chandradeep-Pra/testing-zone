"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CardSize = { natural: number; minimum: number };
type GridSizing = {
  height: number | undefined;
  showActions: boolean;
  expanded: ReadonlySet<string>;
  expand: (id: string) => void;
  report: (id: string, size: CardSize) => void;
  remove: (id: string) => void;
};

const SizingContext = createContext<GridSizing | null>(null);

export function SynchronizedPricingGrid({ children, className }: { children: ReactNode; className: string }) {
  const [sizes, setSizes] = useState<Record<string, CardSize>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const report = useCallback((id: string, size: CardSize) => {
    setSizes((current) => {
      const previous = current[id];
      if (previous?.natural === size.natural && previous?.minimum === size.minimum) return current;
      return { ...current, [id]: size };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSizes((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const expand = useCallback((id: string) => {
    setExpanded((current) => new Set([...current, id]));
  }, []);

  const height = useMemo(() => {
    const entries = Object.entries(sizes);
    if (entries.length === 0) return undefined;
    // Start at the shortest natural card, while protecting every card's controls.
    return Math.ceil(Math.max(
      Math.min(...entries.map(([, size]) => size.natural)),
      ...entries.map(([id, size]) => expanded.has(id) ? size.natural : size.minimum),
    ));
  }, [sizes, expanded]);

  const showActions = height !== undefined && Object.values(sizes).some((size) => size.natural > height + 1);
  const value = useMemo(() => ({ height, showActions, expanded, expand, report, remove }), [height, showActions, expanded, expand, report, remove]);

  return (
    <SizingContext.Provider value={value}>
      <div className={className} data-pricing-grid="" data-card-height={height}>{children}</div>
    </SizingContext.Provider>
  );
}

export function PricingCardLayout({
  id,
  name,
  className,
  disabled,
  header,
  features,
  footer,
}: {
  id: string;
  name: string;
  className: string;
  disabled?: boolean;
  header: ReactNode;
  features: ReactNode;
  footer: ReactNode;
}) {
  const sizing = useContext(SizingContext);
  if (!sizing) throw new Error("PricingCardLayout requires SynchronizedPricingGrid");
  const { height, showActions, expanded, expand, report, remove } = sizing;
  const articleRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const article = articleRef.current;
    const summary = headerRef.current;
    const content = contentRef.current;
    const footerElement = footerRef.current;
    const scroller = scrollRef.current;
    const actions = actionsRef.current;
    if (!article || !summary || !content || !footerElement || !scroller || !actions) return;
    let active = true;

    const measure = () => {
      if (!active || article.getBoundingClientRect().width === 0) return;
      const style = getComputedStyle(article);
      const frame = [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth]
        .reduce((total, value) => total + (parseFloat(value) || 0), 0);
      const contentHeight = content.getBoundingClientRect().height;
      // Read spacing from the layout, including the action row only when needed.
      const listGap = parseFloat(getComputedStyle(scroller.parentElement!).marginTop) || 0;
      const footerGap = parseFloat(getComputedStyle(footerElement).marginTop) || 0;
      const fixed = frame + summary.getBoundingClientRect().height + footerElement.getBoundingClientRect().height
        + listGap + actions.getBoundingClientRect().height + footerGap;
      report(id, {
        natural: Math.ceil(fixed + contentHeight),
        minimum: Math.ceil(fixed + Math.min(contentHeight, 48)),
      });
      setOverflow(scroller.scrollHeight > scroller.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [article, summary, content, footerElement, scroller, actions]) observer.observe(element);
    void document.fonts.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
      remove(id);
    };
  }, [id, report, remove]);

  return (
    <article
      ref={articleRef}
      className={`relative flex flex-col overflow-hidden transition-[height] duration-[220ms] ease-out motion-reduce:transition-none ${className}`}
      style={{ height }}
      data-pricing-card={id}
      data-disabled={disabled || undefined}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0f7896]" />
      <div ref={headerRef} className="shrink-0">{header}</div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          id={listId}
          role="region"
          aria-label={`${name} features`}
          tabIndex={overflow ? 0 : undefined}
          className="min-h-0 flex-1 overflow-y-auto rounded-sm [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f7896] [&::-webkit-scrollbar]:hidden"
          data-pricing-features=""
        >
          <div ref={contentRef} className="flow-root space-y-2">{features}</div>
        </div>
        <div ref={actionsRef} className={`flex shrink-0 items-center justify-end ${showActions ? "h-6" : "h-0 overflow-hidden"}`} data-pricing-actions="">
          {overflow && showActions ? (
            <button
              type="button"
              aria-controls={listId}
              aria-expanded={expanded.has(id)}
              aria-label={`See more features for ${name}`}
              className="rounded px-1 py-1 text-xs font-semibold text-[#0f7896] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f7896]"
              onClick={() => {
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
                expand(id);
              }}
              data-check-all=""
            >
              See more ...
            </button>
          ) : null}
        </div>
      </div>
      <div ref={footerRef} className="mt-2 shrink-0" data-pricing-footer="">{footer}</div>
    </article>
  );
}
