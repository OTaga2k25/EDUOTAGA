import { Hammer } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Videos | edUOtaga",
  description: "Video tutorials are coming soon.",
};

export default function VideosPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
      <div className="rounded-full bg-primary/10 p-6 mb-6">
        <Hammer className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">Under Construction</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        We are working hard to bring you high-quality video tutorials for all our experiments. Check back soon!
      </p>
    </div>
  );
}
