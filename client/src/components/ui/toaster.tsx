import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 w-full md:max-w-[420px] p-4 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className={`
            pointer-events-auto w-full overflow-hidden rounded-lg border shadow-lg
            ${toast.variant === "destructive" 
              ? "border-red-500 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50" 
              : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50"
            }
          `}
        >
          <div className="p-4">
            <div className="flex">
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-sm opacity-90">{toast.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}