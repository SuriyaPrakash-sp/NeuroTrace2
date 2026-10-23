import { Skeleton } from "./Skeleton";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className ?? ""}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm text-navy-700">{message}</p>
    </div>
  );
}

export default LoadingState;
