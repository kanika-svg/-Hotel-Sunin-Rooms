import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Hotel } from "lucide-react";
import { type Settings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated", description: "Hotel settings have been saved." });
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({ title: "File too large", description: "Logo must be under 1MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettingsMutation.mutate({ hotelLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 relative z-10 pt-20 lg:pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your hotel's branding and information.</p>
        </header>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hotel Information</CardTitle>
              <CardDescription>This information will appear on all invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hotel Name</label>
                <Input 
                  defaultValue={settings?.hotelName} 
                  onBlur={(e) => updateSettingsMutation.mutate({ hotelName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input 
                  defaultValue={settings?.hotelAddress} 
                  onBlur={(e) => updateSettingsMutation.mutate({ hotelAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <Input 
                  defaultValue={settings?.hotelPhone} 
                  onBlur={(e) => updateSettingsMutation.mutate({ hotelPhone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Upload your hotel logo for invoices and receipts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                  {settings?.hotelLogo ? (
                    <img src={settings.hotelLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Hotel className="w-12 h-12 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="text-white" onClick={() => document.getElementById('logo-upload')?.click()}>
                      <Upload className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="text-sm text-slate-500">
                    <p>Supported formats: PNG, JPG, SVG</p>
                    <p>Maximum size: 1MB</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                      {settings?.hotelLogo ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {settings?.hotelLogo && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => updateSettingsMutation.mutate({ hotelLogo: null })}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    )}
                    <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
