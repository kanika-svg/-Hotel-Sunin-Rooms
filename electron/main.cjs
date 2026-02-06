const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const http = require("http");
const net = require("net");
const crypto = require("crypto");

const PORT_DEFAULT = 5000;
const PORT_MAX_ATTEMPTS = 11; // try 5000..5010

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      if (port >= startPort + PORT_MAX_ATTEMPTS) {
        resolve(null);
        return;
      }
      const server = net.createServer(() => {});
      server.once("error", () => {
        server.close(() => tryPort(port + 1));
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port, "127.0.0.1");
    };
    tryPort(startPort);
  });
}

function getAppPath() {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, "..");
}

function waitForServer(serverUrl, expectedToken, maxAttempts = 50) {
  const readyUrl = serverUrl.replace(/\/$/, "") + "/api/ready";
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      const req = http.get(readyUrl, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            retryOrReject();
            return;
          }
          try {
            const body = JSON.parse(data);
            if (body.token === expectedToken) {
              resolve();
              return;
            }
          } catch (_) {}
          retryOrReject();
        });
      });
      function retryOrReject() {
        if (attempts >= maxAttempts) {
          reject(new Error("Server did not respond in time"));
          return;
        }
        setTimeout(tryConnect, 300);
      }
      req.on("error", () => retryOrReject());
      req.setTimeout(5000, () => { req.destroy(); retryOrReject(); });
    };
    setTimeout(tryConnect, 500);
  });
}

function createWindow(serverUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Hotel Sunin Rooms",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  win.loadURL(serverUrl);
  win.once("ready-to-show", () => win.show());

  win.on("closed", () => {
    app.quit();
  });
}

function showError(title, message) {
  dialog.showMessageBoxSync({
    type: "error",
    title: title || "Hotel Sunin Rooms",
    message: message || "An error occurred.",
  });
}

app.whenReady().then(async () => {
  const appPath = getAppPath();
  try {
    process.chdir(appPath);
  } catch (e) {
    showError("Startup Error", "Could not set working directory: " + e.message);
    app.quit();
    return;
  }
  process.env.NODE_ENV = "production";
  if (app.isPackaged) {
    process.env.HOTEL_SUNIN_DATA_DIR = app.getPath("userData");
  }

  const freePort = await findFreePort(PORT_DEFAULT);
  if (freePort === null) {
    showError(
      "Port in use",
      "Ports 5000–5010 are in use. Close other copies of Hotel Sunin Rooms (or any app using these ports) and try again."
    );
    app.quit();
    return;
  }
  process.env.PORT = String(freePort);
  const readinessToken = crypto.randomBytes(16).toString("hex");
  process.env.HOTEL_SUNIN_READINESS_TOKEN = readinessToken;
  const serverUrl = `http://127.0.0.1:${freePort}`;

  let serverModulePath;
  if (app.isPackaged) {
    serverModulePath = path.join(process.resourcesPath, "app.asar", "dist", "index.cjs");
  } else {
    serverModulePath = path.join(__dirname, "..", "dist", "index.cjs");
  }

  try {
    require(serverModulePath);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const friendly = msg.includes("EADDRINUSE")
      ? "Port " + freePort + " is in use. Close other copies of Hotel Sunin Rooms and try again."
      : msg;
    showError("Failed to start server", friendly);
    app.quit();
    return;
  }

  waitForServer(serverUrl, readinessToken)
    .then(() => {
      createWindow(serverUrl);
    })
    .catch((err) => {
      showError("Server did not start", (err && err.message) ? err.message : "The app could not connect. Close any other copy of Hotel Sunin Rooms and try again.");
      app.quit();
    });
});

app.on("window-all-closed", () => {
  app.quit();
});
