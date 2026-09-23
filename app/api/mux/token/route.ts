import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const playbackId = String(
      body.playbackId ?? ""
    ).trim();

    if (!playbackId) {
      return NextResponse.json(
        { error: "playbackId is required" },
        { status: 400 }
      );
    }

    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const privateKey =
      process.env.MUX_SIGNING_PRIVATE_KEY;

    if (!keyId || !privateKey) {
      return NextResponse.json(
        { error: "Mux signing keys missing" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        sub: playbackId,
        aud: "v",
      },
      privateKey.replace(/\\n/g, "\n"),
      {
        algorithm: "RS256",
        keyid: keyId,
        expiresIn: "4h",
      }
    );

    return NextResponse.json({
      token,
    });
  } catch (error) {
    console.error("MUX_TOKEN_ERROR", error);

    return NextResponse.json(
      {
        error: "Failed to generate token",
      },
      {
        status: 500,
      }
    );
  }
}
