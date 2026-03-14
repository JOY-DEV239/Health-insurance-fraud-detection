import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock datasets (will be updated when user provides real ones)
  let medicines = [
    { name: "Amoxicillin", price: 15.50 },
    { name: "Lisinopril", price: 12.00 },
    { name: "Atorvastatin", price: 25.00 },
    { name: "Metformin", price: 10.00 },
    { name: "Amlodipine", price: 18.00 },
    { name: "Omeprazole", price: 22.00 },
  ];

  let labTests = [
    { name: "Complete Blood Count (CBC)", price: 45.00 },
    { name: "Basic Metabolic Panel (BMP)", price: 60.00 },
    { name: "Lipid Panel", price: 75.00 },
    { name: "Liver Function Test (LFT)", price: 85.00 },
    { name: "Hemoglobin A1c", price: 55.00 },
    { name: "Urinalysis", price: 30.00 },
  ];

  // API Routes
  app.get("/api/medicines", (req, res) => {
    res.json(medicines);
  });

  app.get("/api/lab-tests", (req, res) => {
    res.json(labTests);
  });

  app.post("/api/update-datasets", (req, res) => {
    const { type, data } = req.body;
    if (type === 'medicines') medicines = data;
    if (type === 'labTests') labTests = data;
    res.json({ status: "success", message: `${type} dataset updated` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
