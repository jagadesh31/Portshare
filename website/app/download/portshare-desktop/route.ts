import { NextResponse } from "next/server";

// Stable, version-less asset names produced by .github/workflows/release.yaml
// so releases/latest/download/<name> always resolves.
const PLATFORM_ASSETS: Record<string, string> = {
  "windows-x64": "PortShare-windows-x64-setup.exe",
  "windows-arm64": "PortShare-windows-arm64.zip",
  "macos-x64": "PortShare-macos-x64.zip",
  "macos-arm64": "PortShare-macos-arm64.zip",
  "linux-x64-deb": "portshare-linux-x64.deb",
  "linux-x64-rpm": "portshare-linux-x64.rpm",
  "linux-x64-zip": "PortShare-linux-x64.zip",
  "linux-arm64-deb": "portshare-linux-arm64.deb",
  "linux-arm64-rpm": "portshare-linux-arm64.rpm",
  "linux-arm64-zip": "PortShare-linux-arm64.zip",
};

// NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL points at a concrete release asset, e.g.
// https://github.com/<owner>/<repo>/releases/latest/download/PortShare-Setup.exe
// Strip the file name to get the release download directory.
function releasesBase(): string | null {
  const configured = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim();
  if (!configured) return null;
  const dir = configured.replace(/[^/]*$/, "");
  return dir || null;
}

export function GET(request: Request) {
  const base = releasesBase();
  if (!base) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL is not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "windows-x64";
  const asset = PLATFORM_ASSETS[platform];
  if (!asset) {
    return NextResponse.json(
      { message: `Unknown platform: ${platform}` },
      { status: 404 },
    );
  }

  try {
    const target = new URL(asset, base);
    if (target.protocol !== "https:") {
      throw new Error("Download URL must use HTTPS");
    }
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL must be a valid HTTPS URL" },
      { status: 500 },
    );
  }
}
