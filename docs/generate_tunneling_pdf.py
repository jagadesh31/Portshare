#!/usr/bin/env python3
"""Generate PortShare tunneling architecture PDF."""

from pathlib import Path

from fpdf import FPDF


OUT = Path(r"D:\projects\personal\PortShare\docs\PortShare-Tunneling-Explained.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 100, 110)
        self.cell(140, 8, "PortShare - How Tunneling Works", align="L")
        self.cell(0, 8, str(self.page_no()), align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(220, 220, 225)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(140, 140, 150)
        self.cell(0, 10, "Internal architecture notes - from PortShare source", align="C")


def h1(pdf: PDF, text: str):
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(15, 18, 24)
    pdf.multi_cell(0, 10, text)
    pdf.ln(2)


def h2(pdf: PDF, text: str):
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(20, 24, 32)
    pdf.multi_cell(0, 8, text)
    pdf.ln(1)


def h3(pdf: PDF, text: str):
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 35, 45)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)


def body(pdf: PDF, text: str):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 44, 52)
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(1.5)


def bullet(pdf: PDF, text: str, indent: float = 4):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 44, 52)
    x = pdf.l_margin + indent
    pdf.set_x(x)
    pdf.multi_cell(pdf.w - pdf.r_margin - x, 5.5, f"-  {text}")


def mono_block(pdf: PDF, lines: list[str]):
    pdf.set_fill_color(245, 246, 248)
    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(30, 35, 45)
    pdf.ln(1)
    for line in lines:
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 5, "  " + line[:110], fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)


def simple_table(pdf: PDF, headers: list[str], rows: list[list[str]], col_w: list[float]):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(232, 234, 238)
    pdf.set_text_color(20, 24, 32)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, f" {h}", border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 44, 52)
    alt = False
    for row in rows:
        if pdf.get_y() > pdf.h - 30:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(232, 234, 238)
            for i, h in enumerate(headers):
                pdf.cell(col_w[i], 7, f" {h}", border=1, fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8.5)
        pdf.set_fill_color(248, 248, 250) if alt else pdf.set_fill_color(255, 255, 255)
        alt = not alt
        line_h = 4.8
        max_lines = 1
        for i, cell in enumerate(row):
            lines = pdf.multi_cell(col_w[i], line_h, f" {cell}", dry_run=True, output="LINES")
            max_lines = max(max_lines, len(lines))
        row_h = max_lines * line_h + 2
        x = pdf.l_margin
        y = pdf.get_y()
        for i, cell in enumerate(row):
            pdf.set_xy(x, y)
            pdf.rect(x, y, col_w[i], row_h, style="DF")
            pdf.set_xy(x, y + 1)
            pdf.multi_cell(col_w[i], line_h, f" {cell}")
            x += col_w[i]
        pdf.set_y(y + row_h)
    pdf.ln(3)


def main():
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    pdf.ln(28)
    pdf.set_xy(pdf.l_margin, pdf.get_y())
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(15, 18, 24)
    pdf.cell(0, 12, "PortShare", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(70, 76, 88)
    pdf.cell(0, 9, "How Tunneling Works", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_draw_color(15, 159, 110)
    pdf.set_line_width(0.8)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 40, pdf.get_y())
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(50, 55, 65)
    pdf.multi_cell(
        0,
        6.5,
        "A practical explanation of the main tunneling logic: how a local port becomes a public HTTPS URL, how requests travel through the system, and what is permanent vs temporary.",
    )
    pdf.ln(6)
    body(
        pdf,
        "Audience: engineers reading the monorepo. Based on the current PortShare code (Go server, desktop Electron client, CLI).",
    )

    pdf.add_page()
    h1(pdf, "1. What PortShare is")
    body(
        pdf,
        "PortShare is a reverse tunnel system. You run an app on localhost (for example port 3000). A small client on your machine opens a persistent connection to the PortShare server. The server gives you a public URL like:",
    )
    mono_block(pdf, ["https://your-service.portshare.kexoz.dev"])
    body(
        pdf,
        "When someone opens that URL, the server does not host your app. It forwards the HTTP request over the tunnel to your machine, your client hits localhost, and the response is sent back to the visitor.",
    )

    h2(pdf, "Pieces of the system")
    simple_table(
        pdf,
        ["Component", "Role"],
        [
            ["server/ (Go + Gin)", "Public reverse proxy, identity DB, WebSocket/SSH tunnels"],
            ["desktop/ (Electron)", "Primary client: claim subdomain, hold tunnel, proxy to localhost"],
            ["cli/", "Headless client with the same WebSocket tunnel protocol"],
            ["website/ (Next.js)", "Marketing / download / pricing - not on the request path"],
        ],
        [55, 120],
    )

    h2(pdf, "2. High-level architecture")
    mono_block(
        pdf,
        [
            "Visitor --HTTPS--> PortShare server --WS JSON--> Desktop/CLI --HTTP--> localhost:PORT",
            "                        |",
            "                        +-- Postgres (clientId, subdomain, custom domain, plan)",
            "                        +-- In-memory live tunnel connections",
        ],
    )
    body(
        pdf,
        "There is also an SSH reverse-tunnel path (ssh -R) into the same server. Desktop and CLI use WebSocket; SSH is an alternate transport that still ends at localhost on the user's machine.",
    )

    h1(pdf, "3. Connection flow (claim -> connect -> expose)")
    h3(pdf, "Step 1 - Identity")
    body(
        pdf,
        "The client calls POST /client/identity. If it already has a stored clientId, the server returns that record. Otherwise it creates a new 32-character hex ID (free plan, bandwidth quota). Desktop stores the ID in localStorage; CLI stores it under ~/.portshare/config.json. There is no email login for tunnel ownership - possession of clientId is the credential.",
    )

    h3(pdf, "Step 2 - Claim a subdomain")
    body(
        pdf,
        'The client checks availability (GET /subdomain/check) then claims (POST /subdomain/claim) with { clientId, subdomain }. Names are lowercase alphanumeric/hyphen, length-limited. Reserved names like "api" are blocked. The mapping is stored in Postgres and is permanent until changed.',
    )

    h3(pdf, "Step 3 - Open the tunnel")
    body(
        pdf,
        "The client opens a WebSocket to /tunnel/connect?clientId=.... The server registers that socket in an in-memory tunnel store (replacing any older socket for the same ID). Keepalive pings keep the connection healthy; the desktop reconnects with backoff if it drops.",
    )

    h3(pdf, "Step 4 - Point at a local port")
    body(
        pdf,
        "PUT /client/port stores the chosen port for UI/resume. Actual forwarding uses the port the client holds locally. The server sends each public request to the client; the client fetches http://127.0.0.1:{port} and returns the result.",
    )

    h1(pdf, "4. What happens on a public request")
    body(pdf, "When a visitor hits https://{subdomain}.{root}/path:")
    bullet(pdf, "Gin receives the HTTP request (NoRoute -> HandlePublicTunnel).")
    bullet(pdf, "clientForHost(Host) resolves subdomain or custom domain -> clientId.")
    bullet(pdf, "If the tunnel is offline -> error page/JSON.")
    bullet(pdf, "Optional gates: rate limit, interstitial cookie, Google auth wall, bandwidth quota.")
    bullet(pdf, "Server builds a tunnelRequest JSON message and sends it on the client's WebSocket.")
    bullet(pdf, "Client performs the local HTTP call and replies with tunnelResponse.")
    bullet(pdf, "Server writes status/headers/body back to the visitor.")
    pdf.ln(1)

    h3(pdf, "WebSocket message shapes")
    mono_block(
        pdf,
        [
            "# server -> client",
            '{ "id", "method", "path", "headers": { "Name": ["..."] }, "body": "<base64>" }',
            "",
            "# client -> server",
            '{ "id", "status", "headers", "body": "<base64>", "error"? }',
        ],
    )
    body(
        pdf,
        "Bodies are base64-encoded. Request bodies are capped (about 10 MiB). If the client does not answer within ~60s, the visitor gets a 504 timeout. Hop-by-hop headers are stripped so the proxy stays well-behaved.",
    )

    h3(pdf, "SSH alternate path")
    body(
        pdf,
        "With SSH reverse forwarding, the server opens a channel toward the client's forwarded local port and uses a reverse proxy over that channel instead of WebSocket JSON. The public Host -> client mapping is the same idea.",
    )

    h1(pdf, "5. Protocols and key code")
    simple_table(
        pdf,
        ["Layer", "Protocol"],
        [
            ["Visitor -> server", "HTTP(S)"],
            ["Control plane (identity, claim, port)", "REST JSON"],
            ["Desktop / CLI tunnel", "WebSocket + JSON request/response"],
            ["SSH tunnel", "SSH tcpip-forward / forwarded-tcpip"],
            ["Client -> local app", "HTTP to 127.0.0.1"],
        ],
        [70, 105],
    )

    h3(pdf, "Important files")
    simple_table(
        pdf,
        ["Path", "Purpose"],
        [
            ["server/cmd/api/main.go", "Routes, WS upgrade, public proxy, SSH"],
            ["server/internal/services/tunnel.go", "ConnectTunnel, HandlePublicTunnel, messages"],
            ["server/internal/services/client.go", "Identity, claim, port, custom domain"],
            ["server/internal/services/ssh_server.go", "SSH reverse tunnels"],
            ["desktop/frontend/src/lib/tunnel.ts", "WS client + local proxy"],
            ["desktop/electron/src/main.js", "Node localhost proxy for packaged app"],
            ["cli/tunnel/tunnel.go", "CLI WS client"],
        ],
        [75, 100],
    )

    h1(pdf, "6. Permanent vs ephemeral")
    simple_table(
        pdf,
        ["Permanent (Postgres)", "Ephemeral (memory / session)"],
        [
            ["clientId, subdomain, custom domain", "Live WebSocket / SSH connection"],
            ["Stored port, requireAuth, plan", "In-flight request waiters"],
            ["Bandwidth counters", "Reachability (online/offline)"],
        ],
        [88, 87],
    )
    body(
        pdf,
        "Marketing calls the claimed subdomain a permanent public URL. That is true for the name mapping. The live tunnel itself only works while the desktop/CLI (or SSH session) is connected - though the client reconnects automatically.",
    )

    h1(pdf, "7. Custom domains")
    body(
        pdf,
        "PUT /client/domain stores a custom hostname. Public traffic is matched by Host header. The product UI expects a CNAME from your domain to {subdomain}.{root}. DNS verification / automatic certificates are infrastructure concerns outside the core tunnel loop - the app logic is Host -> clientId -> tunnel.",
    )

    h1(pdf, "8. One-sentence mental model")
    body(
        pdf,
        "PortShare is a Host-based reverse proxy that multiplexes public HTTP over a long-lived WebSocket (or SSH) to a client that speaks plain HTTP to localhost - with a durable clientId and subdomain registry in Postgres.",
    )

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(110, 110, 120)
    pdf.multi_cell(0, 5, "Generated for the PortShare monorepo. Update this doc if tunnel.go / ConnectTunnel contracts change.")

    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()
