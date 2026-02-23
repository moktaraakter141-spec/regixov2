import { redirect } from "next/navigation";

export default function NewEventPage() {
  redirect("/dashboard/events/new");
}
