import { NextResponse } from "next/server";

export function GET(request: Request) {
  const downloadUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim();
  if (!downloadUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL is not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "windows-x64";

  // Current CI release only publishes the Windows x64 Squirrel installer.
  if (platform !== "windows-x64") {
    return NextResponse.json(
      { message: "This platform is not available yet" },
      { status: 404 },
    );
  }

  try {
    const target = new URL(downloadUrl);
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
