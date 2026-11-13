# Frontend changes

Updated the existing Next.js frontend to better match the supplied 22-page Bookstore reference.

## Files changed
- `src/app/globals.css` — fixed light visual system, burgundy footer, five-column desktop catalogue, category navigation and responsive footer/auth styling.
- `src/app/providers.tsx` — keeps Ant Design in the light theme to match the reference rather than inheriting the OS dark-mode preference.
- `src/components/layout/SiteHeader.tsx` — adds visible Wishlist and guest Login/Sign up actions, plus category navigation connected to the existing `category` catalogue query parameter.
- `src/components/layout/SiteFooter.tsx` — matches the compact burgundy footer treatment and reference copy.
- `src/components/catalog/CatalogClient.tsx` — reads the supported category query parameter and updates catalogue heading/count copy.
- `src/components/auth/AuthShell.tsx` — adds the reference's login/signup-specific explanatory copy to the illustration panel.

## Notes
- Existing API routes, authentication flows, cart state, checkout/order logic and profile components were left intact.
- Category navigation uses the existing backend `category` filter.
- This archive contains the updated `src/` tree only, matching the structure of the supplied `src.zip`. The original archive did not include package metadata or dependencies, so a full Next.js build could not be run from the supplied files alone.
