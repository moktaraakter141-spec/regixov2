"use client";

import React from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_options: string[] | null;
  is_required: boolean;
  sort_order: number;
}

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const CustomFieldsBuilder = React.forwardRef<
  HTMLDivElement,
  CustomFieldsBuilderProps
>(({ fields, onChange }, ref) => {
  const addField = () => {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      field_name: "",
      field_type: "text",
      field_options: null,
      is_required: false,
      sort_order: fields.length,
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  // Add a new empty option to a field
  const addOption = (fieldId: string, currentOptions: string[] | null) => {
    updateField(fieldId, { field_options: [...(currentOptions || []), ""] });
  };

  // Update a specific option by index
  const updateOption = (
    fieldId: string,
    options: string[],
    index: number,
    value: string,
  ) => {
    const updated = [...options];
    updated[index] = value;
    updateField(fieldId, { field_options: updated });
  };

  // Remove a specific option by index
  const removeOption = (fieldId: string, options: string[], index: number) => {
    const updated = options.filter((_, i) => i !== index);
    updateField(fieldId, {
      field_options: updated.length > 0 ? updated : [""],
    });
  };

  return (
    <div ref={ref} className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Custom Form Fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="mr-1 h-4 w-4" /> Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
          No custom fields added yet. Click "Add Field" to create one.
        </p>
      )}

      {fields.map((field) => (
        <Card key={field.id} className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Field Name</Label>
                    <Input
                      placeholder="e.g. T-Shirt Size"
                      value={field.field_name}
                      onChange={(e) =>
                        updateField(field.id, { field_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Field Type</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(val) =>
                        updateField(field.id, {
                          field_type: val,
                          // Initialize options for select/checkbox, clear for others
                          field_options:
                            val === "select" || val === "checkbox"
                              ? [""]
                              : null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── Options UI for Dropdown & Checkbox ── */}
                {(field.field_type === "select" ||
                  field.field_type === "checkbox") && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {field.field_type === "select"
                        ? "Dropdown Options"
                        : "Checkbox Options"}
                    </Label>

                    {(field.field_options || [""]).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Visual indicator */}
                        <span className="text-muted-foreground text-xs w-5 shrink-0">
                          {field.field_type === "checkbox"
                            ? "☐"
                            : `${idx + 1}.`}
                        </span>
                        <Input
                          className="h-8 text-sm"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateOption(
                              field.id,
                              field.field_options || [""],
                              idx,
                              e.target.value,
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            removeOption(
                              field.id,
                              field.field_options || [""],
                              idx,
                            )
                          }
                          disabled={(field.field_options || []).length <= 1}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => addOption(field.id, field.field_options)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.is_required}
                    onCheckedChange={(checked) =>
                      updateField(field.id, { is_required: checked })
                    }
                  />
                  <Label className="text-xs">Required</Label>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

CustomFieldsBuilder.displayName = "CustomFieldsBuilder";

export default CustomFieldsBuilder;
