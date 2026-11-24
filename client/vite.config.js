import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicPages } from "./src/data/publicPages.js";
import { isParameterizedAppPath, staticAppPaths } from "./src/data/appPaths.js";
import { catalogueRedirect, legacyRedirects } from "./src/data/redirects.js";

function previewRoutes() {
	return {
		name: "preview-static-routes",
		configurePreviewServer(server) {
			const output = resolve(server.config.root, server.config.build.outDir);
			server.middlewares.use((request, response, next) => {
				const url = new URL(request.url, "http://localhost");
				// Same permanent redirects as the Render dashboard rules.
				const moved = [...legacyRedirects, catalogueRedirect].find(([from]) => from === url.pathname);
				if (moved) {
					response.writeHead(301, { Location: moved[1] + url.search });
					return response.end();
				}
				const page = publicPages.find(page => page.path !== "/" && page.path.slice(0, -1) === url.pathname);
				if (page) {
					response.writeHead(301, { Location: page.path + url.search });
					return response.end();
				}
				// Mirror the deployment fallback for existing interactive routes.
				if (/^\/products\/?$/.test(url.pathname)) {
					response.setHeader("Content-Type", "text/html; charset=utf-8");
					return response.end(readFileSync(resolve(server.config.root, server.config.build.outDir, "products/index.html")));
				}
				if (staticAppPaths.includes(url.pathname.replace(/\/$/, "")) || isParameterizedAppPath(url.pathname)) {
					response.setHeader("Content-Type", "text/html; charset=utf-8");
					return response.end(readFileSync(resolve(output, "app.html")));
				}
				next();
			});
			return () => server.middlewares.use((request, response, next) => {
				const pathname = new URL(request.url, "http://localhost").pathname;
				if (pathname.endsWith(".html") && existsSync(resolve(output, `.${pathname}`))) return next();
				response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
				response.end(readFileSync(resolve(output, "404.html")));
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig(({ isPreview }) => ({
	appType: isPreview ? "mpa" : "spa",
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
}));
