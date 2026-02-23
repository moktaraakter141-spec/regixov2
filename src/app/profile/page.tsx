"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, User, FileText, Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Sidebar } from "@/components/Sidebar";

const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        contact_email: profile.contact_email || "",
        contact_phone: profile.contact_phone || "",
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          bio: form.bio,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 sm:px-6 border-b bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Profile & Settings
          </h2>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        <main className="mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Account
              </CardTitle>
              <CardDescription>Your login and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <p className="text-xs font-mono text-muted-foreground">
                  {user?.id}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Profile Details
              </CardTitle>
              <CardDescription>
                This info can be auto-filled in your events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate();
                  }}
                >
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, full_name: e.target.value }))
                      }
                      className="mt-1"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          contact_email: e.target.value,
                        }))
                      }
                      className="mt-1"
                      placeholder="public-facing email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={form.contact_phone}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          contact_phone: e.target.value,
                        }))
                      }
                      className="mt-1"
                      placeholder="+880..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={form.bio}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, bio: e.target.value }))
                      }
                      className="mt-1"
                      placeholder="Tell people about yourself or your organization"
                      rows={3}
                    />
                  </div>
                  <Separator />
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Profile;
