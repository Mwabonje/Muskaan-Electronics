import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not set. Simulating email send.");
      console.log(`[Email Simulation] To: ${to} | Subject: ${subject} | Body: ${text}`);
      return res.json({ success: true, simulated: true });
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Acme <onboarding@resend.dev>';
    
    // Using a default sender email for Resend (onboarding domain) or custom domain if provided
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      text: text,
    });

    if (error) {
      console.error("Resend API Error:", error);
      
      // If it's a validation error (likely due to onboarding domain restrictions or invalid email)
      if (error.name === 'validation_error') {
        console.warn(`[Email Simulation Fallback] Resend validation error. Simulating email send to: ${to}`);
        console.log(`[Email Simulation] To: ${to} | Subject: ${subject} | Body: ${text}`);
        return res.json({ success: true, simulated: true, note: "Fell back to simulation due to Resend validation error." });
      }
      
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
