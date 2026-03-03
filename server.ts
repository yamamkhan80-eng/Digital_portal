import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("family_card.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    name TEXT,
    enabled INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    fullName TEXT,
    fatherName TEXT,
    motherName TEXT,
    dob TEXT,
    nid TEXT UNIQUE,
    mobile TEXT,
    address TEXT,
    email TEXT,
    photo TEXT,
    nidFront TEXT,
    nidBack TEXT,
    faceVerified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    type TEXT DEFAULT 'notice', -- 'notice' or 'ad'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure 'enabled' column exists in 'users' table
try {
  db.prepare("ALTER TABLE users ADD COLUMN enabled INTEGER DEFAULT 1").run();
} catch (e) {
  // Column already exists or other error
}

// Seed initial notice if empty
const noticeCount = db.prepare("SELECT COUNT(*) as count FROM notices").get() as { count: number };
if (noticeCount.count === 0) {
  db.prepare("INSERT INTO notices (content, type) VALUES (?, ?)").run("ফলাফল প্রকাশ: ১৮ মার্চ", "notice");
}

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendStatusEmail(email: string, id: string, name: string, status: string) {
  if (!email || !process.env.SMTP_USER) return;

  const statusMessages: Record<string, { subject: string, body: string }> = {
    'Pending': {
      subject: "আবেদন জমা হয়েছে - ফ্যামিলি কার্ড ডিজিটাল পোর্টাল",
      body: `প্রিয় ${name},\n\nআপনার আবেদনটি সফলভাবে জমা হয়েছে।\nআবেদন আইডি: ${id}\nবর্তমান অবস্থা: অপেক্ষমান (Pending)\n\nধন্যবাদ,\nফ্যামিলি কার্ড ডিজিটাল পোর্টাল`
    },
    'Approved': {
      subject: "আবেদন অনুমোদিত হয়েছে - ফ্যামিলি কার্ড ডিজিটাল পোর্টাল",
      body: `প্রিয় ${name},\n\nঅভিনন্দন! আপনার আবেদনটি অনুমোদিত হয়েছে।\nআবেদন আইডি: ${id}\nবর্তমান অবস্থা: অনুমোদিত (Approved)\n\nএখন আপনি পোর্টাল থেকে আপনার কার্ড ডাউনলোড করতে পারবেন।\n\nধন্যবাদ,\nফ্যামিলি কার্ড ডিজিটাল পোর্টাল`
    },
    'Rejected': {
      subject: "আবেদন প্রত্যাখ্যাত হয়েছে - ফ্যামিলি কার্ড ডিজিটাল পোর্টাল",
      body: `প্রিয় ${name},\n\nদুঃখিত, আপনার আবেদনটি প্রত্যাখ্যাত হয়েছে।\nআবেদন আইডি: ${id}\nবর্তমান অবস্থা: প্রত্যাখ্যাত (Rejected)\n\nবিস্তারিত জানতে আমাদের সহায়তা কেন্দ্রে যোগাযোগ করুন।\n\nধন্যবাদ,\nফ্যামিলি কার্ড ডিজিটাল পোর্টাল`
    }
  };

  const msg = statusMessages[status] || {
    subject: "আবেদন আপডেট - ফ্যামিলি কার্ড ডিজিটাল পোর্টাল",
    body: `প্রিয় ${name},\n\nআপনার আবেদনের অবস্থা আপডেট করা হয়েছে।\nআবেদন আইডি: ${id}\nবর্তমান অবস্থা: ${status}\n\nধন্যবাদ,\nফ্যামিলি কার্ড ডিজিটাল পোর্টাল`
  };

  try {
    await transporter.sendMail({
      from: `"Family Card Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: msg.subject,
      text: msg.body,
    });
    console.log(`Email sent to ${email} for status ${status}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  // API Routes
  app.post("/api/login", (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "মোবাইল নম্বর প্রয়োজন।" });
    
    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as { phone: string, enabled: number } | undefined;
    if (!user) {
      db.prepare("INSERT INTO users (phone) VALUES (?)").run(phone);
      user = { phone, enabled: 1 };
    }

    if (user.enabled === 0) {
      return res.status(403).json({ error: "আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। দয়া করে সহায়তায় যোগাযোগ করুন।" });
    }

    res.json(user);
  });

  app.post("/api/applications", async (req, res) => {
    const { fullName, fatherName, motherName, dob, nid, mobile, address, email, photo, nidFront, nidBack, faceVerified } = req.body;
    
    // Check for duplicate NID
    const existing = db.prepare("SELECT id FROM applications WHERE nid = ?").get(nid);
    if (existing) {
      return res.status(400).json({ error: "এই NID নম্বরটি ইতিমধ্যে ব্যবহার করা হয়েছে।" });
    }

    const id = "APP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    try {
      db.prepare(`
        INSERT INTO applications (id, fullName, fatherName, motherName, dob, nid, mobile, address, email, photo, nidFront, nidBack, faceVerified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, fullName, fatherName, motherName, dob, nid, mobile, address, email, photo, nidFront, nidBack, faceVerified ? 1 : 0);
      
      // Send submission email
      if (email) {
        sendStatusEmail(email, id, fullName, 'Pending');
      }

      res.json({ id, status: "Pending" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "আবেদন জমা দিতে সমস্যা হয়েছে।" });
    }
  });

  app.get("/api/applications/:search", (req, res) => {
    const search = req.params.search;
    const application = db.prepare("SELECT * FROM applications WHERE id = ? OR nid = ?").get(search, search);
    if (application) {
      res.json(application);
    } else {
      res.status(404).json({ error: "আবেদনটি খুঁজে পাওয়া যায়নি।" });
    }
  });

  app.get("/api/admin/applications", (req, res) => {
    const applications = db.prepare("SELECT * FROM applications ORDER BY createdAt DESC").all();
    res.json(applications);
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users ORDER BY createdAt DESC").all();
    res.json(users);
  });

  app.post("/api/admin/users/:phone/status", (req, res) => {
    const { phone } = req.params;
    const { enabled } = req.body;
    db.prepare("UPDATE users SET enabled = ? WHERE phone = ?").run(enabled ? 1 : 0, phone);
    res.json({ success: true });
  });

  app.post("/api/admin/applications/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const application = db.prepare("SELECT email, fullName FROM applications WHERE id = ?").get(id) as { email: string, fullName: string } | undefined;
    
    db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
    
    if (application && application.email) {
      sendStatusEmail(application.email, id, application.fullName, status);
    }

    res.json({ success: true });
  });

  app.get("/api/notices", (req, res) => {
    const notices = db.prepare("SELECT * FROM notices ORDER BY createdAt DESC").all();
    res.json(notices);
  });

  app.post("/api/admin/notices", (req, res) => {
    const { content, type } = req.body;
    db.prepare("INSERT INTO notices (content, type) VALUES (?, ?)").run(content, type || "notice");
    res.json({ success: true });
  });

  app.delete("/api/admin/notices/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notices WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
