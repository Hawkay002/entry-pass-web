// app/page.tsx — root redirects to the ticket dashboard.
// The (app) layout + middleware enforce authentication; unauthenticated
// users get bounced to /login by the layout's getAppUser() redirect.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/tickets");
}
