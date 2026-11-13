const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bookstore API docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
      .swagger-ui .info .title { color: #a03037; }
      .swagger-ui .opblock-tag { color: #2a2a2a; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          withCredentials: true,
          persistAuthorization: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: "BaseLayout",
        });
      };
    </script>
  </body>
</html>`;

export async function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
