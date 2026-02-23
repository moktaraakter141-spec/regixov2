"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// ── Helpers ────────────────────────────────────────────
const exec = (command: string, value?: string) =>
  document.execCommand(command, false, value);

const isActive = (command: string) => {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];

// ── Sub-components ─────────────────────────────────────
const Divider = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

const TBtn = ({
  command,
  label,
  children,
  onClick,
}: {
  command?: string;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const active = command ? isActive(command) : false;
  return (
    <Toggle
      size="sm"
      pressed={active}
      onPressedChange={() => {
        if (onClick) {
          onClick();
          return;
        }
        if (command) exec(command);
      }}
      aria-label={label}
      className="h-7 w-7 p-0 rounded data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted"
    >
      {children}
    </Toggle>
  );
};

const ABtn = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    size="sm"
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="h-7 w-7 p-0 rounded hover:bg-muted disabled:opacity-30"
  >
    {children}
  </Button>
);

// ── Main Editor ────────────────────────────────────────
const TiptapEditor = React.forwardRef<HTMLDivElement, TiptapEditorProps>(
  ({ content, onChange, placeholder, minHeight = "140px" }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const [toolbarOpen, setToolbarOpen] = useState(true);
    const [fontSize, setFontSize] = useState("16");
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    // Set initial content once
    useEffect(() => {
      if (editorRef.current && !isInitialized.current) {
        editorRef.current.innerHTML = content || "";
        isInitialized.current = true;
      }
    }, []);

    // Re-render toolbar on selection change to reflect active states
    useEffect(() => {
      const update = () => forceUpdate();
      document.addEventListener("selectionchange", update);
      return () => document.removeEventListener("selectionchange", update);
    }, []);

    const handleInput = useCallback(() => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, [onChange]);

    const handleFontSize = (val: string) => {
      setFontSize(val);
      // execCommand fontSize uses 1-7 scale, so we use insertHTML instead
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement("span");
      span.style.fontSize = `${val}px`;
      range.surroundContents(span);
      onChange(editorRef.current?.innerHTML || "");
    };

    return (
      <div
        ref={ref}
        className="rounded-lg border bg-background shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-shadow"
      >
        {/* ── Toolbar Header ── */}
        <div className="flex items-center border-b bg-muted/30">
          {/* Toolbar content */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-0.5 px-2 py-1.5 flex-1 transition-all duration-200",
              !toolbarOpen && "hidden",
            )}
          >
            {/* Font Size */}
            <Select value={fontSize} onValueChange={handleFontSize}>
              <SelectTrigger className="h-7 w-16 text-xs border-0 bg-transparent px-1.5 focus:ring-0 gap-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999] min-w-[80px]">
                {FONT_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Divider />

            {/* Headings */}
            <TBtn label="H1" onClick={() => exec("formatBlock", "h1")}>
              <Heading1 className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn label="H2" onClick={() => exec("formatBlock", "h2")}>
              <Heading2 className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn label="H3" onClick={() => exec("formatBlock", "h3")}>
              <Heading3 className="h-3.5 w-3.5" />
            </TBtn>

            <Divider />

            {/* Inline */}
            <TBtn command="bold" label="Bold">
              <Bold className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="italic" label="Italic">
              <Italic className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="underline" label="Underline">
              <Underline className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="strikeThrough" label="Strike">
              <Strikethrough className="h-3.5 w-3.5" />
            </TBtn>

            <Divider />

            {/* Lists */}
            <TBtn command="insertUnorderedList" label="Bullet list">
              <List className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="insertOrderedList" label="Ordered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn
              label="Blockquote"
              onClick={() => exec("formatBlock", "blockquote")}
            >
              <Quote className="h-3.5 w-3.5" />
            </TBtn>

            <Divider />

            {/* Alignment */}
            <TBtn command="justifyLeft" label="Left">
              <AlignLeft className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="justifyCenter" label="Center">
              <AlignCenter className="h-3.5 w-3.5" />
            </TBtn>
            <TBtn command="justifyRight" label="Right">
              <AlignRight className="h-3.5 w-3.5" />
            </TBtn>

            <Divider />

            {/* Utilities */}
            <ABtn label="HR" onClick={() => exec("insertHTML", "<hr/>")}>
              <Minus className="h-3.5 w-3.5" />
            </ABtn>
            <ABtn label="Undo" onClick={() => exec("undo")}>
              <Undo2 className="h-3.5 w-3.5" />
            </ABtn>
            <ABtn label="Redo" onClick={() => exec("redo")}>
              <Redo2 className="h-3.5 w-3.5" />
            </ABtn>
            <ABtn
              label="Clear"
              onClick={() => {
                exec("removeFormat");
                exec("formatBlock", "p");
              }}
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ABtn>
          </div>

          {/* Collapsed label (shown when toolbar hidden) */}
          {!toolbarOpen && (
            <span className="px-3 text-xs text-muted-foreground flex-1">
              Formatting toolbar
            </span>
          )}

          {/* Collapse toggle button */}
          <button
            type="button"
            onClick={() => setToolbarOpen((v) => !v)}
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l"
            aria-label={toolbarOpen ? "Collapse toolbar" : "Expand toolbar"}
          >
            {toolbarOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* ── Editor Area ── */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-placeholder={placeholder || "Start writing..."}
          className={cn(
            "px-4 py-3 text-sm focus:outline-none",
            "prose prose-sm max-w-none dark:prose-invert",
            "[&_p]:my-1",
            "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
            "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2",
            "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_hr]:border-border [&_hr]:my-3",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none empty:before:float-left empty:before:h-0",
          )}
          style={{ minHeight }}
        />
      </div>
    );
  },
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
