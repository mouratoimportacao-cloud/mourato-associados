"use client";

import React from "react";

interface Props {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  message?: string;
}

export default function ConfirmSubmitButton({
  onClick,
  disabled = false,
  children = "Confirm",
  className = "",
  message,
}: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (message) {
      const confirmed = window.confirm(message);
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={disabled}
      className={`rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
