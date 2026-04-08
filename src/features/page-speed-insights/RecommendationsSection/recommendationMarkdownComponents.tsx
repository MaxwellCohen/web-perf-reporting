import type { ReactNode } from "react";
import type { Components } from "react-markdown";

const linkClassName = "text-blue-600 dark:text-blue-400 hover:underline";

type RecommendationMarkdownOptions = {
  code?: boolean;
  linkStopPropagation?: boolean;
};

export function recommendationMarkdownComponents(
  options: RecommendationMarkdownOptions = {},
): Components {
  const components: Components = {
    p: ({ children }: { children?: ReactNode }) => <>{children}</>,
    a: ({ href, children }: { href?: string; children?: ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        {...(options.linkStopPropagation ? { onClick: (event) => event.stopPropagation() } : {})}
      >
        {children}
      </a>
    ),
  };

  if (options.code) {
    components.code = ({ children }: { children?: ReactNode }) => (
      <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
    );
  }

  return components;
}
