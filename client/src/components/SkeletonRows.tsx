import { Skeleton } from "./Skeleton";

interface SkeletonRowsProps {
  count?: number;
  columns?: number;
  height?: string;
}

export function SkeletonRows({ count = 5, columns = 4, height = "h-4" }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "contents" }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={`${height} w-full`} />
          ))}
        </div>
      ))}
    </>
  );
}
