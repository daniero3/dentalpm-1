// frontend/src/components/ui/sonner.jsx
// Wrapper minimal — utilise sonner directement sans Portal shadcn
import { Toaster as SonnerToaster } from "sonner";

const Toaster = (props) => (
  <SonnerToaster
    position={props.position || "top-right"}
    toastOptions={{
      duration: 4000,
      style: {
        background: '#fff',
        color: '#0F172A',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
      },
    }}
    {...props}
  />
);

export { Toaster };
