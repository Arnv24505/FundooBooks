import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * Promote an existing account to admin.
 * Usage: npm run make:admin -- you@example.com
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run make:admin -- you@example.com");
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { returnDocument: "after" }
  ).lean();

  if (!user) {
    console.error(`No account found for ${email}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${user.email} is now an admin.`);
}

main()
  .catch((error) => {
    console.error("make-admin failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
