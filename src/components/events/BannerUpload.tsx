"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client"; // ✅ fixed
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface BannerUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const BannerUpload = ({ value, onChange }: BannerUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("event-banners")
        .upload(path, compressed);
      if (error) throw error;
      const { data } = supabase.storage
        .from("event-banners")
        .getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const compressImage = (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {value ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img src={value} alt="Banner" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-full bg-background/80 p-1 backdrop-blur-sm hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-sm">Upload Event Banner</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default BannerUpload;
