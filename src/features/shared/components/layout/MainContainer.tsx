import { cn } from "@/shared/utils";
import { type HTMLAttributes } from "react";

interface MainContainerProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

const MainContainer = ({
  children,
  className,
  ...props
}: MainContainerProps) => {
  return (
    <main
      {...props}
    >
      {children}
    </main>
  );
};

export default MainContainer;
