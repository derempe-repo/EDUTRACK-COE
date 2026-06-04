"use client";

import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  pendingChildren?: ReactNode;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  className,
  disabled,
  pendingChildren,
  pendingLabel = "Memproses...",
  title,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      aria-busy={pending}
      className={cn(className, "disabled:cursor-wait disabled:opacity-70")}
      disabled={pending || disabled}
      title={title}
      type="submit"
    >
      {pending ? (pendingChildren ?? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </span>
      )) : (
        children
      )}
    </button>
  );
}
