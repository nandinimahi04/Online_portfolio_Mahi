# 🚀 Nandini Maheshwaram Portfolio — Deployment Guide

This static portfolio is built with pure semantic HTML5, modern CSS3 (custom properties, glassmorphism, responsive grids), and Vanilla JavaScript (ES6+). It has zero heavy dependencies and can be deployed instantly for free on any modern hosting provider.

---

## ⚡ Quick Deployment Options

### Option 1: GitHub Pages (Recommended — 100% Free)
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Portfolio"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **GitHub Actions** (the included `.github/workflows/deploy.yml` will automatically deploy on every push) OR choose **Deploy from a branch** -> select `main` branch and `/Online_Portfolio` folder.
3. Your site will be live at: `https://<your-username>.github.io/<your-repo-name>/`

---

### Option 2: Vercel (Instant 1-Click Deploy)
1. Install Vercel CLI (optional) or use the web dashboard:
   - CLI:
     ```bash
     cd Online_Portfolio
     npx vercel
     ```
   - Web Dashboard:
     - Go to [vercel.com/new](https://vercel.com/new).
     - Import your GitHub repository.
     - Set **Root Directory** to `Online_Portfolio`.
     - Click **Deploy**.
2. Your portfolio will receive a custom `.vercel.app` URL with automatic SSL, global CDN edge caching, and instant CI/CD.

---

### Option 3: Netlify (Drag & Drop or Git)
1. **Drag & Drop**:
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop).
   - Drag and drop the `Online_Portfolio` folder directly onto the browser window.
   - It goes live in 5 seconds!
2. **Git Continuous Deployment**:
   - Link your GitHub repo in Netlify.
   - Set **Base directory** to `Online_Portfolio` and **Publish directory** to `.`
   - Click **Deploy Site**.

---

### Option 4: Local Preview
To test locally before deploying:
```bash
cd Online_Portfolio
npx serve . -p 5000
```
Open [http://localhost:5000](http://localhost:5000) in your browser.
