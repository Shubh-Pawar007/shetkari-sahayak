import "./globals.css";
import type { ReactNode } from "react";
import { currentOfficer } from "@/lib/auth.ts";
import { mr } from "@/lib/i18n.ts";

export const metadata = { title: "शेतकरी सहाय्यक", description: mr.tagline };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const o = await currentOfficer();
  return (
    <html lang="mr">
      <body>
        <header className="top">
          <div>
            <h1>{mr.appName}</h1>
            <small>{mr.tagline}</small>
          </div>
          {o && (
            <form action="/api/logout" method="post" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span>{o.name}</span>
              <button className="btn sec" type="submit">{mr.logout}</button>
            </form>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
