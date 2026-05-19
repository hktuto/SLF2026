#!/usr/bin/env node

/**
 * Advanced Strapi Data Migration Script
 *
 * This script migrates content and media from an old Strapi instance to the new one.
 * It handles:
 * - Collection types and single types
 * - Media uploads
 * - Relations between content types
 * - Components (including nested components)
 *
 * Usage: node utils/migrate-strapi-data-advanced.js [options]
 *
 * Options:
 *   --clean-only    Only clean content from new Strapi, don't import
 *   --no-clean      Skip cleaning before migration (override CLEAN_BEFORE_MIGRATE env)
 *
 * Environment variables:
 * - OLD_STRAPI_URL: URL of the old Strapi instance
 * - NEW_STRAPI_URL: URL of the new Strapi instance
 * - OLD_API_TOKEN: API token for the old Strapi
 * - NEW_API_TOKEN: API token for the new Strapi
 * - SKIP_MEDIA: Set to 'true' to skip media migration
 * - DRY_RUN: Set to 'true' to simulate without making changes
 * - CLEAN_BEFORE_MIGRATE: Set to 'true' to remove all content before import (default: false)
 * - IMPORT_ONLY: Comma-separated list of content types to import (e.g., 'district,category,event')
 *                  Available: district, category, page, event, half-an-hour, footer, home, menu, popup
 * - EXCLUDE: Comma-separated list of content types to exclude (e.g., 'half-an-hour,event')
 *            Useful when you want to import all except specific types
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Configuration
const OLD_STRAPI_URL =
  process.env.OLD_STRAPI_URL || "https://library-2025-nq3wb.ondigitalocean.app";
const NEW_STRAPI_URL = process.env.NEW_STRAPI_URL || "http://localhost:1338";
const OLD_API_TOKEN = process.env.OLD_API_TOKEN;
const NEW_API_TOKEN = process.env.NEW_API_TOKEN;
const SKIP_MEDIA = process.env.SKIP_MEDIA === "true";
const DRY_RUN = process.env.DRY_RUN === "true";
const CLEAN_BEFORE_MIGRATE = process.env.CLEAN_BEFORE_MIGRATE === "true"; // Default to false
const IMPORT_ONLY = process.env.IMPORT_ONLY ? process.env.IMPORT_ONLY.split(",").map(s => s.trim()) : null;
const EXCLUDE = process.env.EXCLUDE ? process.env.EXCLUDE.split(",").map(s => s.trim()) : null;

// Temp directory for downloaded media
const TEMP_DIR = path.join(__dirname, ".temp-media");

// Content types configuration
const CONTENT_TYPES = [
  {
    name: "district",
    endpoint: "districts",
    isSingleType: false,
    hasMedia: false,
  },
  {
    name: "category",
    endpoint: "categories",
    isSingleType: false,
    hasMedia: true,
  },
  { name: "page", endpoint: "pages", isSingleType: false, hasMedia: true },
  { name: "event", endpoint: "events", isSingleType: false, hasMedia: true },
  {
    name: "half-an-hour",
    endpoint: "half-an-hours",
    isSingleType: false,
    hasMedia: true,
  },
  { name: "footer", endpoint: "footer", isSingleType: true, hasMedia: false },
  { name: "home", endpoint: "home", isSingleType: true, hasMedia: true },
  { name: "menu", endpoint: "menu", isSingleType: true, hasMedia: true },
  { name: "popup", endpoint: "popup", isSingleType: true, hasMedia: false },
];

// ID mapping for relations (old ID -> { id, documentId })
// Will be initialized based on content types being migrated
function createIdMapping(contentTypeNames) {
  const mapping = {};
  for (const name of contentTypeNames) {
    if (["district", "category", "page", "event", "half-an-hour"].includes(name)) {
      mapping[name] = {};
    }
  }
  return mapping;
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
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

// Helper: Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(dest);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

// Helper: Upload media to new Strapi
async function uploadMedia(
  filePath,
  fileName,
  alternativeText = "",
  caption = "",
) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload: ${fileName}`);
    return { id: Math.random().toString(36), mock: true };
  }

  const url = `${NEW_STRAPI_URL}/api/upload`;
  const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);

  const fileData = fs.readFileSync(filePath);

  const formData = Buffer.concat([
    Buffer.from(
      `------${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ),
    fileData,
    Buffer.from(`\r\n------${boundary}--\r\n`),
  ]);

  const headers = {
    "Content-Type": `multipart/form-data; boundary=----${boundary}`,
    "Content-Length": formData.length,
  };

  if (NEW_API_TOKEN) {
    headers["Authorization"] = `Bearer ${NEW_API_TOKEN}`;
  }

  try {
    const response = await makeRequest(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status !== 200 && response.status !== 201) {
      console.error(`  Failed to upload media:`, response.status);
      return null;
    }

    return response.data[0];
  } catch (error) {
    console.error(`  Error uploading media:`, error.message);
    return null;
  }
}

// Build populate query for content type
function buildPopulateQuery(contentTypeName) {
  // Define specific populate strategies for each content type
  // Using Strapi v4 populate syntax
  const populateStrategies = {
    // Home has Slider (component with image/thumbnail) and menu (component with image/subMenu)
    // Need to deeply populate subMenu images
    home: "populate[Slider][populate][image]=true&populate[Slider][populate][thumbnail]=true&populate[menu][populate][image]=true&populate[menu][populate][subMenu][populate][image]=true",
    // Menu has logo (media) and item (component with image/subMenu)
    // Need to deeply populate subMenu images
    menu: "populate[logo]=true&populate[item][populate][image]=true&populate[item][populate][subMenu][populate][image]=true",
    // Event has photos (media), slides (component with image/thumbnail), programs (component with district)
    event:
      "populate[photos]=true&populate[slides][populate]=*&populate[programs][populate][district]=true&populate[categories]=true",
    // Category has feature (media) and events (relation)
    category: "populate[feature]=true&populate[events]=true",
    // Page has feature (media)
    page: "populate[feature]=true",
    // Half-an-hour has images (media) and district (relation)
    "half-an-hour": "populate[images]=true&populate[district]=true",
    // District has no media or components
    district: "",
    // Footer has no media
    footer: "",
    // Popup has no media
    popup: "",
  };

  return populateStrategies[contentTypeName] || "";
}

// Fetch data from old Strapi
async function fetchFromOld(
  endpoint,
  contentTypeName,
  isSingleType = false,
  page = 1,
  pageSize = 100,
) {
  const populateQuery = buildPopulateQuery(contentTypeName);

  let url;
  if (isSingleType) {
    url = `${OLD_STRAPI_URL}/api/${endpoint}${populateQuery ? "?" + populateQuery : ""}`;
  } else {
    const paginationQuery = `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    url = `${OLD_STRAPI_URL}/api/${endpoint}?${populateQuery ? populateQuery + "&" : ""}${paginationQuery}`;
  }

  console.log(`  Fetch URL: ${url.substring(0, 200)}...`);

  const headers = {};
  if (OLD_API_TOKEN) {
    headers["Authorization"] = `Bearer ${OLD_API_TOKEN}`;
  }

  try {
    const response = await makeRequest(url, { headers });
    if (response.status !== 200) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
    }

    if (isSingleType) {
      return response.data.data ? [response.data.data] : [];
    }
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    return [];
  }
}

// Process media in data (handles both direct media and media in components)
async function processMediaInData(data) {
  if (!data || typeof data !== "object") return data;

  // Handle arrays (like components)
  if (Array.isArray(data)) {
    const result = [];
    for (const item of data) {
      result.push(await processMediaInData(item));
    }
    return result;
  }

  const processed = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if this is a media field (has data with mime type)
    if (value && typeof value === "object" && value.data !== undefined) {
      if (Array.isArray(value.data)) {
        // Multiple media
        const mediaIds = [];
        for (const mediaItem of value.data) {
          if (mediaItem && mediaItem.attributes && mediaItem.attributes.mime) {
            const uploadedId = await processMediaItem(mediaItem);
            if (uploadedId) mediaIds.push(uploadedId);
          }
        }
        if (mediaIds.length > 0) {
          processed[key] = mediaIds;
        }
      } else if (value.data && value.data.attributes && value.data.attributes.mime) {
        // Single media
        const uploadedId = await processMediaItem(value.data);
        if (uploadedId) {
          processed[key] = uploadedId;
        }
      } else if (value.data === null) {
        // Null media
        processed[key] = null;
      } else {
        // This is a relation, not media
        processed[key] = value;
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // Nested object (could be a component)
      processed[key] = await processMediaInData(value);
    } else if (Array.isArray(value)) {
      // Array of components
      processed[key] = await processMediaInData(value);
    } else {
      processed[key] = value;
    }
  }

  return processed;
}

// Process a single media item
async function processMediaItem(mediaItem) {
  if (!mediaItem || !mediaItem.attributes) return null;

  const { url, name, alternativeText, caption, mime } = mediaItem.attributes;
  if (!url) return null;

  console.log(`    Processing media: ${name}`);

  if (SKIP_MEDIA) {
    console.log(`    [SKIP_MEDIA] Skipping upload`);
    return null;
  }

  // Download media from old Strapi
  let mediaUrl = url;
  if (url.startsWith("//")) {
    mediaUrl = "https:" + url;
  } else if (!url.startsWith("http")) {
    mediaUrl = `${OLD_STRAPI_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  const tempFilePath = path.join(
    TEMP_DIR,
    `${Date.now()}-${name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
  );

  try {
    await downloadFile(mediaUrl, tempFilePath);

    // Upload to new Strapi
    const uploaded = await uploadMedia(
      tempFilePath,
      name,
      alternativeText,
      caption,
    );

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    if (uploaded) {
      console.log(`    Uploaded: ${name} (ID: ${uploaded.id})`);
      return uploaded.id;
    }
  } catch (error) {
    console.error(`    Failed to process media ${name}:`, error.message);
  }

  return null;
}

// Clean data for new Strapi - handles Strapi v4 response format
function cleanData(item, contentTypeName, idMapping) {
  if (!item || typeof item !== "object") return item;

  if (Array.isArray(item)) {
    return item.map((i) => cleanData(i, contentTypeName));
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(item)) {
    // Skip Strapi internal fields
    if (
      ["id", "documentId", "createdAt", "updatedAt", "publishedAt"].includes(
        key,
      )
    ) {
      continue;
    }

    // Handle media fields - keep them for processing
    if (value && typeof value === "object" && value.data !== undefined) {
      // Check if it's media (has mime type) or a relation
      const isMedia =
        value.data &&
        ((Array.isArray(value.data) &&
          value.data.length > 0 &&
          value.data[0].attributes?.mime) ||
          (!Array.isArray(value.data) && value.data?.attributes?.mime));

      if (isMedia) {
        // Keep media for processing
        cleaned[key] = value;
      } else {
        // This is a relation - handle ID mapping
        // For Strapi v5, relations in request body use 'id' (the numeric ID)
        if (Array.isArray(value.data)) {
          // Many relation
          const relatedIds = value.data
            .map((related) => {
              const targetType = getRelationTargetType(contentTypeName, key);
              if (targetType && idMapping && idMapping[targetType] && related.id) {
                const mapped = idMapping[targetType][related.id];
                return mapped ? { id: mapped.id } : null;
              }
              return null;
            })
            .filter(Boolean);
          if (relatedIds.length > 0) {
            cleaned[key] = relatedIds;
          }
        } else if (value.data) {
          // Single relation
          const related = value.data;
          const targetType = getRelationTargetType(contentTypeName, key);
          if (targetType && idMapping && idMapping[targetType] && related.id) {
            const mapped = idMapping[targetType][related.id];
            if (mapped) {
              cleaned[key] = { id: mapped.id };
            }
          }
        }
      }
      continue;
    }

    // Handle components (arrays of objects with id)
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === "object" &&
      value[0].id !== undefined
    ) {
      // This is likely a component - pass component name for relation mapping
      const componentName = getComponentName(contentTypeName, key);
      cleaned[key] = value.map((comp) =>
        cleanData(comp, componentName || contentTypeName, idMapping),
      );
      continue;
    }

    // Handle nested objects
    if (value && typeof value === "object") {
      cleaned[key] = cleanData(value, contentTypeName, idMapping);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// Helper: Get component name for a field
function getComponentName(contentType, fieldName) {
  const mapping = {
    event: { slides: "ui.slide", programs: "programs.program" },
    home: { Slider: "ui.slide", menu: "ui.menu-item" },
    menu: { item: "ui.menu-item" },
    "ui.menu-item": { subMenu: "ui.sub-menu" },
  };
  return mapping[contentType]?.[fieldName];
}

// Helper: Get relation target type
function getRelationTargetType(contentType, fieldName) {
  const mapping = {
    category: { events: "event" },
    event: { categories: "category" },
    "half-an-hour": { district: "district" },
    "programs.program": { district: "district" },
  };
  return mapping[contentType]?.[fieldName];
}

// Post data to new Strapi
async function postToNew(endpoint, data, isSingleType = false) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create in ${endpoint}`);
    return {
      data: {
        id: Math.random().toString(36),
        documentId: Math.random().toString(36),
      },
    };
  }

  const url = `${NEW_STRAPI_URL}/api/${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
  };
  if (NEW_API_TOKEN) {
    headers["Authorization"] = `Bearer ${NEW_API_TOKEN}`;
  }

  const body = JSON.stringify({ data });

  try {
    const method = isSingleType ? "PUT" : "POST";
    const response = await makeRequest(url, {
      method,
      headers,
      body,
    });

    if (response.status !== 200 && response.status !== 201) {
      console.error(
        `  Failed to create:`,
        response.status,
        JSON.stringify(response.data, null, 2).substring(0, 500),
      );
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(`  Error posting:`, error.message);
    return null;
  }
}

// Check if new Strapi is accessible
async function checkNewStrapi() {
  if (DRY_RUN) {
    return true;
  }
  try {
    const response = await makeRequest(`${NEW_STRAPI_URL}/api/categories`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Clean all content from new Strapi
async function cleanNewStrapi(contentTypesToClean = null) {
  if (DRY_RUN) {
    console.log("[DRY RUN] Would clean content from new Strapi\n");
    return;
  }

  // Define cleanup order (dependent types first to avoid constraint errors)
  const allCleanupOrder = [
    { name: "event", endpoint: "events" },
    { name: "half-an-hour", endpoint: "half-an-hours" },
    { name: "home", endpoint: "home", isSingleType: true },
    { name: "menu", endpoint: "menu", isSingleType: true },
    { name: "footer", endpoint: "footer", isSingleType: true },
    { name: "popup", endpoint: "popup", isSingleType: true },
    { name: "page", endpoint: "pages" },
    { name: "category", endpoint: "categories" },
    { name: "district", endpoint: "districts" },
  ];

  // Filter cleanup order if specific content types are provided
  const cleanupOrder = contentTypesToClean 
    ? allCleanupOrder.filter(ct => contentTypesToClean.includes(ct.name))
    : allCleanupOrder;

  if (cleanupOrder.length === 0) {
    return;
  }

  console.log("Cleaning new Strapi content...");
  console.log(`Types to clean: ${cleanupOrder.map(ct => ct.name).join(", ")}\n`);

  const headers = {
    "Content-Type": "application/json",
  };
  if (NEW_API_TOKEN) {
    headers["Authorization"] = `Bearer ${NEW_API_TOKEN}`;
  }

  for (const { name, endpoint, isSingleType } of cleanupOrder) {
    try {
      if (isSingleType) {
        // For single types, we clear the data by sending empty object or deleting
        const url = `${NEW_STRAPI_URL}/api/${endpoint}`;
        const response = await makeRequest(url, { method: "DELETE", headers });
        if (
          response.status === 200 ||
          response.status === 204 ||
          response.status === 404
        ) {
          console.log(`  ✓ Cleaned ${name}`);
        } else {
          console.log(
            `  ⚠ Could not clean ${name} (status: ${response.status})`,
          );
        }
      } else {
        // For collection types, fetch all and delete each
        const listUrl = `${NEW_STRAPI_URL}/api/${endpoint}?pagination[pageSize]=100`;
        const listResponse = await makeRequest(listUrl, { headers });

        if (listResponse.status === 200 && listResponse.data.data) {
          const items = listResponse.data.data;
          let deletedCount = 0;

          for (const item of items) {
            const deleteUrl = `${NEW_STRAPI_URL}/api/${endpoint}/${item.documentId || item.id}`;
            const deleteResponse = await makeRequest(deleteUrl, {
              method: "DELETE",
              headers,
            });
            if (
              deleteResponse.status === 200 ||
              deleteResponse.status === 204
            ) {
              deletedCount++;
            }
          }

          if (deletedCount > 0) {
            console.log(`  ✓ Cleaned ${name}: ${deletedCount} item(s) deleted`);
          } else {
            console.log(`  ✓ Cleaned ${name}: no items to delete`);
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠ Error cleaning ${name}: ${error.message}`);
    }
  }

  console.log("\nCleanup complete.\n");
}

// Migrate a single content type
async function migrateContentType({ name, endpoint, isSingleType, hasMedia }, idMapping) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `Migrating: ${name} (${isSingleType ? "single type" : "collection type"})`,
  );
  console.log("=".repeat(60));

  // Fetch from old
  const items = await fetchFromOld(endpoint, name, isSingleType);
  console.log(`Found ${items.length} item(s)`);

  if (items.length === 0) {
    return { name, success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const item of items) {
    const oldId = item.id;
    const attributes = item.attributes || item;
    const title =
      attributes.title_HK ||
      attributes.title_EN ||
      attributes.name_HK ||
      attributes.name ||
      "unnamed";

    console.log(`\n→ ${title}`);

    // Clean data (remove IDs, handle relations)
    let cleanedData = cleanData(attributes, name, idMapping);

    // Process media (including media in components)
    if (!SKIP_MEDIA) {
      cleanedData = await processMediaInData(cleanedData);
    }

    // Post to new
    const result = await postToNew(endpoint, cleanedData, isSingleType);

    if (result && result.data) {
      console.log(
        `  ✓ Success (new ID: ${result.data.id}, documentId: ${result.data.documentId})`,
      );
      // Store ID mapping for relations - store both id and documentId
      if (idMapping[name] && result.data.id) {
        idMapping[name][oldId] = {
          id: result.data.id,
          documentId: result.data.documentId,
        };
      }
      success++;
    } else {
      console.log(`  ✗ Failed`);
      failed++;
    }
  }

  return { name, success, failed };
}

// Filter content types based on IMPORT_ONLY and EXCLUDE
function getContentTypesToMigrate() {
  let filtered = CONTENT_TYPES;
  
  // Handle IMPORT_ONLY (whitelist)
  if (IMPORT_ONLY) {
    filtered = filtered.filter(ct => IMPORT_ONLY.includes(ct.name));
    const notFound = IMPORT_ONLY.filter(name => !CONTENT_TYPES.find(ct => ct.name === name));
    
    if (notFound.length > 0) {
      console.warn(`⚠ Warning: The following content types were not found: ${notFound.join(", ")}`);
      console.warn(`  Available types: ${CONTENT_TYPES.map(ct => ct.name).join(", ")}\n`);
    }
  }
  
  // Handle EXCLUDE (blacklist)
  if (EXCLUDE) {
    filtered = filtered.filter(ct => !EXCLUDE.includes(ct.name));
    const notFound = EXCLUDE.filter(name => !CONTENT_TYPES.find(ct => ct.name === name));
    
    if (notFound.length > 0) {
      console.warn(`⚠ Warning: The following excluded content types were not found: ${notFound.join(", ")}`);
      console.warn(`  Available types: ${CONTENT_TYPES.map(ct => ct.name).join(", ")}\n`);
    }
  }
  
  return filtered;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    cleanOnly: args.includes("--clean-only"),
    noClean: args.includes("--no-clean"),
  };
}

// Main migration function
async function runMigration() {
  const args = parseArgs();
  
  // Handle --no-clean flag
  const shouldClean = args.noClean ? false : CLEAN_BEFORE_MIGRATE;
  
  console.log("Strapi Data Migration (Advanced)");
  console.log("================================\n");
  console.log(`From: ${OLD_STRAPI_URL}`);
  console.log(`To:   ${NEW_STRAPI_URL}`);
  console.log(`Skip Media: ${SKIP_MEDIA}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log(`Clean Before Migrate: ${shouldClean}`);
  if (IMPORT_ONLY) {
    console.log(`Import Only: ${IMPORT_ONLY.join(", ")}`);
  }
  if (EXCLUDE) {
    console.log(`Exclude: ${EXCLUDE.join(", ")}`);
  }
  console.log();

  // Check if new Strapi is running
  const isNewStrapiReady = await checkNewStrapi();
  if (!isNewStrapiReady) {
    console.error(
      "Error: New Strapi instance is not accessible at",
      NEW_STRAPI_URL,
    );
    console.error("Please make sure your new Strapi is running.");
    process.exit(1);
  }

  console.log("✓ New Strapi is accessible\n");

  // Get content types to migrate
  const contentTypesToMigrate = getContentTypesToMigrate();

  // Handle --clean-only mode
  if (args.cleanOnly) {
    console.log("Running in CLEAN-ONLY mode (no import)\n");
    // Clean ALL content types, regardless of EXCLUDE/IMPORT_ONLY settings
    await cleanNewStrapi();
    console.log("\n✓ Clean completed.");
    return;
  }

  // Clean new Strapi if enabled (clean ALL types, regardless of EXCLUDE)
  if (shouldClean) {
    await cleanNewStrapi();
  }
  
  if (contentTypesToMigrate.length === 0) {
    console.log("No content types to migrate.");
    return;
  }

  console.log(`\nWill migrate: ${contentTypesToMigrate.map(ct => ct.name).join(", ")}\n`);

  // Initialize ID mapping for content types that need it
  const idMapping = createIdMapping(contentTypesToMigrate.map(ct => ct.name));

  // Run migrations in order (independent types first)
  const results = [];

  // Phase 1: Independent types (no relations)
  console.log("\n--- Phase 1: Independent Types ---");
  const independentTypes = contentTypesToMigrate.filter((ct) =>
    ["district", "category", "page", "footer", "popup"].includes(ct.name),
  );

  for (const contentType of independentTypes) {
    const result = await migrateContentType(contentType, idMapping);
    results.push(result);
  }

  // Phase 2: Types with relations
  console.log("\n--- Phase 2: Types with Relations ---");
  const dependentTypes = contentTypesToMigrate.filter(
    (ct) =>
      !["district", "category", "page", "footer", "popup"].includes(ct.name),
  );

  for (const contentType of dependentTypes) {
    const result = await migrateContentType(contentType, idMapping);
    results.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const result of results) {
    const status = result.failed > 0 ? "⚠" : "✓";
    console.log(
      `${status} ${result.name}: ${result.success} success, ${result.failed} failed`,
    );
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  console.log("\n" + "-".repeat(60));
  console.log(`Total: ${totalSuccess} success, ${totalFailed} failed`);
  console.log("=".repeat(60));

  // Clean up temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  if (totalFailed > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
runMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
