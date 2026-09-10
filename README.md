<div align="center">
  <h1>🚀 PortShare</h1>
  <p><b>Blazing fast, secure tunnels to expose your local development environment to the world.</b></p>
  
  [![Release](https://img.shields.io/github/v/release/jagadesh31/Portshare?style=flat-square&color=8b5cf6)](https://github.com/jagadesh31/Portshare/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
</div>

<br />

PortShare is a modern, developer-first alternative to tools like ngrok. It allows you to instantly securely expose your local web servers to the internet using a beautifully designed Desktop App or a lightweight, fast CLI.

Built with **Go**, **Next.js**, and **Electron**.

![PortShare Preview](https://portshare.kexoz.dev/assets/preview.png)

## ✨ Features

- **🚀 Instant Tunnels:** Expose local ports via secure WebSockets in milliseconds.
- **💻 Premium Desktop Client:** A beautiful, native Windows app to manage your tunnels visually.
- **⚡️ Go CLI:** A lightweight, headless CLI for server environments and power users.
- **🔒 Google Auth Walls:** Require visitors to authenticate with Google before they can access your tunnel.
- **🌐 Custom Domains:** Map your own domain names directly to your local environments.
- **📊 Real-time Request Log:** Monitor incoming traffic, methods, and status codes live.

---

## 🛠️ Getting Started

### Option 1: Desktop App (Recommended)
1. Navigate to the [Releases](https://github.com/jagadesh31/Portshare/releases) page.
2. Download the latest `PortShare-Setup.exe`.
3. Install and run! The app will automatically configure your client identity.

### Option 2: Go CLI
Download the CLI binary from the releases page, or build it from source:

```bash
# Expose a local port
portshare http 3000

# Claim a custom managed subdomain
portshare domain claim my-app

# Map your own custom root domain
portshare domain custom app.mydomain.com
```

---

## 🏗️ Architecture

PortShare is built as a monorepo containing three core components:

1. **/server**
   - A high-performance Go API and WebSocket reverse-proxy server using `gin-gonic` and `gorilla/websocket`. 
   - Handles dynamic subdomain routing, client authentication, and byte-streaming.
2. **/desktop**
   - An Electron + Vite + React 19 application.
   - Features a premium UI with a built-in request inspector.
3. **/website**
   - A modern Next.js 15 marketing site.
   - Used for user onboarding and premium tier checkouts.
4. **/cli**
   - A lightweight `cobra` based Go CLI to spin up tunnels without a GUI.

---

## 🔐 Security & Trust

As developers, we know that exposing local ports is a sensitive operation. PortShare is built entirely **open-source**. 
- The tunnel proxying logic in `server/` is completely transparent.
- All connections are end-to-end encrypted over WSS (WebSocket Secure) and HTTPS.
- You can review the code, audit the binaries, and even host the server component yourself!

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a Pull Request if you'd like to improve the Desktop UI, optimize the Go reverse proxy, or add new CLI features.

## 👨‍💻 Author

Built by [Kexoz](https://kexoz.dev) ([@jagadesh31](https://github.com/jagadesh31)).
