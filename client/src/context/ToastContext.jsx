import { Toaster } from "react-hot-toast";

export function ToastProvider({ children }) {
  return <>
    {children}
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 4200,
        style: {
          background: "#fffdf9",
          color: "#214434",
          border: "1px solid #cfe3d4",
          borderRadius: "14px",
          boxShadow: "0 14px 30px rgba(20, 54, 42, .18)",
          fontFamily: '"Archivo", "DM Sans", sans-serif',
          fontSize: "13px",
          fontWeight: 800,
          maxWidth: "360px"
        },
        success: { iconTheme: { primary: "#1e6d42", secondary: "#fff" } },
        error: { iconTheme: { primary: "#bd351f", secondary: "#fff" } }
      }}
    />
  </>;
}
