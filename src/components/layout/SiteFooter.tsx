export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-page footer-inner">
        <span>
          Copyright © {new Date().getFullYear()}, Bookstore Private Limited. All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
