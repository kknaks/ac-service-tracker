"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Upload, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin/upload", label: "배정/AS 비교", icon: Upload },
  { href: "/admin/contacts", label: "신규 접수", icon: Phone },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <div className="px-6 py-5">
            <h2 className="text-base font-semibold tracking-tight">
              A/C Service Tracker
            </h2>
          </div>
          <nav className="px-3 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? "bg-muted font-medium" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
