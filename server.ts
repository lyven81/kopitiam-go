import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const db = new Database("kopitiam.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    item_name TEXT,
    quantity INTEGER,
    price_cents INTEGER,
    total_cents INTEGER
  )
`);

const MENU_ITEMS = [
  { id: "nasi_lemak", name: "Nasi Lemak", price: 500 },
  { id: "roti_bakar", name: "Roti Bakar", price: 250 },
  { id: "kaya_butter_toast", name: "Kaya Butter Toast", price: 300 },
  { id: "kopi_o", name: "Kopi O", price: 200 },
  { id: "mee_goreng", name: "Mee Goreng", price: 600 },
  { id: "teh_tarikkaw", name: "Teh Tarik Kaw", price: 250 },
  { id: "char_kuey_teow", name: "Char Kuey Teow", price: 700 },
  { id: "milo_ais", name: "Milo Ais", price: 300 },
  { id: "roti_canai", name: "Roti Canai", price: 150 },
  { id: "mee_rebus", name: "Mee Rebus", price: 650 },
  { id: "nasi_goreng", name: "Nasi Goreng", price: 600 },
  { id: "maggi_goreng", name: "Maggi Goreng", price: 550 },
  { id: "teh_o", name: "Teh O", price: 150 },
  { id: "karipap", name: "Karipap", price: 100 },
  { id: "pulut_panggang", name: "Pulut Panggang", price: 150 },
  { id: "tau_fu_fah", name: "Tau Fu Fah", price: 250 },
  { id: "sirap_bandung", name: "Sirap Bandung", price: 250 },
  { id: "rojak", name: "Rojak", price: 500 },
  { id: "popiah", name: "Popiah", price: 300 },
  { id: "neslo", name: "Neslo", price: 350 },
  { id: "teh_o_ais", name: "Teh O Ais", price: 200 },
  { id: "ayam_goreng", name: "Ayam Goreng", price: 350 },
  { id: "kuih_lapis", name: "Kuih Lapis", price: 100 },
];

const pricesMap = Object.fromEntries(MENU_ITEMS.map(item => [item.id, item.price]));

// Seed data from CSV if empty
const count = db.prepare("SELECT COUNT(*) as count FROM sales").get() as { count: number };
if (count.count === 0) {
  console.log("Seeding database from Kopitiam_dataset.csv...");
  const csvContent = fs.readFileSync("Kopitiam_dataset.csv", "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const insert = db.prepare(`
    INSERT INTO sales (datetime, item_name, quantity, price_cents, total_cents)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const record of records as any[]) {
      // Parse datetime: 11/7/2019 15:35 -> ISO
      const [datePart, timePart] = record.datetime.split(" ");
      if (!datePart || !timePart) continue;
      const [day, month, year] = datePart.split("/");
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}:00`;

      for (const item of MENU_ITEMS) {
        const qty = parseInt(record[item.id]);
        if (qty > 0) {
          const price = pricesMap[item.id];
          insert.run(isoDate, item.id, qty, price, qty * price);
        }
      }
    }
  })();
  console.log("Seeding complete.");
}

app.use(express.json());

// API Routes
app.get("/api/menu", (req, res) => {
  res.json(MENU_ITEMS);
});

app.post("/api/sales", (req, res) => {
  const { item_id, quantity } = req.body;
  const item = MENU_ITEMS.find(i => i.id === item_id);
  if (!item) return res.status(400).json({ error: "Invalid item" });

  const insert = db.prepare(`
    INSERT INTO sales (item_name, quantity, price_cents, total_cents)
    VALUES (?, ?, ?, ?)
  `);
  const result = insert.run(item_id, quantity, item.price, quantity * item.price);
  res.json({ id: result.lastInsertRowid });
});

app.get("/api/stats/today", (req, res) => {
  // For prototype, we'll use the last date in the dataset as "today" if no sales today
  // But actually, let's just use real today and if empty, show 0.
  const today = new Date().toISOString().split('T')[0];
  
  const stats = db.prepare(`
    SELECT 
      SUM(total_cents) as totalRevenue,
      SUM(quantity) as totalItems,
      COUNT(DISTINCT id) as totalTransactions
    FROM sales
    WHERE date(datetime) = date('now')
  `).get() as any;

  // Milestone alerts logic
  const topItem = db.prepare(`
    SELECT item_name, SUM(quantity) as qty
    FROM sales
    WHERE date(datetime) = date('now')
    GROUP BY item_name
    ORDER BY qty DESC
    LIMIT 1
  `).get() as any;

  const alerts = [];
  if (topItem && topItem.qty >= 10) {
    const item = MENU_ITEMS.find(i => i.id === topItem.item_name);
    alerts.push(`You just hit ${topItem.qty} ${item?.name} orders!`);
  }

  // Dynamic Quick Tip logic
  const topItemAllTime = db.prepare(`
    SELECT item_name, SUM(quantity) as qty
    FROM sales
    GROUP BY item_name
    ORDER BY qty DESC
    LIMIT 1
  `).get() as any;

  let quickTip = "Boss, start recording sales to see tips here!";
  if (topItem && topItem.qty > 0) {
    const item = MENU_ITEMS.find(i => i.id === topItem.item_name);
    quickTip = `Boss, ${item?.name} is moving fast today! Check your inventory for ingredients.`;
  } else if (topItemAllTime) {
    const item = MENU_ITEMS.find(i => i.id === topItemAllTime.item_name);
    quickTip = `Boss, ${item?.name} is usually your best seller. Ready for the rush?`;
  }

  // Top items today for live feedback
  const topItemsToday = db.prepare(`
    SELECT item_name as id, SUM(quantity) as value
    FROM sales
    WHERE date(datetime) = date('now')
    GROUP BY item_name
    ORDER BY value DESC
    LIMIT 3
  `).all() as any[];

  const topItems = topItemsToday.map(row => ({
    ...row,
    name: MENU_ITEMS.find(i => i.id === row.id)?.name || row.id
  }));

  res.json({
    revenue: stats.totalRevenue || 0,
    items: stats.totalItems || 0,
    transactions: stats.totalTransactions || 0,
    alerts,
    quickTip,
    topItems
  });
});

app.get("/api/stats/performance", (req, res) => {
  const rows = db.prepare(`
    SELECT item_name as id, SUM(quantity) as value
    FROM sales
    GROUP BY item_name
    ORDER BY value DESC
  `).all() as any[];

  const performance = rows.map(row => ({
    ...row,
    name: MENU_ITEMS.find(i => i.id === row.id)?.name || row.id
  }));

  res.json(performance);
});

app.get("/api/stats/analytics", (req, res) => {
  // Busy Hours
  const busyHours = db.prepare(`
    SELECT strftime('%H', datetime) as hour, SUM(quantity) as count
    FROM sales
    GROUP BY hour
    ORDER BY hour ASC
  `).all();

  // Daily Trends (last 7 days of data)
  const dailyTrends = db.prepare(`
    SELECT date(datetime) as date, SUM(total_cents) as revenue
    FROM sales
    GROUP BY date
    ORDER BY date DESC
    LIMIT 7
  `).all().reverse();

  res.json({ busyHours, dailyTrends });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
