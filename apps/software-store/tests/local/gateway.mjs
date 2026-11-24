import http from "node:http";
const routes = [
  ["/auth/v1", 55499],
  ["/rest/v1", 55430],
  ["/storage/v1", 55500],
];
http
  .createServer((req, res) => {
    const matched = routes.find(([path]) => req.url.startsWith(path));
    if (!matched) {
      res.writeHead(404);
      res.end();
      return;
    }
    const [prefix, port] = matched;
    const target = http.request(
      {
        host: "127.0.0.1",
        port,
        path: req.url.slice(prefix.length) || "/",
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${port}` },
      },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      },
    );
    target.on("error", () => {
      res.writeHead(503);
      res.end("Local upstream unavailable");
    });
    req.pipe(target);
  })
  .listen(55431, "127.0.0.1", () =>
    process.stdout.write("Local test gateway listening on 55431\n"),
  );
