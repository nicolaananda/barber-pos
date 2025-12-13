# Staycool POS ✂️

**Staycool POS** is a premium, high-performance Point of Sale and management ecosystem customized for **Staycool Hairlab**. Built with the latest web technologies, it merges a "Dark Luxury" aesthetic with lightning-fast performance to streamline barbershop operations—from the barber's chair to the owner's financial reports.

![Staycool POS](app/icon.jpg)

## 🚀 Key Features

### 1. ⚡ High-Performance POS Station
-   **Instant Navigation**: Powered by Next.js App Router and intelligent prefetching, switching between screens is instantaneous.
-   **Dark Luxury UI**: A visually stunning interface designed for modern tablets and low-light environments.
-   **Quick Checkout**: Seamless items selection, cart management, and rapid receipt generation.
-   **Dual Payment Support**: Integrated workflows for both **Cash** and **QRIS** payments.

### 2. 📊 Live Dashboard & Analytics
-   **Real-Time Data**: Revenue, transaction counts, and customer footfall are updated live.
-   **Smart Caching**: All reports use Client-Side Caching (SWR) for instant access to previous data without loading screens.
-   **Daily Reconciliation**: Specialized "Daily Report" for end-of-day closing, featuring top barber stats and cuts history.

### 3. 💰 Comprehensive Financial Suite
-   **Expenses Bookkeeping**: Record and categorize operational costs (Supplies, Salary, electricity, etc.).
-   **Net Profit Calculation**: Automatic calculation of straightforward Gross Revenue vs. Expenses.
-   **Automated Payroll**: One-click salary slip generation with automatic commission calculations (Percentage or Flat Rate) based on barber performance.
-   **Transaction History**: Searchable, filterable archive of all past sales with **CSV Export** capability.

### 4. 🔒 Role-Based Security
-   **Staff Mode**: Restricted access focused solely on taking orders and checking shifts.
-   **Admin Mode**: Full access to financial data, payroll, and business settings.
-   **Secure Authentication**: Robust session management via **NextAuth.js**.

---

## 🛠 Tech Stack

Built on the bleeding edge of the React ecosystem:

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI Library**: [React 19](https://react.dev/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
-   **Data Caching**: [SWR](https://swr.vercel.app/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (via Neon/Supabase)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Deployment**: Docker Containerized

---

## 🏁 Getting Started

### Prerequisites
-   Node.js 20+
-   PostgreSQL Database

### Local Development

1.  **Clone the repository**
    ```bash
    git clone git@github.com:nicolaananda/barber-pos.git
    cd barber-pos
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/staycool?schema=public"
    NEXTAUTH_SECRET="your-super-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Initialize Database**
    ```bash
    npx prisma generate
    npx prisma db push
    npm run seed  # Seeds initial admin/staff users
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🐳 Docker Deployment

The application is fully containerized for production stability.

1.  **Build & Run**
    ```bash
    docker-compose up -d --build
    ```
    
2.  **Verify Status**
    ```bash
    docker ps
    ```

---

## 📜 License

Private software developed for Staycool Hairlab.
© 2024 Nicola Ananda. All rights reserved.
