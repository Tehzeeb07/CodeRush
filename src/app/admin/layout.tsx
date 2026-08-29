
"use client";

import { ReactNode, useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminGuard } from "@/components/admin/AdminGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setMobile(isMobile);
      setSidebarOpen(!isMobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <AdminGuard>
      <div className="flex h-screen w-full overflow-hidden bg-[#070B14] text-white">
        {/* Mobile backdrop */}
        {mobile && sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}

        <AdminSidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          mobile={mobile}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AdminHeader onMenuToggle={toggleSidebar} />

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#070B14]">
            <div className="mx-auto w-full max-w-[1900px] p-3 sm:p-4 md:p-5 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

