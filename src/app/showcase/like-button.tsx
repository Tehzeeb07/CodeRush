"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function LikeButton({ submissionId }: { submissionId: Id<"submissions"> }) {
  const count = useQuery(api.likes.countForSubmission, { submissionId });
  const liked = useQuery(api.likes.hasLiked, { submissionId });
  const toggle = useMutation(api.likes.toggle);

  return (
    <button
      onClick={() => toggle({ submissionId })}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
        liked
          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
          : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      <span>{liked ? "❤️" : "🤍"}</span>
      <span>{count ?? 0}</span>
    </button>
  );
}