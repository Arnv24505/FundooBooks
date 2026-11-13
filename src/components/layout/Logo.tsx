import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Bookstore home">
      <svg
        width="28"
        height="26"
        viewBox="0 0 28 26"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2 3.2c3.6-1.5 7.3-1.5 11 0v19.1c-3.7-1.5-7.4-1.5-11 0V3.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M26 3.2c-3.6-1.5-7.3-1.5-11 0v19.1c3.7-1.5 7.4-1.5 11 0V3.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M14 3.6v18.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span>bookstore</span>
    </Link>
  );
}
