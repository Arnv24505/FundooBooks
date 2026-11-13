import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { ApiError } from "@/lib/apiError";
import { Address } from "@/models/Address";

export async function listAddresses(userId: string) {
  await connectDB();
  return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

export async function createAddress(userId: string, input: Record<string, unknown>) {
  await connectDB();
  const count = await Address.countDocuments({ userId });
  const makeDefault = input.isDefault === true || count === 0;

  if (makeDefault) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const address = await Address.create({ ...input, userId, isDefault: makeDefault });
  return address.toObject();
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: Record<string, unknown>
) {
  if (!isValidObjectId(addressId)) throw new ApiError(400, "Invalid address id");
  await connectDB();
  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) throw new ApiError(404, "Address not found");

  if (input.isDefault === true) {
    await Address.updateMany({ userId, _id: { $ne: address._id } }, { $set: { isDefault: false } });
  }

  Object.assign(address, input);
  await address.save();
  return address.toObject();
}

export async function deleteAddress(userId: string, addressId: string) {
  if (!isValidObjectId(addressId)) throw new ApiError(400, "Invalid address id");
  await connectDB();
  const address = await Address.findOneAndDelete({ _id: addressId, userId });
  if (!address) throw new ApiError(404, "Address not found");

  if (address.isDefault) {
    const next = await Address.findOne({ userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  return { deleted: true };
}

export async function getAddressForUser(userId: string, addressId: string) {
  if (!isValidObjectId(addressId)) throw new ApiError(400, "Invalid address id");
  await connectDB();
  const address = await Address.findOne({ _id: addressId, userId }).lean();
  if (!address) throw new ApiError(404, "Address not found");
  return address;
}
