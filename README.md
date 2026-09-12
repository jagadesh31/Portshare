<div align="center">
  <h1>🚀 PortShare</h1>
  <p><b>Blazing fast, secure, and developer-first tunnels to expose your localhost to the world.</b></p>
  
  [![Release](https://img.shields.io/github/v/release/jagadesh31/Portshare?style=flat-square&color=111827)](https://github.com/jagadesh31/Portshare/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  [![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go)](https://golang.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Electron](https://img.shields.io/badge/Electron-Latest-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
</div>

<br />

PortShare is a modern, open-source alternative to tools like ngrok. It allows you to instantly and securely expose your local development servers to the internet. Whether you are demoing a frontend to a client, testing third-party webhooks (like Stripe or GitHub), or building integrations, PortShare provides a frictionless experience with a beautifully designed Desktop GUI and a powerful headless CLI.

---

## ✨ Key Features

- **🚀 Instant WebSockets Tunnels:** Expose local HTTP/HTTPS ports via secure WebSockets with near-zero latency.
- **💻 Premium Desktop Client:** A beautiful, native desktop app built with Electron and React. Features a clean light/dark UI, quick port selection, and real-time connection status.
- **⚡️ Go CLI:** A lightweight, headless CLI for server environments, CI/CD pipelines, and terminal power users.
- **🔎 Real-time Request Inspector:** Monitor incoming traffic, HTTP methods, headers, JSON bodies, and status codes live from the desktop dashboard.
- **🌐 Permanent & Custom Domains:** Claim a persistent subdomain (`your-app.portshare.dev`) or bring your own domain (BYOD) via CNAME records.
- **🔒 Google Auth Walls:** Protect sensitive local environments by requiring visitors to authenticate with a Google account before accessing the tunnel.
- **💳 Stripe Billing Integration:** Built-in tier management and automated bandwidth upgrades via secure Stripe webhooks.

---

## 🏗️ System Architecture

PortShare is built as a robust monorepo, separating concerns across four core components:

### 1. The Core Server (`/server`)
The brain of PortShare is a high-performance reverse proxy and tunneling server written in **Go**.
- **Tech Stack:** Go, Gin-Gonic HTTP Router, Gorilla WebSockets, PostgreSQL, Stripe-Go.
- **Functionality:** 
  - Manages secure persistent WebSocket connections with active clients.
  - Dynamically routes incoming HTTP requests on wildcard subdomains (`*.portshare.dev`) directly to the correct connected WebSocket client.
  - Handles byte-streaming, chunked transfer encoding, and HTTP hijacking.
  - Manages the PostgreSQL database for user bandwidth limits, custom domain mapping, and Stripe webhook synchronization.

### 2. The Desktop App (`/desktop`)
A cross-platform native application for developers who prefer visual management.
- **Tech Stack:** Electron, Vite, React 19, TypeScript, Tailwind CSS (Custom Design System).
- **Functionality:**
  - Connects to the Go server via WebSockets.
  - Proxies incoming tunnel requests to the local machine's `localhost:[PORT]`.
  - Captures and displays real-time request logs for debugging.
  - Manages client identity generation and local storage persistence.

### 3. The Marketing & Dashboard Website (`/website`)
A blazing-fast, static/server-rendered frontend.
- **Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS.
- **Functionality:**
  - Educates users and provides download links for the Windows binary.
  - Handles Stripe Checkout for premium upgrades.
  - Serves static legal pages (Terms, Privacy, Abuse Policy) and documentation.

### 4. The CLI (`/cli`)
For the terminal enthusiasts.
- **Tech Stack:** Go, Cobra.
- **Functionality:** Connects to the Go server and manages tunnels silently in the background.

---

## 🚀 Getting Started

### Prerequisites
If you intend to run the entire stack locally for development:
- **Go** (v1.22+)
- **Node.js** (v20+)
- **PostgreSQL** (Running locally or via Docker)

### Running the Go Server
```bash
cd server
# Ensure dependencies are tidy
go mod tidy

# Run the server
go run cmd/api/main.go
```
*Note: The server requires environment variables for PostgreSQL (`DATABASE_URL`) and Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).*

### Running the Next.js Website
```bash
cd website
npm install
npm run dev
```
*The site will be available at `http://localhost:3000`.*

### Running the Desktop Client
```bash
cd desktop/frontend
# copy .env.example to .env if needed
npm install
cd ../electron
npm install
cd ..
npm run dev
```
*Vite serves the UI on port 5173 and Electron loads it. For a production installer: `cd desktop/electron && npm run make` (requires the same `VITE_*` env vars as CI).*

---

## 🔐 Security & Privacy

Exposing local ports to the public internet is inherently risky if not handled properly. PortShare is designed with security in mind:

1. **End-to-End Encryption:** All tunnel traffic is routed through `WSS` (WebSocket Secure) and standard `HTTPS`. Localhost traffic is never exposed unencrypted over the open internet.
2. **Interstitial Warnings:** To prevent abuse and protect domain reputation from automated phishing scanners, PortShare serves an interstitial warning ("You are about to visit a PortShare Tunnel") to unverified browsers accessing a tunnel for the first time.
3. **Identity Verification:** Clients generate a secure, unique identity upon first launch, ensuring tunnels cannot be hijacked.
4. **Abuse Monitoring:** Automated monitoring and rate-limiting are implemented at the server level to prevent bandwidth exhaustion and DDoS attacks.

---

## 🤝 Contributing

PortShare is open-source and we welcome contributions! Whether you want to optimize the Go byte-streaming, add a new feature to the Next.js website, or improve the Electron build process, your help is appreciated.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Built with ❤️ by <a href="https://kexoz.dev">Kexoz</a> (<a href="https://github.com/jagadesh31">@jagadesh31</a>)</b>
</div>
