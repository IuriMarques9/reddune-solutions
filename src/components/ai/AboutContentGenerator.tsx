
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateAboutContentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  companyDescription: z.string().min(10, "Please provide a more detailed description."),
  targetAudience: z.string().min(5, "Please describe your target audience."),
  brandVoice: z.string().min(5, "Please describe your brand voice."),
  additionalKeywords: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AboutContentGenerator() {
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyDescription: "Apex Portfolio is a design and development agency specializing in modern architecture and user-centric digital experiences.",
      targetAudience: "Startups and established businesses looking for high-quality branding and web presence.",
      brandVoice: "Professional, sophisticated, and innovative.",
      additionalKeywords: "sustainable, futuristic, client-focused",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedContent("");
    const result = await generateAboutContentAction(values);
    setIsLoading(false);

    if (result.success && result.data) {
      setGeneratedContent(result.data.aboutUsContent);
      toast({
        title: "Content Generated",
        description: "Your 'About Us' content has been successfully generated.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
  }

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      toast({
        title: "Copied to Clipboard",
        description: "The generated content has been copied.",
      });
    }
  };

  return (
    <Card className="mt-20 bg-secondary/50 border-border shadow-lg rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Sparkles className="text-primary h-8 w-8" />
            <div className="flex-1">
                <CardTitle className="font-headline text-2xl">AI Content Assistant</CardTitle>
                <CardDescription className="mt-1">
                    Generate compelling 'About Us' content. Fill in the details below to get started.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your company, mission, and values..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Who are you trying to reach?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brandVoice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Voice</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Professional, friendly, quirky..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="additionalKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Keywords (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., sustainable, innovative..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </form>
            
            <div className="flex flex-col">
                <FormLabel>Generated Content</FormLabel>
                <div className="relative flex-grow mt-2">
                <Textarea
                    readOnly
                    value={isLoading ? "Generating, please wait..." : generatedContent}
                    placeholder="AI-generated content will appear here..."
                    className="h-full min-h-[300px] resize-none bg-background"
                />
                {generatedContent && !isLoading && (
                    <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={copyToClipboard}
                    >
                    <Copy className="h-4 w-4" />
                    </Button>
                )}
                </div>
            </div>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
