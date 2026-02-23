"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  Users,
  CreditCard,
  Copy,
} from "lucide-react";
const defaultBanner = "/default-event-banner.jpeg";

interface CustomFieldPreview {
  field_name: string;
  field_type: string;
  field_options?: string[] | null;
  is_required: boolean;
}

interface EventPreviewProps {
  title: string;
  description: string;
  banner_url: string | null;
  venue: string;
  organizer_contact_email: string;
  organizer_contact_phone: string;
  price: string | number;
  registration_deadline: string;
  instructions: string;
  show_phone_field?: boolean;
  show_email_field?: boolean;
  seat_limit?: string | number;
  payment_methods?: string[];
  payment_number?: string;
  payment_instruction?: string;
  custom_fields?: CustomFieldPreview[];
}

const EventPreview = ({
  title,
  description,
  banner_url,
  venue,
  organizer_contact_email,
  organizer_contact_phone,
  price,
  registration_deadline,
  instructions,
  show_phone_field = true,
  show_email_field = true,
  seat_limit,
  payment_methods = [],
  payment_number,
  payment_instruction,
  custom_fields = [],
}: EventPreviewProps) => {
  const priceNum = Number(price) || 0;
  const hasDeadline = !!registration_deadline;
  const bannerSrc = banner_url || defaultBanner;
  const seatLimitNum = Number(seat_limit) || 0;

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-3 py-1.5 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          Live Preview
        </span>
      </div>

      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        {/* Banner */}
        <div className="w-full h-40 overflow-hidden relative">
          <img
            src={bannerSrc}
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="p-4 space-y-4">
          {/* Title & badges */}
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {title || "Untitled Event"}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {priceNum > 0 && (
                <Badge variant="secondary" className="text-xs">
                  ৳ {priceNum}
                </Badge>
              )}
              {seatLimitNum > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" /> {seatLimitNum} seats
                </Badge>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {venue}
              </span>
            )}
            {hasDeadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Deadline: {new Date(registration_deadline).toLocaleString()}
              </span>
            )}
            {organizer_contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {organizer_contact_email}
              </span>
            )}
            {organizer_contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {organizer_contact_phone}
              </span>
            )}
          </div>

          {/* Description */}
          {description && description !== "<p></p>" && (
            <div
              className="prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}

          {/* Instructions */}
          {instructions && instructions !== "<p></p>" && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-sm">Instructions & Rules</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div
                  className="prose prose-sm max-w-none text-xs"
                  dangerouslySetInnerHTML={{ __html: instructions }}
                />
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          {priceNum > 0 && payment_methods.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {payment_methods.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
                {payment_number && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Send to:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {payment_number}
                    </code>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {payment_instruction && (
                  <p className="text-xs text-muted-foreground">
                    {payment_instruction}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Registration Form Preview */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Registration Form</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-3">
              {/* Name - always shown */}
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="Enter your name"
                  disabled
                />
              </div>

              {show_phone_field && (
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    className="mt-1 h-8 text-xs"
                    placeholder="Phone number"
                    disabled
                  />
                </div>
              )}

              {show_email_field && (
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    className="mt-1 h-8 text-xs"
                    placeholder="Email address"
                    disabled
                  />
                </div>
              )}

              {/* Custom fields */}
              {custom_fields.map((field, i) => (
                <div key={i}>
                  <Label className="text-xs">
                    {field.field_name} {field.is_required && "*"}
                  </Label>
                  {field.field_type === "text" && (
                    <Input
                      className="mt-1 h-8 text-xs"
                      placeholder={`Enter ${field.field_name.toLowerCase()}`}
                      disabled
                    />
                  )}
                  {field.field_type === "number" && (
                    <Input
                      className="mt-1 h-8 text-xs"
                      type="number"
                      placeholder="0"
                      disabled
                    />
                  )}
                  {field.field_type === "select" && (
                    <Select disabled>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue
                          placeholder={`Select ${field.field_name.toLowerCase()}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {field.field_options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.field_type === "checkbox" && (
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox disabled />
                      <span className="text-xs text-muted-foreground">
                        {field.field_name}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Transaction ID if paid */}
              {priceNum > 0 && (
                <div>
                  <Label className="text-xs">
                    Transaction ID{" "}
                    {payment_methods.length > 0
                      ? `(${payment_methods.join("/")})`
                      : ""}
                  </Label>
                  <Input
                    className="mt-1 h-8 text-xs"
                    placeholder="Enter transaction ID"
                    disabled
                  />
                </div>
              )}

              <Button size="sm" disabled className="w-full opacity-70 mt-2">
                Register Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
