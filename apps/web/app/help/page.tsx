import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support | edUOtaga",
  description: "Get help and support for edUOtaga.",
};

export default function HelpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-6 mb-6">
        <LifeBuoy className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">Help Center</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Our support portal is currently being set up. If you need immediate assistance, please reach out via our GitHub repository.
      </p>
    </div>
  );
}
