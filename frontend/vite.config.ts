import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: [],
    },
    server: {
        proxy: {
            "/api": "http://localhost:8000",
        },
    },
});
