"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Search, Sparkles, Plus, Zap } from "lucide-react";

export interface Template {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  price: number | null;
  guest_limit: number | null;
  instructions: string | null;
  // ✅ এগুলো যোগ করুন
  created_at: string;
  created_by: string;
  custom_fields: any | null;
  organizer_contact_email: string | null;
  organizer_contact_phone: string | null;
  seat_limit: number | null;
  allow_late_registration: boolean;
  show_registered_list: boolean;
  show_phone_field: boolean;
  show_email_field: boolean;
  require_name: boolean;
  require_transaction_id: boolean;
  payment_methods: string[];
  payment_number: string | null;
  payment_instruction: string | null;
}

// TemplateSelectorProps
interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template | null) => void; // ✅ null allow
}

export const TemplateSelector = ({
  open,
  onClose,
  onSelect,
}: TemplateSelectorProps) => {
  const [search, setSearch] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["event-templates-user"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
    enabled: open,
  });

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const handleSelectTemplate = (template: Template | null) => {
    onSelect(template);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Event Templates
          </DialogTitle>
          <DialogDescription>
            Start with a template or create a blank event from scratch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Blank Event Option */}
          <Card
            className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => handleSelectTemplate(null)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Blank Event</p>
                <p className="text-sm text-muted-foreground">
                  Start from scratch with no preset values
                </p>
              </div>
              <Button size="sm" variant="outline">
                Create
              </Button>
            </CardContent>
          </Card>

          {/* Templates */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-3">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {template.title}
                        </CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button size="sm" variant="default" className="ml-2">
                        Use
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {template.venue && (
                        <Badge variant="secondary" className="gap-1">
                          <span className="text-xs">📍</span> {template.venue}
                        </Badge>
                      )}
                      {template.price && (
                        <Badge variant="secondary" className="gap-1">
                          <span className="text-xs">💰</span> ${template.price}
                        </Badge>
                      )}
                      {template.guest_limit && (
                        <Badge variant="secondary" className="gap-1">
                          <span className="text-xs">👥</span>{" "}
                          {template.guest_limit} guests
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No templates found</p>
              {search && (
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
