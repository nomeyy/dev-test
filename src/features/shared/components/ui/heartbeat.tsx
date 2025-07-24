import React from "react";

interface HeartbeatProps {
  heartbeatKey: React.Key;
  className?: string;
}

export const Heartbeat: React.FC<HeartbeatProps> = ({
  heartbeatKey,
  className = "",
}) => (
  <span
    key={heartbeatKey}
    className={`animate-heartbeat inline-block h-[14px] w-[14px] rounded-full bg-[#4f8cff] shadow-[0_0_8px_#4f8cff] ${className}`}
  />
);
