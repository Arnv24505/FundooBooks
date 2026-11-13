import { env } from "@/lib/env";

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const bookListResponse = {
  description: "Paginated books",
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/Success" },
          {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: "#/components/schemas/Book" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          },
        ],
      },
    },
  },
};

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bookstore API",
      version: "1.0.0",
      description:
        "Route handlers for the Bookstore app: catalogue, authentication, cart, wishlist, addresses, COD orders and admin operations. Authentication uses an HTTP-only JWT cookie (`bookstore_session`).",
    },
    servers: [{ url: env.appUrl }],
    tags: [
      { name: "Books" },
      { name: "Auth" },
      { name: "Cart" },
      { name: "Wishlist" },
      { name: "Addresses" },
      { name: "Orders" },
      { name: "Admin" },
      { name: "System" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "bookstore_session" },
      },
      schemas: {
        Success: {
          type: "object",
          properties: { success: { type: "boolean", example: true } },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                details: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
            totalPages: { type: "integer" },
            hasNextPage: { type: "boolean" },
            hasPreviousPage: { type: "boolean" },
          },
        },
        Author: {
          type: "object",
          properties: {
            name: { type: "string" },
            birthYear: { type: "integer", nullable: true },
            deathYear: { type: "integer", nullable: true },
          },
        },
        Book: {
          type: "object",
          properties: {
            _id: { type: "string" },
            sourceId: { type: "integer" },
            title: { type: "string" },
            authors: { type: "array", items: { $ref: "#/components/schemas/Author" } },
            subjects: { type: "array", items: { type: "string" } },
            languages: { type: "array", items: { type: "string" } },
            coverImage: { type: "string", nullable: true },
            downloadCount: { type: "integer" },
            description: { type: "string", nullable: true },
            publisher: { type: "string", nullable: true },
            price: { type: "integer", description: "Whole Indian Rupees" },
            originalPrice: { type: "integer", nullable: true },
            stock: { type: "integer" },
            rating: { type: "number" },
            reviewCount: { type: "integer" },
            isDemoData: { type: "boolean" },
          },
        },
        SafeUser: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            mobile: { type: "string" },
            role: { type: "string", enum: ["user", "admin"] },
            provider: { type: "string", enum: ["local", "google"] },
          },
        },
        CartItem: {
          type: "object",
          properties: {
            bookId: { type: "string" },
            title: { type: "string" },
            author: { type: "string" },
            coverImage: { type: "string" },
            price: { type: "integer" },
            stock: { type: "integer" },
            quantity: { type: "integer" },
            lineTotal: { type: "integer" },
          },
        },
        Address: {
          type: "object",
          required: ["fullName", "mobile", "line1", "city", "state", "pincode"],
          properties: {
            _id: { type: "string" },
            label: { type: "string", enum: ["home", "work", "other"] },
            fullName: { type: "string" },
            mobile: { type: "string" },
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            pincode: { type: "string" },
            isDefault: { type: "boolean" },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string" },
            items: { type: "array", items: { type: "object" } },
            customer: { type: "object" },
            shippingAddress: { $ref: "#/components/schemas/Address" },
            subtotal: { type: "integer" },
            shippingFee: { type: "integer" },
            total: { type: "integer" },
            paymentMethod: { type: "string", enum: ["cod"] },
            status: {
              type: "string",
              enum: ["placed", "confirmed", "shipped", "delivered", "cancelled"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/books": {
        get: {
          tags: ["Books"],
          summary: "List books with search, filters, sort and DB pagination",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "author", in: "query", schema: { type: "string" } },
            { name: "minPrice", in: "query", schema: { type: "number" } },
            { name: "maxPrice", in: "query", schema: { type: "number" } },
            { name: "inStock", in: "query", schema: { type: "string", enum: ["true", "false"] } },
            {
              name: "sort",
              in: "query",
              schema: {
                type: "string",
                enum: ["popular", "price_asc", "price_desc", "rating", "newest"],
              },
            },
          ],
          responses: { "200": bookListResponse, "400": errorResponse },
        },
      },
      "/api/books/{id}": {
        get: {
          tags: ["Books"],
          summary: "Book detail with first page of reviews",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Book" }, "404": errorResponse },
        },
      },
      "/api/books/facets": {
        get: {
          tags: ["Books"],
          summary: "Filter facets: subjects, authors and price range",
          responses: { "200": { description: "Facets" } },
        },
      },
      "/api/books/{id}/related": {
        get: {
          tags: ["Books"],
          summary: "Related books by subject",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Related books" } },
        },
      },
      "/api/books/{id}/reviews": {
        get: {
          tags: ["Books"],
          summary: "List reviews",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          ],
          responses: { "200": { description: "Reviews" } },
        },
        post: {
          tags: ["Books"],
          summary: "Create or update your review",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["rating"],
                  properties: {
                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    title: { type: "string" },
                    comment: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Saved" }, "401": errorResponse },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create an account and set the session cookie",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    mobile: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Created" }, "409": errorResponse },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Sign in and set the session cookie",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Signed in" }, "401": errorResponse },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Clear the session cookie",
          responses: { "200": { description: "Signed out" } },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user (or null)",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Current user" } },
        },
      },
      "/api/auth/profile": {
        patch: {
          tags: ["Auth"],
          summary: "Update profile or password",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Updated" }, "401": errorResponse },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: { "200": { description: "Request accepted" }, "429": errorResponse },
        },
      },
      "/api/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Consume a reset token and set a new password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "password"],
                  properties: {
                    token: { type: "string" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated" }, "400": errorResponse },
        },
      },
      "/api/auth/google": {
        get: {
          tags: ["Auth"],
          summary: "Start Google OAuth",
          parameters: [
            { name: "next", in: "query", schema: { type: "string", example: "/cart" } },
          ],
          responses: { "302": { description: "Redirect to Google" } },
        },
      },
      "/api/auth/google/callback": {
        get: {
          tags: ["Auth"],
          summary: "Google OAuth callback",
          responses: { "302": { description: "Redirect back to the app" } },
        },
      },
      "/api/cart": {
        get: {
          tags: ["Cart"],
          summary: "Get the signed-in user's cart",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Cart" }, "401": errorResponse },
        },
        post: {
          tags: ["Cart"],
          summary: "Add a book to the cart",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["bookId"],
                  properties: {
                    bookId: { type: "string" },
                    quantity: { type: "integer", minimum: 1, maximum: 10, default: 1 },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Cart" }, "409": errorResponse },
        },
        delete: {
          tags: ["Cart"],
          summary: "Clear the cart",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Cleared" } },
        },
      },
      "/api/cart/{bookId}": {
        patch: {
          tags: ["Cart"],
          summary: "Change item quantity",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "bookId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Cart" } },
        },
        delete: {
          tags: ["Cart"],
          summary: "Remove an item",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "bookId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Cart" } },
        },
      },
      "/api/cart/merge": {
        post: {
          tags: ["Cart"],
          summary: "Merge a guest cart after signing in",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Cart" } },
        },
      },
      "/api/wishlist": {
        get: {
          tags: ["Wishlist"],
          summary: "List wishlist books and ids",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Wishlist" } },
        },
        post: {
          tags: ["Wishlist"],
          summary: "Add a book to the wishlist",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Wishlist" } },
        },
      },
      "/api/wishlist/{bookId}": {
        delete: {
          tags: ["Wishlist"],
          summary: "Remove a book from the wishlist",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "bookId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Wishlist" } },
        },
      },
      "/api/addresses": {
        get: {
          tags: ["Addresses"],
          summary: "List addresses",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Addresses" } },
        },
        post: {
          tags: ["Addresses"],
          summary: "Create an address",
          security: [{ cookieAuth: [] }],
          responses: { "201": { description: "Created" } },
        },
      },
      "/api/addresses/{id}": {
        patch: {
          tags: ["Addresses"],
          summary: "Update an address",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          tags: ["Addresses"],
          summary: "Delete an address",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } },
        },
      },
      "/api/orders": {
        get: {
          tags: ["Orders"],
          summary: "List my orders",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Orders" } },
        },
        post: {
          tags: ["Orders"],
          summary: "Place a cash-on-delivery order from the cart",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    addressId: { type: "string" },
                    address: { $ref: "#/components/schemas/Address" },
                    customer: {
                      type: "object",
                      properties: { fullName: { type: "string" }, mobile: { type: "string" } },
                    },
                    paymentMethod: { type: "string", enum: ["cod"], default: "cod" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Order created" }, "409": errorResponse },
        },
      },
      "/api/orders/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Order detail",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Order" }, "404": errorResponse },
        },
      },
      "/api/stock-alerts": {
        post: {
          tags: ["Books"],
          summary: "Ask to be emailed when an out-of-stock book returns",
          responses: { "200": { description: "Subscribed" } },
        },
      },
      "/api/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Dashboard metrics",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Stats" }, "403": errorResponse },
        },
      },
      "/api/admin/books": {
        get: {
          tags: ["Admin"],
          summary: "List books for administration",
          security: [{ cookieAuth: [] }],
          responses: { "200": bookListResponse },
        },
        post: {
          tags: ["Admin"],
          summary: "Create a manual book",
          security: [{ cookieAuth: [] }],
          responses: { "201": { description: "Created" } },
        },
      },
      "/api/admin/books/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Update a book (price, stock, details)",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete a book",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } },
        },
      },
      "/api/admin/orders": {
        get: {
          tags: ["Admin"],
          summary: "All orders",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Orders" } },
        },
      },
      "/api/admin/orders/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Move an order through its status workflow",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } },
        },
      },
      "/api/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "List customers",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Users" } },
        },
      },
      "/api/admin/users/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Promote or demote a customer (never your own account)",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Updated" },
            "400": errorResponse,
            "404": errorResponse,
            "409": errorResponse,
          },
        },
      },
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Database health check",
          responses: {
            "200": { description: "Connected" },
            "503": { description: "Database unavailable" },
          },
        },
      },
    },
  };
}
