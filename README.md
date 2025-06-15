# Roomies: Shared Living, Simplified

Roomies is a [Next.js](https://nextjs.org/) application designed to simplify shared living by helping roommates manage expenses, chores, and communication. It uses [Supabase](https://supabase.io/) for its backend, including authentication, database storage, and real-time features.

## Key Features

* **Authentication**: Secure user sign-up and sign-in.
* **Household Management**: Create, join, and manage households with unique join codes.
* **Expense Tracking**: Add expenses with custom splits (equal, by amount, or by percentage).
* **Recurring Expenses**: Set up and automatically process recurring bills like rent and utilities.
* **Chore Management**: A comprehensive chore system with automated rotations and assignments.
* **Task Management**: Create and assign one-off tasks within a household.
* **Settlements**: Record payments between members and get suggestions for settling up.
* **Real-time Notifications**: Receive instant notifications for important household activities.
* **Household Chat**: A built-in chat for seamless communication.
* **House Rules**: Establish and manage a clear set of house rules.

## Technologies Used

* **Framework**: [Next.js](https://nextjs.org/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Backend**: [Supabase](https://supabase.io/) (for Auth, Database, Realtime)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **UI Components**: [Lucide React](https://lucide.dev/) (for icons)
* **UI Primitives**: [Radix UI](https://www.radix-ui.com/)
* **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
* **Linting**: [ESLint](https://eslint.org/)
* **Font**: [Manrope](https://fonts.google.com/specimen/Manrope) (from Google Fonts)
* **Testing**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js (v20 or later)
* npm (comes with Node.js)
* A Supabase project

### Setup Environment Variables

1.  Create a Supabase project at [database.new](https://database.new).
2.  In the root of your project, create a new file named `.env.local`.
3.  Add your Supabase URL and Anon Key to this file:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

    You can find these keys in your Supabase project's **Settings > API** section.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd roomies_app
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

1.  Start the Next.js development server:
    ```bash
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

In the project directory, you can run the following commands:

* `npm run dev`: Runs the app in development mode.
* `npm run build`: Builds the app for production.
* `npm run start`: Starts the production server.
* `npm run lint`: Lints the project files using ESLint.
* `npm test`: Runs the test suite with Jest.

## Project Structure

A brief overview of the project's directory structure:

* `public/`: Static assets.
* `src/app/`: Next.js App Router pages and layouts.
* `src/components/`: Reusable React components.
* `src/hooks/`: Custom React hooks.
* `src/lib/`:
    * `api/`: Functions for interacting with the Supabase backend.
    * `supabase.ts`: Supabase client initialization.
    * `types/`: TypeScript type definitions.
* `eslint.config.mjs`: ESLint configuration.
* `next.config.ts`: Next.js configuration.
* `jest.config.js`: Jest configuration.
* `package.json`: Project dependencies and scripts.
* `tailwind.config.ts`: Tailwind CSS configuration.
* `tsconfig.json`: TypeScript configuration.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new), from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
