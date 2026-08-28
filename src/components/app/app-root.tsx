"use client";

import { useSession } from "next-auth/react";
import { Splash } from "@/components/app/splash";
import { AuthScreen } from "@/components/app/auth-screen";
import { AppShell } from "@/components/app/app-shell";

export function AppRoot() {
  const { status } = useSession();

  if (status === "loading") return <Splash />;
  if (status === "unauthenticated") return <AuthScreen />;
  return <AppShell />;
}
