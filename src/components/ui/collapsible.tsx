"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CollapsibleContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible components must be used within Collapsible");
  return ctx;
}

export type CollapsibleProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

export function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp],
  );

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

export type CollapsibleTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CollapsibleTrigger({ className, children, ...props }: CollapsibleTriggerProps) {
  const { open, onOpenChange } = useCollapsible();
  return (
    <button
      type="button"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      onClick={() => onOpenChange(!open)}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
}

export type CollapsibleContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CollapsibleContent({ className, children, ...props }: CollapsibleContentProps) {
  const { open } = useCollapsible();
  if (!open) return null;
  return (
    <div className={cn("animate-in fade-in slide-in-from-top-1 duration-200", className)} {...props}>
      {children}
    </div>
  );
}
