"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegistrationsRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/events/${params.id}/registrations`);
    }
  }, [params, router]);

  return null;
}
