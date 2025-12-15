# Deploying on Render (Docker)

This guide explains how to deploy your "Hybrid" Next.js + Python application on Render using the provided `Dockerfile`.

## Prerequisites

1.  Push your code to a **GitHub Repository**.
2.  Ensure `Dockerfile` is in the root of your repo.

## Step 1: Create a New Web Service

1.  Log in to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.

## Step 2: Configure the Service

- **Name**: `dashboard-careernine` (or any name)
- **Region**: Choose one close to you (e.g., Singapore or Frankfurt).
- **Runtime**: Select **Docker**.
- **Instance Type**: **Standard** (Recommended) or Starter.
  - _Note: The Free tier might be too slow for generating PDFs/Reports, but you can try it._

## Step 3: Environment Variables

You must add the following Environment Variables in the Render Dashboard:

| Key                              | Value                               | Description                          |
| :------------------------------- | :---------------------------------- | :----------------------------------- |
| `OPENAI_API_KEY`                 | `sk-...`                            | Your OpenAI Key for summaries.       |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/service-account.json` | Path to the secret file (see below). |

### Setting up the Google Service Account File

Since you cannot upload files directly to env vars, Render uses "Secret Files".

1.  In the Render Dashboard for your service, go to **Environment**.
2.  Scroll down to **Secret Files**.
3.  Click **Add Secret File**.
4.  **Filename**: `service-account.json`
5.  **Content**: Paste the _entire content_ of your `ServiceAccountKey.json` file here.
6.  Click **Save**.
    - Render will mount this file at `/etc/secrets/service-account.json`.
    - This matches the `GOOGLE_APPLICATION_CREDENTIALS` variable we set above.

## Step 4: Deploy

1.  Click **Create Web Service**.
2.  Render will start building your Docker image. This may take 5-10 minutes.
3.  Once "Live", your app is running!

## Important Notes

### 1. Ephemeral Filesystem (Data Loss)

Render instances are "ephemeral". If the app restarts or redeploys, **all files in `Reports/` will be deleted**.

- **Solution**: This is why we built the **"Upload to Drive"** feature.
- **Workflow**: Generate reports -> Immediately upload them to Google Drive -> Download from Drive.
- Do not rely on the "Download ZIP" button for reports generated days ago; they won't exist.

### 2. Performance

- Generating reports is CPU intensive. If the server crashes or times out, upgrade to a higher instance plan (e.g., Standard).
