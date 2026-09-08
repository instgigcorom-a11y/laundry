import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	// Keep every React consumer on the same runtime instance.
	resolve: { dedupe: ["react", "react-dom"] },
	server: { proxy: { "/api": "http://localhost:8080" } },
});
