"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostForm from "../../../../../components/talent-connect/PostForm";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
} from "../../../../../components/talent-connect/constants";

export default function EditTalentConnectPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id as Id<"talentConnectPosts">;

  const post = useQuery(api.talentConnectPosts.adminGet, { id: postId });

  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117] text-sm text-slate-500">
        <Loader2 size={20} className="mr-3 animate-spin" />
        Loading…
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0F1117] text-slate-400">
        <p>Talent Connect post not found.</p>
        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect")}
          className="text-sm text-amber-400 hover:underline"
        >
          ← Back to Talent Connect
        </button>
      </div>
    );
  }

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
          Edit Talent Connect Post
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {post.title} · {difficultyLabel(post.difficultyLevel)} ·{" "}
          {experienceLabel(post.experienceLevel)} ·{" "}
          {post.submissionCount ?? 0} proposals · Created{" "}
          {formatDate(post.createdAt)}
        </p>
      </div>

      <PostForm
        mode="edit"
        postId={postId}
        initial={{
          title: post.title,
          shortDescription: post.shortDescription,
          fullDescription: post.fullDescription,
          requirements: post.requirements,
          requiredSkills: post.requiredSkills,
          category: post.category,
          difficultyLevel: post.difficultyLevel,
          experienceLevel: post.experienceLevel,
          companyName: post.companyName,
          compensationInfo: post.compensationInfo,
          deadline: post.deadline,
          tags: post.tags,
        }}
      />
    </div>
  );
}
