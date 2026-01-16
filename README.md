# Smartwatch E-Commerce System

> 🚧 **Work In Progress**: This project is currently under active development.

## Project Overview

This is my personal project about high-fidelity e-commerce system dedicated to selling smartwatches developed using [MERN](https://www.mongodb.com/resources/languages/mern-stack) tech stack. All the functionalities and features are implemented to be as much close to a real-world production system as possible.

## Tech Stack

**Frontend** ([`client/`](client/))

* **Framework**: React (Vite)
* **Language**: TypeScript
* **Styling**: Bootstrap 5, CSS
* **State Management**: Zustand
* **Integrations**: Firebase (Auth/Storage), Stripe (Payments)

**Backend** ([`server/`](server/))

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MongoDB (Mongoose ODM)
* **Authentication**: JWT/refresh token, bcryptjs
* **Services**: Mailtrap/Nodemailer (Email), Twilio (SMS)

**Common** ([`common/`](common/))

* Shared TypeScript types and utility functions used by both client and server to ensure type safety across the network boundary.

## Project Structure

```text
.
├── client/          # React Frontend application
├── server/          # Node.js/Express Backend API
├── common/          # Shared Types and Configs
└── ...
```

## Getting Started

### Prerequisites

* Node.js (v18+ recommended)
* MongoDB (Local or Atlas)

### 1. Backend Setup

1. Navigate to the server directory:

    ```bash
    cd server
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure Environment Variables:
    Create a `.env` file in the `root` directory based on [`.env.example`](./.env.example). You will need credentials for MongoDB, Stripe, Mailtrap, Twilio, and Firebase.

    ```.env
    SERVER_PORT=5000
    MONGO_URI=mongodb://localhost:27017/smartwatch_db
    JWT_SECRET_KEY=...
    # ...other keys found in server/index.ts
    ```

    Create a `.serviceAccountKey.json` file in the `server/` directory based on [`server/serviceAccountKey.example.json`](server/serviceAccountKey.example.json) for Firebase Admin SDK.

    ```json
    {
        "type": "service_account",
        "project_id": "<your project id>",
        "private_key_id": "<your private key id>",
        ...
    }

    ```

4. Run the server:

    ```bash
    npm run dev
    ```

### 2. Frontend Setup

1. Navigate to the client directory (in a new terminal):

    ```bash
    cd client
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure Environment Variables:
    Create a `.env` file in the `client/` directory based on [`client/.env.example`](client/.env.example).

    ```.env
    VITE_FIREBASE_API_KEY=...
    # ...other keys
    ```

4. Run the server:

    ```bash
    npm run dev
    ```

5. Access admin page:
    Visit the admin page at [http://localhost:5173/admin](http://localhost:5173/admin) with the following default credentials that you can find in [configs.ts](./server/configs/configs.ts):

    ```text
    Email: admin@internal.app
    Password: a_very_secure_admin_password_123!@#"
    ```

### 3. Preparing and Mocking Data

* For the first time creating the database please uncomment the `await seedAllCollections()` in [`server/index.ts`](./server//index.ts) to initialize all necessary data when first time run the server or database is empty then comment it back after that.

* To mock all data for testing/viewing purposes please do the same as above with the `await mockAllData()` in [`server/index.ts`](./server//index.ts).
  