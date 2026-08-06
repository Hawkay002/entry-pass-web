// lib/google-wallet.ts — Google Wallet "Save to Wallet" JWT generation.
// Creates an eventTicket pass object and signs it as a JWT using the Firebase
// service account key (which is also a valid Google service account).
//
// Requirements:
//   - GOOGLE_WALLET_PASS_CLASS_ID env var set (from Google Pay & Wallet Console)
//   - The service account must be authorized in the Google Pay Console
//
// If the pass class isn't configured, the API returns { ok: false } and the
// button shows "Coming Soon" on the client.

import { authConfig } from "@/lib/env";
import crypto from "crypto";

const ISSUER_ID = String(authConfig.serviceAccount.client_email ?? "");

interface PassObjectPayload {
  id: string;
  classId: string;
  ticketHolderName: string;
  ticketNumber: string;
  barcode: {
    kind: "walletobjects#barcode";
    type: "qrCode";
    value: string;
    alternateText?: string;
  };
  genericType?: string;
}

interface JwtPayload {
  iss: string;
  aud: "google";
  typ: "savetoandroidpay";
  payload: {
    eventTicketObjects: PassObjectPayload[];
  };
  origins?: string[];
}

/** Sign a JWT using the service account private key (RS256). */
function signJwt(payload: JwtPayload): string {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encodedHeader}.${encodedPayload}`;

  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(authConfig.serviceAccount.private_key as string, "utf-8"),
    format: "pem",
  });

  const signature = crypto.sign("RSA-SHA256", Buffer.from(token), privateKey);
  const encodedSignature = signature.toString("base64url");

  return `${token}.${encodedSignature}`;
}

/**
 * Generate a Google Wallet "Save" URL for a ticket.
 * Returns null if the pass class isn't configured.
 */
export function generateWalletUrl(
  ticketId: string,
  name: string,
  typeLabel: string,
  eventName: string,
  passClassId: string
): string | null {
  if (!passClassId) return null;

  const objectId = `${passClassId}.${ticketId}`;

  const payload: JwtPayload = {
    iss: ISSUER_ID,
    aud: "google",
    typ: "savetoandroidpay",
    payload: {
      eventTicketObjects: [
        {
          id: objectId,
          classId: passClassId,
          ticketHolderName: name,
          ticketNumber: ticketId,
          barcode: {
            kind: "walletobjects#barcode",
            type: "qrCode",
            value: ticketId,
            alternateText: typeLabel,
          },
        },
      ],
    },
  };

  const jwt = signJwt(payload);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
