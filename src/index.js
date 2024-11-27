const { createBareServer } = require("@tomphttp/bare-server-node");
const express = require("express");
const { createServer } = require("http");
import { SpeedInsights } from "@vercel/speed-insights/next"
const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
const { hostname } = require("os");
const path = require("path");

// Create Bare server instance
const bare = createBareServer("/bare/");
// Initialize Express app
const app = express();

// Ensure the 'public' folder is properly referenced
const publicPath = path.join(__dirname, "..", "public"); // Assuming 'public' is at the root level

// Serve static files from the 'public' directory
app.use(express.static(publicPath));

// Serve static files from UV path
app.use("/uv/", express.static(uvPath));

// Serve custom 404 page
app.use("*", (req, res) => {
  res.status(404).sendFile(path.join(publicPath, "404.html"));
});

// Create the HTTP server
const server = createServer((req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app.handle(req, res); // Pass the request to Express if it's not for Bare
  }
});

// Handle WebSocket upgrade
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

// Set the port, default to 8080 if not specified in environment variables
let port = parseInt(process.env.PORT || "8080", 10);
if (isNaN(port)) port = 8080;

// Log server address information when the server is listening
server.on("listening", () => {
  const address = server.address();
  const addressStr = address.family === "IPv6" ? `[${address.address}]` : address.address;
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(`\thttp://${addressStr}:${address.port}`);
});

// Graceful shutdown on SIGINT and SIGTERM
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

// Start the server
server.listen({
  port, // Start the server on the specified port
});