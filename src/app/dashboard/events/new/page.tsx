"use client";

import { Suspense } from "react";
import EventForm from "@/components/dashboard/EventForm";

export default function EventPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventForm />
    </Suspense>
  );
}
