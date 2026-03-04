import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportForm } from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/");

  return <ReportForm />;
}
