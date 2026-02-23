"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Ticket } from "lucide-react";
import html2canvas from "html2canvas";

interface TicketPDFProps {
  registration: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    registration_number?: string | null;
    guest_count?: number | null;
    status: string;
    created_at: string;
    tag?: string | null;
  };
  event: {
    title: string;
    venue?: string | null;
    banner_url?: string | null;
  };
}

const TicketPDF = ({ registration, event }: TicketPDFProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?reg_id=${registration.id}`
      : `/verify?reg_id=${registration.id}`;

  const downloadImage = useCallback(async () => {
    if (!ticketRef.current) return;
    const canvas = await html2canvas(ticketRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.download = `ticket-${registration.registration_number || registration.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [registration]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button onClick={downloadImage} className="gap-2 w-full max-w-xs">
          <Download className="h-4 w-4" /> Download Ticket
        </Button>
      </div>

      <div
        ref={ticketRef}
        className="bg-white text-gray-900 p-6 rounded-xl max-w-md mx-auto"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-dashed border-gray-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Ticket className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
              Event Ticket
            </p>
            <p className="font-bold text-lg leading-tight">{event.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
              Attendee
            </p>
            <p className="font-semibold">{registration.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
              Registration #
            </p>
            <p className="font-mono font-semibold text-amber-700">
              {registration.registration_number}
            </p>
          </div>
          {event.venue && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                Venue
              </p>
              <p className="font-semibold">{event.venue}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
              Status
            </p>
            <p
              className={`font-semibold capitalize ${
                registration.status === "approved"
                  ? "text-emerald-600"
                  : registration.status === "rejected"
                    ? "text-red-600"
                    : "text-amber-600"
              }`}
            >
              {registration.status}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
              Date
            </p>
            <p className="font-semibold">
              {new Date(registration.created_at).toLocaleDateString()}
            </p>
          </div>
          {(registration.guest_count ?? 0) > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                Guests
              </p>
              <p className="font-semibold">{registration.guest_count}</p>
            </div>
          )}
          {registration.tag && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                Tag
              </p>
              <p className="font-semibold capitalize text-indigo-600">
                {registration.tag}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center pt-4 border-t-2 border-dashed border-gray-200">
          <QRCodeSVG value={verifyUrl} size={120} level="M" />
          <p className="text-[10px] text-gray-400 mt-2">Scan to verify</p>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5">
          <span className="text-[9px] tracking-widest text-gray-300 font-medium">
            Powered by
          </span>
          <span className="text-[10px] font-bold tracking-tight text-gray-400">
            Regixo
          </span>
        </div>
      </div>
    </div>
  );
};

export default TicketPDF;
