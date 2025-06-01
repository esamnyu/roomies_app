# Roomies App

Roomies is a Next.js application designed to simplify shared living by helping roommates manage expenses, tasks, and settlements. It uses Supabase as a backend for authentication, database storage, and real-time features.

## Technologies Used

* **Framework**: [Next.js](https://nextjs.org/) ()
* **Language**: [TypeScript](https://www.typescriptlang.org/) ()
* **Backend**: [Supabase](https://supabase.io/) (for Auth, Database, Realtime) ()
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) ()
* **UI Components**: [Lucide React](https://lucide.dev/) (for icons) ()
* **Notifications**: [React Hot Toast](https://react-hot-toast.com/) ()
* **Linting**: [ESLint](https://eslint.org/) ()
* **Font**: [Geist](https://vercel.com/font) ()

## Getting Started

### Prerequisites

* Node.js (version specified in `package.json` or compatible)
* npm, yarn, pnpm, or bun (as per your preference) ()
* A Supabase project.

### Setup Environment Variables

1.  Create a `.env.local` file in the root of the project.
2.  Add your Supabase URL and Anon Key to this file:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
    ```

    Replace `your-project-ref` and `your_public_anon_key` with your actual Supabase project credentials. ()

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd roomies_app
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

### Running the Development Server

1.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
    ()
2.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. ()

## Key Features

* **Authentication**: User sign-up and sign-in. ()
* **Household Management**: Create and manage households. ()
* **Expense Tracking**: Add expenses with custom splits (equal, custom amount, percentage). ()
* **Recurring Expenses**: Set up and automatically process recurring bills (e.g., rent, utilities). ()
* **Task Management**: Create and assign tasks within a household. ()
* **Settlements**: Record payments between members and get settlement suggestions. ()
* **Real-time Notifications**: Receive notifications for various household activities. ()
* **Payment Reminders**: Send reminders to members who owe money. ()
* **Connection Testing**: Built-in pages to test Supabase connectivity (`/clean-test`, `/network-test`, `/test-supabase`). ()

## Project Structure

* `public/`: Static assets.
* `src/`:
    * `app/`: Next.js App Router pages and layouts. ()
        * `globals.css`: Global styles. ()
        * `layout.tsx`: Root layout. ()
        * `page.tsx`: Main entry page. ()
        * `clean-test/`, `network-test/`, `test-supabase/`: Pages for testing Supabase connection. ()
    * `components/`: React components.
        * `AuthProvider.tsx`: Manages authentication state. ()
        * `NotificationsPanel.tsx`: Handles display and interaction with notifications. ()
        * `RoomiesApp.tsx`: Main application UI logic. ()
    * `lib/`: Utility functions and Supabase client.
        * `api.ts`: Functions for interacting with the Supabase backend. ()
        * `supabase.ts`: Supabase client initialization. ()
* `eslint.config.mjs`: ESLint configuration. ()
* `next.config.ts`: Next.js configuration. ()
* `package.json`: Project dependencies and scripts. ()
* `postcss.config.mjs`: PostCSS configuration (for Tailwind CSS). ()
* `tailwind.config.ts`: Tailwind CSS configuration. ()
* `tsconfig.json`: TypeScript configuration. ()

## Available Scripts

In the project directory, you can run:

* `npm run dev`: Runs the app in development mode. ()
* `npm run build`: Builds the app for production. ()
* `npm run start`: Starts the production server. ()
* `npm run lint`: Lints the project files. ()

## Learn More (Next.js)

To learn more about Next.js, take a look at the following resources:

* [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API. ()
* [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial. ()

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome! ()

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js. ()

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. ()
