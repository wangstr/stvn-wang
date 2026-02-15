# stvn-wang

Static website hosted on Cloudflare Pages.

## Getting Started

This is a basic HTML/CSS static website. To view it locally:

1. Open `index.html` in your browser, or
2. Use a local server:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## Deployment

This site is designed to be deployed on Cloudflare Pages:

1. Push your changes to GitHub
2. Connect your repository to Cloudflare Pages
3. Cloudflare will automatically build and deploy your site

### Cloudflare Pages Setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Connect your GitHub account
4. Select this repository
5. Configure build settings:
   - Build command: (leave empty for static HTML)
   - Build output directory: `/`
6. Click "Save and Deploy"

## Project Structure

```
.
├── index.html      # Main HTML file
├── style.css       # Styles
└── README.md       # This file
```

## License

MIT
