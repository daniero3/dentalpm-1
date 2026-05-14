import { cn } from "../../lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("dpm-skeleton rounded-md", className)}
      {...props} />
  );
}

export { Skeleton }
