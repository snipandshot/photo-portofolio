# Photography portfolio

Plain HTML/CSS/JS site, ready for Netlify.

## Files
- index.html: portfolio grid with category filters and full-screen viewer
- about.html: bio and selected clients
- contact.html: enquiry form (works automatically with Netlify Forms)
- thanks.html: shown after the form is sent
- 404.html: not-found page
- assets/css/style.css: all styling (colors and fonts at the top)
- assets/js/main.js: mobile menu, filters, lightbox
- images/: your photos
- netlify.toml: Netlify settings

## Add a photo
In index.html copy a <figure> block and change it to:

    <figure data-category="fashion">
      <img src="/images/fashion-01.jpg" data-full="/images/fashion-01-large.jpg"
           width="1200" height="1600" alt="Model in red dress, studio" loading="lazy">
    </figure>

data-category must be: fashion, beauty, portrait or editorial
(or add a new button in the .filters bar with a matching data-filter).

## Preview locally
    python3 -m http.server 8000
then open http://localhost:8000
