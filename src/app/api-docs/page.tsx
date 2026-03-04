"use client";

import { useEffect, useRef } from "react";

/**
 * Swagger UI loaded from CDN and pointed at /openapi.yaml.
 * No extra dependency; works with public/openapi.yaml.
 */
export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      const win = window as unknown as {
        SwaggerUIBundle?: { setup: (config: { url: string; dom_id: string }) => void };
      };
      if (win.SwaggerUIBundle?.setup) {
        win.SwaggerUIBundle.setup({
          url: "/openapi.yaml",
          dom_id: "#swagger-ui",
        });
      }
    };
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    return () => {
      script.remove();
      link.remove();
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          API Documentation (OpenAPI 3.0)
        </h1>
      </header>
      <div id="swagger-ui" ref={containerRef} className="flex-1 p-4" />
    </div>
  );
}
