import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; message: string }
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

const icon = { success: <CheckCircle2 size={18} className="text-mint-600" />, error: <XCircle size={18} className="text-rose-600" />, info: <Info size={18} className="text-indigo-600" /> };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="card flex animate-slideIn items-start gap-3 p-3 text-sm font-medium">
            {icon[t.kind]}<span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
