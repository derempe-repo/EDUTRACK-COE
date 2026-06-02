"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  message: string;
  title?: string;
};

export function ConfirmSubmitButton({
  children,
  className,
  message,
  title,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      title={title}
      type="submit"
    >
      {children}
    </button>
  );
}
