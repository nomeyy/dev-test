import { CheckCircle, Megaphone, User, XCircle, Radio } from "lucide-react";
import type { ReactNode } from "react";

export const getIconComponent = (
  iconType: string,
  color: string,
  size: number,
): ReactNode => {
  const iconColor = `text-[${color}]`;

  switch (iconType) {
    case "user":
      return <User className={iconColor} size={size} />;
    case "megaphone":
      return <Megaphone className={iconColor} size={size} />;
    case "check-circle":
      return <CheckCircle className={iconColor} size={size} />;
    case "x-circle":
      return <XCircle className={iconColor} size={size} />;
    case "radio":
      return <Radio className={iconColor} size={size} />;
    default:
      return <CheckCircle className={iconColor} size={size} />;
  }
};
