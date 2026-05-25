"use client";

import { useEffect } from "react";
import { startClientKeepAlive } from "@/lib/keepAlive";

export default function KeepAliveProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => startClientKeepAlive(), []);
  return <>{children}</>;
}
