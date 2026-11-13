export type SafeUser = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: "user" | "admin";
  provider: "local" | "google";
  avatarUrl?: string;
};

export type BookAuthor = {
  name: string;
  birthYear?: number;
  deathYear?: number;
};

export type Book = {
  _id: string;
  sourceId: number;
  title: string;
  authors: BookAuthor[];
  subjects: string[];
  languages: string[];
  coverImage?: string;
  downloadCount: number;
  description?: string;
  publisher?: string;
  isbn?: string;
  binding?: string;
  price?: number;
  originalPrice?: number;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  isDemoData?: boolean;
  createdAt?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CartItem = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  quantity: number;
  lineTotal: number;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
};

export type CartData = {
  items: CartItem[];
  summary: CartSummary;
};

export type GuestCartItem = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  quantity: number;
};

export type Address = {
  _id: string;
  label: "home" | "work" | "other";
  fullName: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export type OrderItem = {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
};

export type OrderStatus = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  customer: { fullName: string; mobile: string };
  shippingAddress: Omit<Address, "_id" | "isDefault">;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "cod";
  status: OrderStatus;
  statusHistory: Array<{ status: OrderStatus; at: string }>;
  createdAt: string;
};

export type Review = {
  _id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
};

export type ReviewSummary = { average: number; count: number };

export type BookFacets = {
  categories: string[];
  authors: string[];
  priceRange: { min: number; max: number };
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  pagination?: Pagination;
  ids?: string[];
  reviews?: { data: Review[]; summary: ReviewSummary };
};

export type AdminStats = {
  books: number;
  customers: number;
  orders: number;
  revenue: number;
  lowStock: number;
  pending: number;
  recentOrders: Order[];
};

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminEnvelope<T> = {
  success: boolean;
  data: T;
  pagination?: AdminPagination;
};

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  role: "user" | "admin";
  provider: "local" | "google";
  createdAt: string;
  lastLoginAt?: string;
};

export type AdminOrderUser = { _id: string; name: string; email: string };

export type AdminOrder = Order & {
  userId?: AdminOrderUser | string | null;
};
