import { CheckCircle, Megaphone, User, XCircle, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { ICON_TYPES } from "./constants";

export const getIconComponent = (
  iconType: string,
  color: string,
  size: number,
): ReactNode => {
  const iconColor = `text-[${color}]`;

  switch (iconType) {
    case ICON_TYPES.USER:
      return <User className={iconColor} size={size} />;
    case ICON_TYPES.MEGAPHONE:
      return <Megaphone className={iconColor} size={size} />;
    case ICON_TYPES.CHECK_CIRCLE:
      return <CheckCircle className={iconColor} size={size} />;
    case ICON_TYPES.X_CIRCLE:
      return <XCircle className={iconColor} size={size} />;
    case ICON_TYPES.RADIO:
      return <Radio className={iconColor} size={size} />;
    default:
      return <CheckCircle className={iconColor} size={size} />;
  }
};
