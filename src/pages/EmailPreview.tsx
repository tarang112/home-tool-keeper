import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const languages = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "hi", label: "हिन्दी" },
];

const templates = [
  { value: "signup", label: "Sign-up" },
  { value: "recovery", label: "Password reset" },
  { value: "magiclink", label: "Magic link" },
];

export default function EmailPreview() {
  const [language, setLanguage] = useState("en");
  const [template, setTemplate] = useState("signup");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const title = useMemo(() => templates.find((item) => item.value === template)?.label, [template]);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      const { data, error: invokeError } = await supabase.functions.invoke("auth-email-hook/preview", {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        body: { type: template, locale: language },
      });

      if (invokeError) {
        setError("Unable to load preview");
        setHtml("");
      } else {
        setHtml(typeof data === "string" ? data : "");
      }

      setLoading(false);
    };

    loadPreview();
  }, [language, template]);

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold">Auth Email Preview</h1>
            <p className="text-sm text-muted-foreground">Switch templates and languages to preview inbox rendering.</p>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={template} onValueChange={setTemplate}>
          <TabsList className="grid w-full grid-cols-3 sm:w-[480px]">
            {templates.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[620px] overflow-hidden rounded-lg border bg-card">
              {loading && <div className="flex h-[620px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
              {!loading && error && <div className="flex h-[620px] items-center justify-center text-sm text-destructive">{error}</div>}
              {!loading && !error && <iframe title="Email preview" srcDoc={html} className="h-[620px] w-full bg-white" />}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}