# Staycool POS ✂️

**Staycool POS** is a premium, mobile-first Point of Sale and management system designed specifically for **Staycool Hairlab**. It streamlines barbershop operations, from transaction processing to payroll management, with a focus on speed, aesthetics, and ease of use.

![Staycool POS](app/icon.jpg)

## 🚀 Key Features

### 1. Point of Sale (POS) Station
-   **Mobile-First Design**: Optimized for tablets and mobile devices with a "Dark Luxury" aesthetic.
-   **Quick Checkout**: Seamless cart management, service selection, and instant receipt generation.
-   **Staff & Admin Modes**: Auto-redirects staff directly to the POS for focus, while owners get full dashboard access.
-   **Payment Support**: Handles Cash and QRIS payments with automatic change calculation.

### 2. Dashboard & Analytics
-   **Real-Time Overview**: Track daily revenue, transaction counts, and growth trends instantly.
-   **Daily Report**: A dedicated page for end-of-day reconciliation, showing detailed transaction history and top performers.
-   **Visual Charts**: Weekly revenue breakdowns and recent activity feeds.

### 3. Operational Management
-   **Payroll System**: Automated commission calculation based on barber performance (Flat or Percentage). Includes salary slip generation.
-   **Expense Tracking**: Log and categorize shop expenses (Operational, Purchasing, etc.) to keep net profit accurate.
-   **Shift Management**: Simple shift tracking for cash drawers (Opening/Closing amounts).

## 🛠 Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Database**: PostgreSQL
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
-   **Auth**: [NextAuth.js](https://next-auth.js.org/)
-   **Deployment**: Docker

## 🏁 Getting Started

### Prerequisites
-   Node.js 18+
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
    Create a `.env` file based on `.env.example` (or use your local config):
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/staycool?schema=public"
    NEXTAUTH_SECRET="your-secret-key"
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

## 🐳 Docker Deployment

The project is containerized for easy deployment on any VPS.

1.  **Build & Run**
    ```bash
    docker-compose up -d --build
    ```
    *Note: Ensure your `.env` file is present in the root directory.*

2.  **Access the App**
    The application will be available at `http://localhost:3000`.

## 📜 License

Private software for Staycool Hairlab.
