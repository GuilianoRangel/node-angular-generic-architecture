# Lab CRUD 2 - High Efficiency Architecture

This project demonstrates a high-efficiency architecture for building scalable web applications using **NestJS** (Backend) and **Angular** (Frontend). It features a multi-tenant capable backend, abstract CRUD controllers, and a component-based frontend with reactive state management.

## Technologies

-   **Backend:** NestJS, TypeORM, PostgreSQL, Passport (JWT), NestJS CLS (Context Local Storage).
-   **Frontend:** Angular (v19+), Bootstrap 5, Signals, Zoneless Change Detection.
-   **Infrastructure:** Designed for Serverless (AWS Lambda) but runnable locally.

## Prerequisites

-   Node.js (v18+)
-   npm
-   PostgreSQL (running on port 5434 by default, configurable via env vars)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd lab-crud2
    ```

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

## Database Setup

Ensure you have a PostgreSQL database running. The default configuration expects:
-   **Host:** localhost
-   **Port:** 5434
-   **Username:** postgres
-   **Password:** pg123
-   **Database:** lab_crud2

You can override these with environment variables (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`).

## Running the Application

### Backend

Start the NestJS server:

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The backend will run on `http://localhost:3000`.

### Frontend

Start the Angular development server:

```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:4200`.

## Initialization (Seeding)

To initialize the system with a default admin user, run the seed script:

```bash
npx ts-node src/seed.ts
```

This will create a user with the following credentials if it doesn't already exist:
-   **Username:** `admin`
-   **Password:** `admin123`
-   **Role:** `admin`

## Authentication

1.  Navigate to `http://localhost:4200/login`.
2.  Enter the admin credentials (`admin` / `admin123`).
3.  Upon successful login, you will be redirected to the Tasks management page.

## Architecture Highlights

-   **Backend:**
    -   `AbstractEntity`: Base entity with auditing (created/updated by) and tenancy support.
    -   `AbstractCrudController`: Generic controller providing standard CRUD endpoints.
    -   `AuditSubscriber`: Automatically populates audit fields.
-   **Frontend:**
    -   `BaseResourceService`: Generic service handling API communication.
    -   `GenericTableComponent`: Reusable table with dynamic columns and actions.
    -   `GenericFormComponent`: Reusable form generator based on field definitions.
    -   **Zoneless:** configured to use `provideZonelessChangeDetection()`.
