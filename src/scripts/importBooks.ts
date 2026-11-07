import { connectDB } from "@/lib/db"
import { Book } from "@/models/Book"
import mongoose from "mongoose"

const START_URL = "https://gutendex.com/books/?sort=ascending"
const TRUSTED_HOST = "gutendex.com"
const TARGET = 1000
const MAX_ATTEMPTS = 4
const TIMEOUT_MS = 60_000
const PAGE_DELAY_MS = 500
const MAX_CONSECUTIVE_FAILURES = 3

type GutendexBook = {
    id: number
    title: string
    authors: {name:string; birth_year: number|null; death_year: number|null}[]
    subjects: string[]
    languages: string[]
    formats: Record<string, string>
    download_count: number
}

type GutendexPage = {
    count: number
    next:string|null
    previous: string|null
    results: GutendexBook[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url: string): Promise<GutendexPage> {
    for(let attempt = 1; ; attempt++){
        try{
            const response = await fetch(url, {signal: AbortSignal.timeout(TIMEOUT_MS)})
            if(!response.ok) throw new Error(`HTTP ${response.status}`)
            return (await response.json()) as GutendexPage
        }catch(error){
            if(attempt>=MAX_ATTEMPTS) throw error
            const wait = 1000*2**(attempt-1)
            const reason = error instanceof(Error) ? error.message:String(error)
            console.warn(`Attempt ${attempt} failed (${reason}). Retrying in ${wait} ms...`)
            await sleep(wait)
        }
    }
}

function assertTrusted(url: string): void{
    if(new URL(url).hostname!==TRUSTED_HOST) {
        throw new Error(`Refusing to follow unexpected URL: ${url}`)
    }
}

function nextPageUrl(url: string): string {
  const parsed = new URL(url);
  const current = Number(parsed.searchParams.get("page") ?? "1");
  parsed.searchParams.set("page", String(current + 1));
  return parsed.toString();
}

function toBookFields(book: GutendexBook){
    return {
        sourceId: book.id,
        title: book.title,
        authors: book.authors.map((author)=> ({
            name: author.name,
            birthYear: author.birth_year??undefined,
            deathYear: author.birth_year??undefined
        })),
        subjects: book.subjects,
        languages: book.languages,
        coverImage: book.formats["image/jpeg"],
        formats: new Map(
            Object.entries(book.formats).map(([key, value]) => [key.replaceAll(".", "_"), value])
        ),
        downloadCount: book.download_count,
    };
}

async function upsertBooks(books: GutendexBook[]){
    return Book.bulkWrite(
        books.map((book)=>({
            updateOne: {
                filter: {sourceId: book.id},
                update: {$set: toBookFields(book)},
                upsert: true,
            },
        })),
        {ordered: false}
    );
}

async function main() {
  await connectDB();
  await Book.syncIndexes();

  const collected = new Map<number, GutendexBook>();
  const skipped: string[] = [];
  let consecutiveFailures = 0;
  let url: string | null = START_URL;
  let page = 0;

  while (url && collected.size < TARGET) {
    const currentUrl: string = url
    assertTrusted(currentUrl);
    page++;
    try {
      const data = await fetchPage(url);
      data.results.forEach((book) => collected.set(book.id, book));
      consecutiveFailures = 0;
      console.log(`Page ${page}: ${collected.size} collected`);
      url = data.next;
    } catch (error) {
      consecutiveFailures++;
      const reason = error instanceof Error ? error.message : String(error);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        throw new Error(`Gutendex looks unavailable (last error: ${reason})`);
      }
      console.warn(`Page ${page} failed (${reason}). Skipping to the next page.`);
      skipped.push(url);
      url = nextPageUrl(url);
    }
    if (url && collected.size < TARGET) await sleep(PAGE_DELAY_MS);
  }

  const unrecovered: string[] = [];
  for (const skippedUrl of skipped) {
    try {
      const data = await fetchPage(skippedUrl);
      data.results.forEach((book) => collected.set(book.id, book));
      console.log(`Recovered ${skippedUrl}`);
    } catch {
      unrecovered.push(skippedUrl);
    }
  }
  if (unrecovered.length > 0) {
    console.warn(`Could not recover ${unrecovered.length} page(s):\n${unrecovered.join("\n")}`);
  }

  const books = [...collected.values()].sort((a, b) => a.id - b.id).slice(0, TARGET);

  const result = await upsertBooks(books);
  const inDb = await Book.countDocuments({ sourceId: { $in: books.map((book) => book.id) } });
  const total = await Book.countDocuments();
  console.log(
    `Inserted ${result.upsertedCount}, updated ${result.modifiedCount}. Collection total: ${total}`
  );

  if (books.length !== TARGET || inDb !== TARGET) {
    throw new Error(`Expected ${TARGET} books, collected ${books.length}, found ${inDb} in MongoDB`);
  }
  console.log(`Verified: ${inDb} unique books in MongoDB`);
}

main()
    .catch((error) => {
        console.error("import failed:", error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(() => mongoose.disconnect());