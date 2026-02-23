"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/events/${params.id}`);
    }
  }, [params, router]);

  return null;
}
