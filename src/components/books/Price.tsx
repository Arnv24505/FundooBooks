import { formatINR } from "@/lib/money";

export default function Price({
  price,
  originalPrice,
  size = "normal",
}: {
  price?: number | null;
  originalPrice?: number | null;
  size?: "normal" | "large";
}) {
  if (!price) {
    return <span className={size === "large" ? "price-now" : "price-was"}>Not priced</span>;
  }
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <span className="price-row" style={size === "large" ? { paddingTop: 0 } : undefined}>
      <span className="price-now">{formatINR(price)}</span>
      {originalPrice && originalPrice > price ? (
        <span className="price-was">{formatINR(originalPrice)}</span>
      ) : null}
      {discount > 0 ? <span className="price-off">{discount}% off</span> : null}
    </span>
  );
}
