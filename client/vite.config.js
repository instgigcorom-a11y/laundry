import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicPages } from "./src/data/publicPages.js";

function previewRoutes() {
	return {
		name: "preview-static-routes",
		configurePreviewServer(server) {
			server.middlewares.use((request, response, next) => {
				const url = new URL(request.url, "http://localhost");
				const page = publicPages.find(page => page.path !== "/" && page.path.slice(0, -1) === url.pathname);
				if (page) {
					response.writeHead(301, { Location: page.path + url.search });
					return response.end();
				}
				// Mirror the deployment fallback for existing interactive routes.
				if (/^\/(products|login|register|forgot-password|cart|schedule|addresses|payment-method|confirmation|orders|account|payment|admin)(\/|$)/.test(url.pathname)) {
					response.setHeader("Content-Type", "text/html; charset=utf-8");
					return response.end(readFileSync(resolve(server.config.root, server.config.build.outDir, "app.html")));
				}
				next();
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), previewRoutes()],
	// Keep every React consumer on the same runtime instance.
	resolve: { dedupe: ["react", "react-dom"] },
	build: { sourcemap: true },
	server: {
		proxy: {
			"/api": "http://localhost:8080",
			"/socket.io": { target: "http://localhost:8080", ws: true },
		},
	},
});
