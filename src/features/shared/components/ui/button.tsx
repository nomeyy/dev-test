import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  ...props
}) => (
  <button
    className={`rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 ${className}`}
    {...props}
  >
    {children}
  </button>
);
