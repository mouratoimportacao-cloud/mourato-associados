"use client";

import React from "react";

interface Props {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  message?: string;
  requiredPassword?: string;
}

export default function ConfirmSubmitButton({
  onClick,
  disabled = false,
  children = "Confirm",
  className = "",
  message,
  requiredPassword,
}: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (message) {
      const confirmed = window.confirm(message);
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }
    if (requiredPassword) {
      const password = window.prompt("Digite a senha de 4 dígitos para confirmar esta ação crítica:");
      if (password !== requiredPassword) {
        window.alert("Senha inválida! Ação cancelada.");
        e.preventDefault();
        return;
      }
      const form = e.currentTarget.form;
      if (form) {
        let input = form.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "confirmPassword";
          form.appendChild(input);
        }
        input.value = password;
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
