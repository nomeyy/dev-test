import React from "react";

type TextProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
};

export const Text: React.FC<TextProps> = ({
  children,
  className = "",
  as = "span",
}) => {
  return React.createElement(
    as,
    { className: `text-base text-gray-800 ${className}` },
    children,
  );
};
