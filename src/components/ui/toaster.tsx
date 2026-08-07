// @ts-nocheck
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "success") return <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
  if (variant === "destructive") return <XCircle className="h-5 w-5 text-white shrink-0" />
  if (variant === "warning") return <AlertTriangle className="h-5 w-5 text-white shrink-0" />
  return <Info className="h-5 w-5 shrink-0 text-foreground/70" />
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={5000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <ToastIcon variant={props.variant} />
            <div className="grid gap-0.5 flex-1 min-w-0">
              {title && <ToastTitle className="leading-tight">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="leading-tight opacity-90">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
