import { type InferSchemaType, model, type Model, models, Schema } from "mongoose";

const bookSchema = new Schema(
    {
        sourceId: {type: Number, required: true, unique: true},
        title: {type: String, required:true,trim:true},
        authors: {
            type: [
                {
                    _id: false,
                    name: {type: String,  required: true},
                    birthYear: Number,
                    deathYear: Number,
                },
            ],
            default: [],
        },
        subjects: {type: [String], default: []},
        languages: {type: [String], default: []},
        coverImage: String,
        formats: {type: Map, of:String},
        downloadCount: {type: Number, default: 0 },

        isbn: String,
        description: String,
        publisher: String,
        binding: String,
        price: {type: Number, min:0},
        originalPrice: { type: Number, min: 0 },
        stock: { type: Number, min: 0, default: 0 },
        rating: { type: Number, min: 0, max: 5 },
        reviewCount: { type: Number, min: 0, default: 0 },
        isDemoData: { type: Boolean, default: false },
    },
    { timestamps: true }
)

bookSchema.index({ isbn: 1 });
bookSchema.index({ title: 1 });
bookSchema.index({ "authors.name": 1 });
bookSchema.index({ subjects: 1 });

export type BookDoc = InferSchemaType<typeof bookSchema>;

export const Book: Model<BookDoc> =
  (models.Book as Model<BookDoc> | undefined) ?? model<BookDoc>("Book", bookSchema);