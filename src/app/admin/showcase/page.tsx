"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, Star, MessageSquare } from "lucide-react";

export default function AdminShowcasePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const data = useQuery(api.showcase.adminListShowcase, {
    search: search || undefined,
    page,
    pageSize: 12,
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Showcase Management</h1>
        <p className="mt-1 text-sm text-slate-400">Moderate and manage user showcase posts</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <div key={post._id} className="rounded-xl border border-slate-700/50 bg-[#1E293B] overflow-hidden">
            {post.imageUrl && (
              <div className="h-32 bg-slate-700/50 flex items-center justify-center">
                {/* User-submitted showcase images come from arbitrary hosts; using next/image
                    would require wildcard remotePatterns (open image-proxy risk). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${post.featured ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"}`}>
                  {post.featured ? "Featured" : "Normal"}
                </span>
                <div className="flex items-center gap-1">
                  <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white">
                    <Eye size={14} />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-amber-400">
                    <Star size={14} />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="mt-2 font-semibold text-white line-clamp-1">{post.title}</h3>
              <p className="mt-1 text-sm text-slate-400 line-clamp-2">{post.description}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-700/50 pt-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{post.authorName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Star size={12} /> {post.likes ?? 0}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.comments ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {page * 12 + 1} to {Math.min((page + 1) * 12, total)} of {total} posts
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

