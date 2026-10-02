import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeading, Notice } from "@/components/ui";
import { SetupWizard } from "@/components/setup-wizard";
export default async function Setup() {
  if (!process.env.DATABASE_URL)
    return (
      <>
        <PageHeading title="Connect your community database" />
        <Notice>
          Set DATABASE_URL, run the database migrations and seed command, then
          return to setup. See README.md for deployment instructions.
        </Notice>
      </>
    );
  if (
    (await db.community.findUnique({ where: { id: "community" } }))
      ?.setupComplete
  )
    redirect("/");
  return (
    <>
      <PageHeading
        title="Welcome to your community."
        description="Configure Florida in a few steps."
      />
      <SetupWizard />
    </>
  );
}
