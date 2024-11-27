const { createBareServer } = require("@tomphttp/bare-server-node");
const express = require("express");
const { createServer } = require("node:http");
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { hostname } = require("node:os");
const path = require("path");

const bare = createBareServer("/bare/");
const app = express();

// Ensure the public folder is properly referenced
const publicPath = path.join(__dirname, "..", "public"); // Assuming 'public' is at the root level

app.use(express.static(publicPath)); // Serve static files from 'public' directory
app.use("/uv/", express.static(uvPath)); // Serve static files from UV path

// Serve custom 404 page
app.get('*', function (req, res) {
  res.status(404).sendFile(path.join(publicPath, "404.html")); // Correct path for 404.html
});

const server = createServer((req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res); // Pass the request to Express if it's not for Bare
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

let port = parseInt(process.env.PORT || "8080"); // Default to 8080 if no PORT environment variable is set
if (isNaN(port)) port = 8080; // Fallback to 8080 if the port is invalid

server.on("listening", () => {
  const address = server.address();

  // Log server addresses
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

// Graceful shutdown
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    bare.close(); // Close Bare server cleanly
    console.log("Server shut down gracefully.");
    process.exit(0); // Exit the process
  });
}

server.listen({
  port, // Start server on the specified port
});