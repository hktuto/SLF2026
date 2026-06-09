#!/usr/bin/env node

/**
 * Import Books from Excel to Strapi (book2 content type)
 *
 * Reads book data from an Excel file with multiple sheets.
 * Each sheet name represents a book category.
 *
 * Title parsing rules:
 * - "Chinese = English" -> title_HK + title_EN
 * - All English (no Chinese chars) -> title_EN only, order = 1000
 * - Has Chinese chars (no =) -> title_HK only, order = 0
 *
 * Usage: node utils/import-books-from-excel.js [path-to-excel-file]
 *
 * Environment variables:
 * - STRAPI_URL: URL of the Strapi instance (default: http://localhost:1338)
 * - API_TOKEN: API token for authentication (optional)
 * - DRY_RUN: Set to 'true' to simulate without making changes
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Configuration
const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1338";
const API_TOKEN = process.env.API_TOKEN;
const DRY_RUN = process.env.DRY_RUN === "true";

// Default Excel file path
const DEFAULT_EXCEL_PATH = path.join(__dirname, "..", "apps", "backend", "Proposed Booklist for SLF2026_29May2025.xlsx");

// Category name mapping: Chinese -> English
const CATEGORY_EN_MAP = {
  "親子及STEAM工作坊": "Parent & Child and STEAM Workshop",
  "青少年及成人工作坊": "Teenager & Adult Workshop",
  "故事工作坊": "Story Workshop",
  "A BUS": "A BUS",
  "從星空中自製幸福": "Create Happiness from Starry Sky",
  "閱讀X音頻體驗工作坊": "Reading x Audio Experience Workshop",
};

// Helper: Check if string contains Chinese characters
function hasChinese(str) {
  return /[\u4e00-\u9fff]/.test(str || "");
}

// Helper: Clean text (remove extra whitespace, newlines)
function cleanText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Helper: Parse book title
// Returns { title_HK, title_EN }
function parseTitle(titleStr) {
  const cleaned = cleanText(titleStr);
  if (!cleaned) return { title_HK: "", title_EN: "" };

  // Check if title contains " = " separator
  const separatorIndex = cleaned.indexOf(" = ");
  if (separatorIndex !== -1) {
    const title_HK = cleaned.substring(0, separatorIndex).trim();
    const title_EN = cleaned.substring(separatorIndex + 3).trim();
    return { title_HK, title_EN };
  }

  // No separator - determine language
  if (!hasChinese(cleaned)) {
    return { title_HK: "", title_EN: cleaned };
  }

  return { title_HK: cleaned, title_EN: "" };
}

// Helper: Determine field language placement
// Returns { hk: value, en: value }
function parseBilingualField(valueStr) {
  const cleaned = cleanText(valueStr);
  if (!cleaned) return { hk: "", en: "" };

  if (!hasChinese(cleaned)) {
    return { hk: "", en: cleaned };
  }

  return { hk: cleaned, en: "" };
}

// Helper: Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Create book in Strapi (book2 content type)
async function createBook(bookData) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create book2:`);
    console.log(`    Title HK: ${bookData.title_HK?.substring(0, 50) || "(none)"}`);
    console.log(`    Title EN: ${bookData.title_EN?.substring(0, 50) || "(none)"}`);
    console.log(`    Category: ${bookData.category_HK}`);
    console.log(`    Order: ${bookData.order}`);
    return { success: true };
  }

  const url = `${STRAPI_URL}/api/book2s`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  const body = JSON.stringify({ data: bookData });

  try {
    const response = await makeRequest(url, {
      method: "POST",
      headers,
      body,
    });

    if (response.status !== 200 && response.status !== 201) {
      console.error(`  Failed to create book2:`, response.status);
      if (response.data) {
        console.error(`  Error:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      }
      return { success: false };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`  Error creating book2:`, error.message);
    return { success: false };
  }
}

// Main function
async function main() {
  // Get Excel file path from command line or use default
  const excelPath = process.argv[2] || DEFAULT_EXCEL_PATH;

  console.log("Import Books from Excel to Strapi (book2)");
  console.log("==========================================\n");
  console.log(`Strapi URL: ${STRAPI_URL}`);
  console.log(`Excel File: ${excelPath}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log();

  // Check if file exists
  if (!fs.existsSync(excelPath)) {
    console.error(`Error: Excel file not found at ${excelPath}`);
    process.exit(1);
  }

  // Read Excel file
  let xlsx;
  try {
    xlsx = require("xlsx");
  } catch (e) {
    console.error("Error: xlsx package is required. Please install it with:");
    console.error("  npm install xlsx");
    console.error("or");
    console.error("  pnpm add xlsx");
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);

  // Collect all books from all sheets
  const allBooks = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const category_HK = sheetName.trim();
    const category_EN = CATEGORY_EN_MAP[category_HK] || category_HK;

    console.log(`Sheet: "${category_HK}" (${rows.length} rows)`);

    for (const row of rows) {
      const titleRaw = row["書名"] || "";
      const authorRaw = row["作者"] || "";
      const publisherRaw = row["出版者"] || "";
      const publishYearRaw = row["出版年份"];
      const linkRaw = row["實體書 Link"] || "";
      const eLinkRaw = row["電子書 Link"] || "";

      // Parse title
      const { title_HK, title_EN } = parseTitle(titleRaw);

      // Skip empty titles
      if (!title_HK && !title_EN) {
        console.log(`  ⚠ Skipping row with empty title`);
        continue;
      }

      // Determine if this is an English-only book
      const isEnglishBook = !title_HK && title_EN;

      // Parse author
      const authorParsed = parseBilingualField(authorRaw);

      // Parse publisher
      const publisherParsed = parseBilingualField(publisherRaw);

      // Parse year (as string for book2 schema)
      let year_HK = "";
      let year_EN = "";
      if (publishYearRaw) {
        const yearStr = String(publishYearRaw).trim();
        if (isEnglishBook) {
          year_EN = yearStr;
        } else {
          year_HK = yearStr;
        }
      }

      // Parse links - assign based on book language
      const link = cleanText(linkRaw);
      const eLink = eLinkRaw && eLinkRaw !== "N/A" ? cleanText(eLinkRaw) : "";

      let book_link_HK = "";
      let book_link_EN = "";
      let eBook_link_HK = "";
      let eBook_link_EN = "";

      if (isEnglishBook) {
        book_link_EN = link;
        eBook_link_EN = eLink;
      } else {
        book_link_HK = link;
        eBook_link_HK = eLink;
      }

      // Determine order: Chinese books = 0, English books = 1000
      const order = isEnglishBook ? 1000 : 0;

      const bookData = {
        category_HK,
        category_EN,
        title_HK: title_HK || undefined,
        title_EN: title_EN || undefined,
        author_HK: authorParsed.hk || undefined,
        author_EN: authorParsed.en || undefined,
        publisher_HK: publisherParsed.hk || undefined,
        publisher_EN: publisherParsed.en || undefined,
        year_HK: year_HK || undefined,
        year_EN: year_EN || undefined,
        book_link_HK: book_link_HK || undefined,
        book_link_EN: book_link_EN || undefined,
        eBook_link_HK: eBook_link_HK || undefined,
        eBook_link_EN: eBook_link_EN || undefined,
        order,
      };

      // Remove undefined values for cleaner payload
      Object.keys(bookData).forEach((key) => {
        if (bookData[key] === undefined) {
          delete bookData[key];
        }
      });

      allBooks.push(bookData);
    }
  }

  console.log(`\nTotal books to import: ${allBooks.length}\n`);

  // Import books
  let success = 0;
  let failed = 0;

  for (let i = 0; i < allBooks.length; i++) {
    const book = allBooks[i];
    const displayTitle = book.title_HK || book.title_EN || "(no title)";

    console.log(`[${i + 1}/${allBooks.length}] ${displayTitle.substring(0, 60)}`);

    try {
      const result = await createBook(book);

      if (result.success) {
        console.log(`  ✓ Success (order: ${book.order})`);
        success++;
      } else {
        console.log(`  ✗ Failed`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  const chineseCount = allBooks.filter((b) => b.order === 0).length;
  const englishCount = allBooks.filter((b) => b.order === 1000).length;

  console.log("\n" + "=".repeat(50));
  console.log("Import Summary");
  console.log("=".repeat(50));
  console.log(`Total books: ${allBooks.length}`);
  console.log(`  Chinese books (order=0): ${chineseCount}`);
  console.log(`  English books (order=1000): ${englishCount}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run the import
main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
