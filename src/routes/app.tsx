import { createFileRoute } from "@tanstack/react-router";
import appHtml from "../../public/pcf-app.html?raw";

export const Route = createFileRoute("/app")({
  server: {
    handlers: {
      GET: () => {
        return new Response(appHtml, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
