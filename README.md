# PuffKiss Website

PuffKiss is a static HTML/CSS/JavaScript website with an optional Node local API.

## Run Locally

```powershell
node server.js
```

Open:

```text
http://127.0.0.1:4173/
```

## Run On GitHub Pages

GitHub Pages only runs static files. This project is ready for that: when the Node API is not available, the site automatically saves comments, donations, uploads, likes, follows, and login state in the browser with `localStorage`.

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Commit to the `main` branch.
4. In GitHub, open `Settings > Pages`.
5. Set `Build and deployment` to `GitHub Actions`.
6. Push to `main` again, or run the `Deploy PuffKiss to GitHub Pages` workflow manually.

The homepage is `index.html`.

## Files

- `index.html` - homepage, login/sign-up modals, and locked creator app
- `styles.css` - all layout and visual styling
- `script.js` - homepage interactions, auth gate, app behavior, API/localStorage fallback
- `server.js` - optional local Node server with JSON API
- `assets/` - images used by the site
- `data/` - local JSON database for the Node server
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow
