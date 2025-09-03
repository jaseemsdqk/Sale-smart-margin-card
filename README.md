# 📊 Sale Smart Margin Card  

An Odoo module that provides a **real-time margin dashboard with cost breakdown** directly inside the Sales Order form.  

---

## ✨ Features  

- 📌 **Smart Margin Card** on Sales Order form  
  - Shows **Total Revenue vs COGS vs Net Margin**  
  - Auto-updates when:  
    - Order is confirmed  
    - Product prices change  
    - Landed costs are added (via Inventory)  
    - Overhead costs change (via Analytical Accounting)  

- 📈 **Interactive Breakdown**  
  - Click the margin card to open a popup with:  
    - Product details (Qty, Unit Price, Landed Cost, Overhead, Line Margin)  
    - Expandable rows for **Cost Composition**  
      - Freight, customs, and landed costs  
      - Overhead allocation from analytical accounts  

- ⚙️ **Configurable Overhead**  
  - Overhead can be set as:  
    - Percentage of cost  
    - Fixed amount per unit  
  - Based on **Product Category** / **Analytical Account**  

---

## 📸 Screenshots  

### 1️⃣ Configure Default Overhead  
![Overhead Config](/sale_smart_margin_card/static/src/img/1.png)  

### 2️⃣ Sales Order with Smart Margin Card  
![Sales Order](/sale_smart_margin_card/static/src/img/2.png)  

### 3️⃣ Margin Chart View  
![Margin Chart](/sale_smart_margin_card/static/src/img/3.png)  

### 4️⃣ Product Cost Breakdown  
![Product Breakdown](/sale_smart_margin_card/static/src/img/4.png)  

---

## 🛠️ Technical Notes  

### ⚡ Scaling for 10k+ Orders  

- Totals (Revenue, COGS, Margin) are **stored and pre-computed** on orders and order lines to avoid recalculation on every open.  
- Re-computation is triggered only on **key events** (order confirmation, price change, landed cost posting, overhead update).  
- **Batch updates** are applied for multiple lines together.  
- The popup uses **lazy loading** (details load only when user expands a product).  
- **Caching** is applied at order level and refreshed only when costs change.  
- **Optimized queries** (`read_group` / SQL) are used instead of Python loops for aggregations.  

This ensures smooth performance even with **10k+ orders and products**.  

---

### 🔒 Security Considerations  

- Only **finance/manager groups** can access cost and margin data.  
- All RPC/API endpoints include **server-side permission checks** (beyond UI restrictions).  
- Data is **restricted by company** to prevent cross-company leaks.  
- Popup responses return only **safe numerical values** (landed cost, overhead, margin) without sensitive record details.  
- Configuration changes and landed cost postings are **logged for audit purposes**.  

This design keeps the dashboard **secure and compliant**, while protecting sensitive financial data.  

---

## 👥 Team Delegation  

- **Sr. Backend Developer** 🛠️  
  - Cost computation  
  - API and `@api.depends` methods  
  - Overhead configuration logic  

- **Sr. Frontend Developer** 🎨  
  - OWL component for margin card  
  - Interactive chart and popup breakdown  
  - Expandable product line details  

---

## 📂 Installation  

1. Copy the module into your Odoo `addons` folder  
2. Update app list and install **Sale Smart Margin Card**  
3. Go to **Sales → Orders** and view the Smart Margin Card  

---

✅ That’s it! Your sales team now has **real-time margin visibility** with detailed cost breakdown.  

