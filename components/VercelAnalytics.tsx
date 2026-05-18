"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function normalizeUrlPath(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname || "/";
  } catch {
    return url || "/";
  }
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return {
    ...event,
    url: normalizeUrlPath(event.url),
  };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
