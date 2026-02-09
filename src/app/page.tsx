"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/contexts/auth";

export default function Home() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <AuthForm />
      </div>
    );
  }
  
  return <AppShell />;
}