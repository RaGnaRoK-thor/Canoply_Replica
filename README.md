# Mein Haus Am See - Airbnb Rental Website

**Live Demo**: <https://canoply-replica.vercel.app>

---

This project is a website for "Mein Haus Am See," an Airbnb rental, built using Next.js. It's a replica of a previous website, repurposed to showcase this beautiful vacation rental. The site is designed to serve a collection of static HTML pages through a modern React framework, offering a unique hybrid approach to web development.

The core of this project lies in its ability to take existing static HTML files and render them within a Next.js application. This allows for the potential addition of dynamic React components while leveraging the powerful routing and performance optimizations of Next.js.

## Original Template

This project is a replica of the "Canoply" Webflow template. You can find the original template here: <https://canoply-template.webflow.io/>

## ✨ Features

- **Static HTML Injection**: Dynamically loads and displays static HTML content from the `/public` directory.
- **Next.js App Router**: Utilizes the latest Next.js features for routing and layouts.
- **Clean URL Rewrites**: Implements clean, user-friendly URLs that map to underlying HTML files.
- **Component-Based Architecture**: Built with React, allowing for reusable UI components.
- **Pre-built Pages**: Includes a variety of pre-designed pages such as a gallery, booking page, and contact page.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/en/) (version 18.x or later) and [npm](https://www.npmjs.com/) installed on your machine.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/canoply-replica.git](https://github.com/your-username/canoply-replica.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd canoply-replica
    ```

3.  **Install the dependencies:**
    ```bash
    npm install
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Now, open <http://localhost:3000> in your browser to see the website.

## ⚙️ How It Works

This project uses a custom React component, `HtmlInjector`, to fetch the content of static `.html` files from the `/public` directory and render it within the Next.js pages.

The routing is handled by a combination of the Next.js App Router and custom rewrite rules defined in `next.config.js`. These rules map user-friendly URLs (e.g., `/about`) to the corresponding HTML files that the application should serve (e.g., `/about.html`).

## 📁 Project Structure

-   `app/` - Contains all the Next.js routes.
    -   `about/page.js`
    -   `blog/page.js`
-   `components/` - Holds reusable React components.
    -   `HtmlInjector.jsx`
-   `public/` - Stores static assets and all the `.html` files.
    -   `about.html`
    -   `book-now.html`
-   `styles/` - Contains global CSS files.
-   `next.config.js` - The main configuration file for Next.js.
-   `package.json` - Lists project dependencies and scripts.

## 📜 Available Scripts

In the project directory, you can run the following commands:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production.
-   `npm run start`: Starts the production server.

## 📦 Deployment

This application is deployed and live on Vercel at <https://canoply-replica.vercel.app>.

The easiest way to deploy a Next.js app is to use the [Vercel Platform](https://vercel.com/new). It offers a seamless deployment experience with automatic builds and previews.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details on deployment options.