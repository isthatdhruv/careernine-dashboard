# Use Node.js 18 as the base image
FROM node:18-bullseye

# 1. Install Python and System Dependencies (including Puppeteer libs)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Working Directory
WORKDIR /app

# 3. Copy Package Files and Install Node Dependencies
COPY package*.json ./
RUN npm ci

# 4. Copy Python Requirements and Install Python Dependencies
# We install dependencies for both English and Hindi generators globally or in a shared venv
COPY report-gen-english/requirements.txt ./requirements-english.txt
COPY report-gen-hindi/requirements.txt ./requirements-hindi.txt

RUN pip3 install --no-cache-dir -r requirements-english.txt
RUN pip3 install --no-cache-dir -r requirements-hindi.txt

# 5. Copy Source Code
COPY . .

# 6. Build Next.js App
RUN npm run build

# 7. Expose Port
EXPOSE 3000

# 8. Start the Application
CMD ["npm", "start"]
