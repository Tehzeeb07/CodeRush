"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PostForm from "../../../../components/talent-connect/PostForm";

export default function NewTalentConnectPostPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Talent Connect
        </button>
        <h1 className="text-3xl font-bold tracking-tight">
          New Talent Connect Post
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Describe a real-world project or technical requirement so talented
          developers can submit professional proposals. Posts start as
          drafts — publish when you are ready.
        </p>
      </div>

      <PostForm mode="create" />
    </div>
  );
}
