# Voya Travel Website Template - Quick Start Guide

## File Structure

```
travel-website/
├── index.html          # Homepage
├── products.html       # Latest Trips page
├── promotions.html     # Deals page
├── journal.html        # Travel Journal page
├── about.html          # About Us page
├── css/
│   └── style.css       # All styling (Contiki-style)
├── js/
│   ├── config.js       # *** EDIT THIS FILE TO UPDATE CONTENT ***
│   └── main.js         # Auto-renders pages from config (don't edit)
└── images/             # Put your logo & images here
```

## How to Update Content

**Open `js/config.js` — this is the only file you need to edit.**

Everything is organized into clear sections with comments:

### 1. Brand Info (Section 1)
- `name`: Your company name
- `logoText`: Text shown if no logo image
- `logoImage`: Path to your logo, e.g. `"images/logo.png"`
- `promoBarText`: The announcement bar at the very top (leave `""` to hide)

### 2. Navigation (Section 2)
Add/remove menu items. Each item needs `label` and `href`.

### 3. Homepage Hero (Section 3)
- `image`: URL or path to hero background image
- `badge`, `title`, `subtitle`: Hero text
- `primaryBtn` / `secondaryBtn`: Button text and links

### 4. Destinations (Section 4)
Add destination tiles. Each needs `name` and `image`.

### 5. Products / Trips (Section 5)
Each product supports:
- `title`, `image`, `desc`: Basic info
- `badge`: `""` (none) | `"popular"` | `"hot"` | `"new"`
- `rating`: e.g. `4.7`
- `reviewCount`: Number of reviews
- `days`, `places`, `countries`: Trip meta info
- `priceFrom`: Starting price (number)
- `currency`: `"$"`, "EUR", etc.
- `category`: Used for filter buttons on products page

### 6. Promotions / Deals (Section 6)
Same as products, plus:
- `originalPrice`: Shows strikethrough price
- `saveAmount`: Shows "Save $XXX" badge
- `dealExpiry`: Date string for deal end

### 7. Travel Journal (Section 7)
Each article needs:
- `title`, `image`, `excerpt`
- `category`: e.g. "Inspiration", "Tips & Guides", "Stories"
- `author`, `date` (YYYY-MM-DD), `readTime`

### 8. Feature Banner & Stats (Sections 8-9)
Homepage promotional banner and stats row.

### 9. About Page (Section 10)
- `heroImage`, `heroTitle`, `heroSubtitle`
- `storyTitle`, `storyImage`, `storyText` (array of paragraphs)
- `missionTitle`, `missionImage`, `missionText`
- `values`: Array of {icon, title, desc}
- `aboutStats`: Same format as homepage stats

### 10. Footer (Section 11)
- `about`: Short company description
- `columns`: Footer link groups
- `social`: Social media icons
- `copyright`

## Replacing Images

1. Put your images in the `images/` folder
2. Reference them in config.js as `"images/your-photo.jpg"`

Or use any URL (Unsplash, your CDN, etc.) directly.

## Replacing Logo

1. Put your logo in `images/` (e.g. `images/logo.png`)
2. In config.js, set `brand.logoImage: "images/logo.png"`

## Deploying to Your Server

1. Upload the entire `travel-website/` folder to your web hosting
2. Make sure `index.html` is in the root or configured as the default page
3. No build step needed — it's pure static HTML/CSS/JS

## Customizing Colors

Open `css/style.css` and edit the `:root` variables at the top:

```css
--color-primary: #1B1B2F;    /* Dark navy - main text/footer */
--color-accent: #FF5A3C;     /* Coral orange - buttons/badges */
--color-yellow: #FFD60A;     /* Yellow - deal badges */
--color-teal: #00B8A9;       /* Teal - "New" badges */
```

## Tips

- All 5 pages share the same nav and footer — change config.js once, all pages update
- The homepage auto-shows the 3 newest products, 3 newest deals, and 3 newest journal entries
- Products and Journal pages have category filter buttons (auto-generated from your data)
- Everything is mobile-responsive
