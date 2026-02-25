import { redirect } from "next/navigation";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  redirect(
    template
      ? `/dashboard/events/new?template=${template}`
      : "/dashboard/events/new",
  );
}
