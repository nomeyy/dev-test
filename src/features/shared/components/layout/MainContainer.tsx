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
      className={cn(
        `flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white`,
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
};

export default MainContainer;
