# Google Drive Upload Setup Instructions

If you encounter the error:
`QUOTA_ERROR: Service Accounts cannot own files in regular Drive folders...`

It means your Service Account has **0 bytes** of storage quota, which is the default for free setups. To fix this, you must use one of the following methods.

## Option A: Use a Shared Drive (Recommended)

This is the best solution if you have a Google Workspace account (Business or Education).

1.  **Create a Shared Drive**:

    - Go to Google Drive.
    - Click **Shared Drives** on the left sidebar.
    - Click **New** and give it a name (e.g., "Student Reports").

2.  **Add Service Account as Member**:

    - Open the new Shared Drive.
    - Click **Manage members**.
    - Add the **Service Account Email** (found in your `ServiceAccountKey.json` file, usually `client_email`) as a **Content Manager** or **Manager**.

3.  **Get the Folder ID**:

    - The ID is the last part of the URL when you are inside the Shared Drive.
    - Example: `https://drive.google.com/drive/u/0/folders/12345ABCDE...` -> ID is `12345ABCDE...`

4.  **Upload**:
    - In the dashboard, click "Upload to Drive".
    - When asked for **Parent Folder ID**, paste this ID.

## Option B: Enable Billing (For Personal Drives)

If you must use a Personal Drive folder:

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Navigate to **Billing**.
4.  **Enable Billing** for the project. You may need to add a credit card.
    - _Note: Service Account usage is usually free within standard limits, but enabling billing unlocks the default 15GB quota._
5.  Once billing is enabled, the Service Account will have its own storage quota, and you can upload to any folder shared with it.

## Option C: Use a Shared Folder (Requires Billing on Service Account)

If you just share a regular folder from your personal Drive:

1.  Create a folder in your Drive.
2.  Share it with the Service Account email as **Editor**.
3.  **Important**: This ONLY works if you have done **Option B** (Enabled Billing). Without billing, the Service Account cannot "own" the file it creates in your folder.

---

**Summary**:

- **Best Path**: Option A (Shared Drive) - No billing required.
- **Alternative**: Option B (Enable Billing) - Works with any shared folder.
