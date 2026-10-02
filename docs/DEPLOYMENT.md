# GitHub Pages

Publish main from / (root) in GitHub repository Settings > Pages. Keep the custom domain fsrp.xyz and the root CNAME file. The existing DNS already routes to GitHub Pages; no Render or DNS migration is needed.

The generated index.html and section directories are committed, so Pages can serve them directly without a build service. .nojekyll disables Jekyll processing. To update content, run npm run build and push the changed source and HTML files to main.
