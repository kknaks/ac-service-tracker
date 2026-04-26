import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, Phone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth.actions";
import { MobileNav } from "@/components/admin/mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware 가 가드하지만 안전망
  if (!user) redirect("/login");

  return (
    <div className="min-h-svh flex bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 sticky top-0 h-svh flex-col border-r bg-background">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            A/C Service Tracker
          </h1>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavItem href="/admin/upload" icon={Upload}>
            배정/AS 비교
          </NavItem>
          <NavItem href="/admin/contacts" icon={Phone}>
            신규 접수
          </NavItem>
        </nav>
        <Separator />
        <div className="px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <MobileNav />
          <h1 className="text-base font-semibold">A/C Service Tracker</h1>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="로그아웃">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 md:p-8 mt-12 md:mt-0">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
