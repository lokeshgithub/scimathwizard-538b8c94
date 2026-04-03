import { useState, useCallback } from "react";
import { MessageSquarePlus, Camera, Send, X, Bug, Lightbulb, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const FEEDBACK_TYPES = [
  { id: "bug", label: "Bug", icon: Bug, color: "text-red-500" },
  { id: "suggestion", label: "Idea", icon: Lightbulb, color: "text-yellow-500" },
  { id: "love", label: "Love it!", icon: Heart, color: "text-pink-500" },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["id"];

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  const captureScreenshot = useCallback(async () => {
    setCapturing(true);
    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import("html2canvas")).default;
      
      const widget = document.getElementById("feedback-widget");
      if (widget) widget.style.visibility = "hidden";

      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      if (widget) widget.style.visibility = "";
      setScreenshot(canvas.toDataURL("image/jpeg", 0.6));
    } catch {
      // Screenshot failed - that's OK, user can still submit text feedback
      toast.info("Screenshot unavailable, but you can still type your feedback!");
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleOpen = useCallback(() => {
    // Just open the panel - don't auto-capture screenshot (it was causing vanishing issues)
    setIsOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!message.trim() && !screenshot) {
      toast.error("Please add a message or screenshot");
      return;
    }
    setSubmitting(true);

    try {
      let screenshotPath: string | null = null;

      if (screenshot) {
        const blob = await (await fetch(screenshot)).blob();
        const fileName = `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-screenshots")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        if (!uploadError) {
          screenshotPath = fileName;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("user_feedback" as any).insert({
        feedback_type: feedbackType,
        message: message.trim() || null,
        page_url: window.location.pathname,
        screenshot_path: screenshotPath,
        user_id: user?.id || null,
        device_info: {
          ua: navigator.userAgent,
          screen: `${screen.width}x${screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      } as any);

      if (error) throw error;

      toast.success("Thanks for your feedback! 💙");
      setIsOpen(false);
      setMessage("");
      setScreenshot(null);
      setFeedbackType("suggestion");
    } catch (err) {
      console.error("Feedback submit error:", err);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Hide on /testing page
  if (location.pathname === "/testing") return null;

  return (
    <>
      {/* Collapsed tab - fixed to right edge */}
      {!isOpen && (
        <div id="feedback-widget" className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-2 py-3 rounded-l-lg shadow-lg hover:px-3 transition-all duration-200 text-xs font-medium"
            style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
            aria-label="Send feedback"
          >
            <MessageSquarePlus className="w-4 h-4 rotate-90" />
            Feedback
          </button>
        </div>
      )}

      {/* Expanded panel - rendered as a top-level overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setIsOpen(false)}>
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Quick Feedback</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="flex gap-2">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFeedbackType(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      feedbackType === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <t.icon className={`w-3.5 h-3.5 ${feedbackType === t.id ? t.color : ""}`} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Screenshot preview */}
              {screenshot && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={screenshot} alt="Screenshot" className="w-full h-32 object-cover object-top" />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {!screenshot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureScreenshot}
                  disabled={capturing}
                  className="w-full text-xs"
                >
                  {capturing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}
                  {capturing ? "Capturing..." : "Attach Screenshot (optional)"}
                </Button>
              )}

              {/* Message */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                className="text-sm min-h-[80px] resize-none"
                maxLength={1000}
              />

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || (!message.trim() && !screenshot)}
                className="w-full"
                size="sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                {submitting ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
