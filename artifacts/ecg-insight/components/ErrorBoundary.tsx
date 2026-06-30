import React, { Component, ComponentType, PropsWithChildren } from "react";

import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  componentName?: string;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

const COLLECTION_NAMES = [
  "actions",
  "attachments",
  "citations",
  "conversations",
  "knowledgeTags",
  "messages",
  "references",
  "sources",
  "uploadedFiles",
] as const;

function isCollectionFilterCrash(error: Error) {
  return /reading 'filter'|\.filter is not a function/i.test(error.message);
}

function componentNameFromStack(componentStack: string, fallback?: string) {
  const match = componentStack.match(/^\s*in (\w+)/m) ?? componentStack.match(/at (\w+) \(/);
  return match?.[1] ?? fallback ?? "UnknownComponent";
}

function collectionNameFromCrash(error: Error, componentStack: string) {
  for (const name of COLLECTION_NAMES) {
    if (componentStack.includes(name) || error.message.includes(name)) return name;
  }
  return "unknownCollection";
}

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (isCollectionFilterCrash(error)) {
      const componentName = this.props.componentName ?? componentNameFromStack(info.componentStack);
      const variableName = collectionNameFromCrash(error, info.componentStack);
      console.error(
        "Runtime collection crash",
        componentName,
        variableName,
        error.message,
      );
    }

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
