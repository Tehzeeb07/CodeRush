"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { motion } from "framer-motion";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ArrowLeft, Target, Building2, Loader2 } from "lucide-react";
import ProposalForm from "../../../../components/talent-connect/ProposalForm";

export default function SubmitProposalPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id as Id<"talentConnectPosts">;

  const post = useQuery(api.talentConnectPosts.getPublished, { id: postId });
  const mySubmission = useQuery(api.talentConnectSubmissions.getMine, {
    postId,
  });

  const loading =
    post === undefined || mySubmission === undefined;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#07090d] text-sm text-slate-600">
        <Loader2 size={18} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (post === null || mySubmission) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07090d] px-4 text-center text-slate-400">
        <Target size={36} className="text-slate-700" />
        <p>
          {post === null
            ? "Talent Connect post not found."
            : "You have already submitted a proposal for this Talent Connect post."}
        </p>
        <Link
          href={post === null ? "/talent-connect" : "/dashboard/talent-connect"}
          className="text-sm text-amber-400 hover:underline"
        >
          {post === null
            ? "← Back to Talent Connect"
            : "→ Go to My Talent Connect"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] h-[400px] w-[400px] rounded-full bg-violet-600/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <div className="mb-8">
          <Link
            href={`/talent-connect/${postId}`}
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to post
          </Link>
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-amber-400/[0.05] px-3 py-1.5">
            <Target size={13} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
              Talent Connect Proposal
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
            Submit Your Proposal
          </h1>

          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#0d1118] p-5">
            <p className="text-sm font-bold text-white">{post.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 size={12} />
              {post.companyName}
            </p>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 sm:p-8"
        >
          <ProposalForm postId={postId} />
        </motion.div>
      </div>
    </div>
  );
}
