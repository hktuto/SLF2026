#!/usr/bin/env node

/**
 * Import Events from Excel to Strapi (Bilingual Version)
 * 
 * This script reads events from an Excel file with 2 sheets:
 * - Sheet 1 (Chinese): Contains HK content
 * - Sheet 2 (English): Contains EN content
 * 
 * Events with the same Chinese name are grouped as one event with multiple programs.
 * 
 * Usage: node utils/import-events-from-excel.js [path-to-excel-file]
 * 
 * Environment variables:
 * - STRAPI_URL: URL of the Strapi instance (default: http://localhost:1337)
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
const DEFAULT_EXCEL_PATH = path.join(__dirname, "..", "imports", "2026-02-24.xlsx");

// Demo image path
const DEMO_IMAGE_PATH = path.join(__dirname, "..", "imports", "demo.jpg");

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

// Fetch districts from Strapi for mapping
async function fetchDistricts() {
  const url = `${STRAPI_URL}/api/districts?pagination[pageSize]=100`;
  const headers = {};
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const response = await makeRequest(url, { headers });
    if (response.status === 200 && response.data.data) {
      const districts = {};
      for (const item of response.data.data) {
        const nameHK = item.attributes?.label_HK || item.label_HK || item.attributes?.name_HK || item.name_HK;
        const nameEN = item.attributes?.label_EN || item.label_EN || item.attributes?.name_EN || item.name_EN;
        const id = item.id;
        const documentId = item.documentId;
        if (nameHK) districts[nameHK.trim()] = { id, documentId };
        if (nameEN) districts[nameEN.trim()] = { id, documentId };
      }
      return districts;
    }
  } catch (error) {
    console.error("Error fetching districts:", error.message);
  }
  return {};
}

// Fetch categories from Strapi for mapping
async function fetchCategories() {
  const url = `${STRAPI_URL}/api/categories?pagination[pageSize]=100`;
  const headers = {};
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const response = await makeRequest(url, { headers });
    if (response.status === 200 && response.data.data) {
      const categories = {};
      for (const item of response.data.data) {
        const nameHK = item.attributes?.name_HK || item.name_HK || item.attributes?.label_HK || item.label_HK;
        const id = item.id;
        const documentId = item.documentId;
        if (nameHK) categories[nameHK.trim()] = { id, documentId };
      }
      return categories;
    }
  } catch (error) {
    console.error("Error fetching categories:", error.message);
  }
  return {};
}

// Parse date from Excel format (e.g., "23.4.2026（四）" or "1.4.2026 (三)")
function parseDate(dateStr) {
  if (!dateStr || dateStr === "--" || dateStr === "-") return null;
  
  // Remove day of week in parentheses/brackets
  let cleaned = dateStr.replace(/[（(].*?[）)]/g, "").trim();
  
  // Parse D.M.YYYY format
  const match = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// Parse time from Excel format (e.g., "1:00pm" or "圖書館開放時間")
function parseTime(timeStr) {
  if (!timeStr || timeStr === "--" || timeStr === "-" || timeStr.includes("圖書館開放時間") || timeStr.toLowerCase().includes("library opening")) {
    return null;
  }
  
  // Convert 12-hour format to 24-hour format
  const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (match) {
    let hour = parseInt(match[1]);
    const minute = match[2];
    const period = match[3].toLowerCase();
    
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, "0")}:${minute}:00`;
  }
  
  // Try 24-hour format
  const match24 = timeStr.match(/(\d{2}):(\d{2})/);
  if (match24) {
    return `${match24[1]}:${match24[2]}:00`;
  }
  
  return null;
}

// Map district name to district ID
function mapDistrict(districtName, subDistrictName, districtsMap) {
  // Try sub-district first (more specific)
  if (subDistrictName && districtsMap[subDistrictName.trim()]) {
    return districtsMap[subDistrictName.trim()];
  }
  // Try main district
  if (districtName && districtsMap[districtName.trim()]) {
    return districtsMap[districtName.trim()];
  }
  return null;
}

// Map category name to category IDs
function mapCategory(categoryName, categoriesMap) {
  if (!categoryName) return [];
  
  const categories = [];
  const name = categoryName.trim();
  
  // Direct mapping
  if (categoriesMap[name]) {
    categories.push(categoriesMap[name]);
  }
  
  return categories;
}

// Transform Chinese sheet row to program data
function transformChineseRowToProgram(row, districtsMap) {
  const region = row["地區"] || "";
  const subRegion = row["Unnamed: 5"] || "";
  const library = row["圖書館"] || "";
  const venue = row["活動地點"] || "";
  const host = row["講者/主持"] || "";
  const startDate = parseDate(row["活動開始日期"]);
  const endDate = parseDate(row["活動完結日期"]);
  const startTime = parseTime(row["活動開始時間"]);
  const endTime = parseTime(row["活動完結時間"]);
  const target = row["對象"] || "";
  const quota = row["名額"] || "";
  const registerPeriod = row["報名期"] || "";
  const registerMethod = row["報名方法"] || "";
  const phone = row["查詢/報名電話\r\n(公眾查詢)"] || row["查詢/報名電話\n(公眾查詢)"] || "";
  const contact = row["聯絡人及電話\r\n(內部)"] || row["聯絡人及電話\n(內部)"] || "";
  const remark = row["備註"] || "";
  
  const district = mapDistrict(region, subRegion, districtsMap);
  
  const program = {};
  if (startDate) program.startDate = startDate;
  if (endDate) program.endDate = endDate;
  if (startTime) program.startTime = startTime;
  if (endTime) program.endTime = endTime;
  if (library || venue) program.location_HK = [library, venue].filter(Boolean).join(" - ").replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (host) program.name_HK = host.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (target) program.target_HK = target;
  if (quota) program.quota_HK = String(quota);
  if (registerPeriod) program.period_HK = registerPeriod;
  if (registerMethod) program.register_HK = registerMethod;
  if (phone) program.phone_HK = phone.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (contact) program.contact_HK = contact.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (district) program.district = district.id;
  
  return { program, district, categoryName: row["類別"] || "" };
}

// Transform English sheet row to program data (merge with Chinese)
function transformEnglishRowToProgram(row, districtsMap) {
  const region = row["District"] || "";
  const subRegion = row["Unnamed: 5"] || "";
  const library = row["Library"] || "";
  const venue = row["Activity Venue"] || "";
  const host = row["Speaker/ Moderator/ Host:"] || "";
  const startDate = parseDate(row["Start Date "]);
  const endDate = parseDate(row["End Date "]);
  const startTime = parseTime(row["Start Time"]);
  const endTime = parseTime(row["End Time"]);
  const target = row["Target Participants"] || "";
  const quota = row["Quota"] || "";
  const registerPeriod = row["Registration Period"] || "";
  const registerMethod = row["Registration Method"] || "";
  const phone = row["Enquiry Hotline\r\n(Disclose to Public)"] || row["Enquiry Hotline\n(Disclose to Public)"] || "";
  const contact = row["Contact person &\r\nTel. No.\r\n(Internal Use)"] || row["Contact person &\nTel. No.\n(Internal Use)"] || "";
  
  const district = mapDistrict(region, subRegion, districtsMap);
  
  const program = {};
  if (startDate) program.startDate = startDate;
  if (endDate) program.endDate = endDate;
  if (startTime) program.startTime = startTime;
  if (endTime) program.endTime = endTime;
  if (library || venue) program.location_EN = [library, venue].filter(Boolean).join(" - ").replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (host) program.name_EN = host.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (target) program.target_EN = target;
  if (quota) program.quota_EN = String(quota);
  if (registerPeriod) program.period_EN = registerPeriod;
  if (registerMethod) program.register_EN = registerMethod;
  if (phone) program.phone_EN = phone.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (contact) program.contact_EN = contact.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  if (district) program.district = district.id;
  
  return { program };
}

// Group rows by event name (Chinese)
function groupEventsByName(chineseRows, englishRows) {
  const events = {};
  
  // Process Chinese rows
  for (const row of chineseRows) {
    const nameHK = row["活動名稱"] || "";
    if (!nameHK || nameHK === "例子") continue;
    
    const key = nameHK.trim();
    if (!events[key]) {
      events[key] = {
        title_HK: nameHK.replace(/\r\n/g, " ").replace(/\n/g, " ").trim(),
        content_HK: (row["活動簡介\r\n(*內容簡介字數限制: 不超過60字*)"] || row["活動簡介\n(*內容簡介字數限制: 不超過60字*)"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim(),
        host_HK: (row["講者/主持"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim(),
        remark_HK: (row["備註"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim(),
        categoryName: row["類別"] || "",
        programs: [],
      };
    }
    
    // Add program
    const { program } = transformChineseRowToProgram(row, districtsMap);
    events[key].programs.push({ hk: program });
  }
  
  // Process English rows and merge with Chinese
  for (const row of englishRows) {
    const nameHK = row["Name of Activities\r\n(in Chinese)"] || "";
    const nameEN = row["Name of Activities\r\n(in English)"] || "";
    
    if (!nameHK || nameHK.trim() === "例子") continue;
    
    const key = nameHK.trim();
    if (events[key]) {
      // Add English data to existing event
      events[key].title_EN = nameEN.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
      events[key].content_EN = (row["Desription of Activities\r\n(*Within 100 words for description*)"] || row["Desription of Activities\n(*Within 100 words for description*)"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
      events[key].host_EN = (row["Speaker/ Moderator/ Host:"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
      events[key].remark_EN = (row["Remarks"] || "").replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
      
      // Add English program data
      const { program } = transformEnglishRowToProgram(row, districtsMap);
      
      // Try to match with existing program by date/time
      let matched = false;
      for (const prog of events[key].programs) {
        if (prog.hk.startDate === program.startDate && 
            prog.hk.startTime === program.startTime) {
          // Merge English data into existing program
          Object.assign(prog.hk, program);
          matched = true;
          break;
        }
      }
      
      // If no match found, add as new program
      if (!matched) {
        events[key].programs.push({ hk: program });
      }
    }
  }
  
  return events;
}

// Upload demo image to Strapi
async function uploadDemoImage() {
  if (DRY_RUN) {
    console.log("[DRY RUN] Would upload demo image");
    return { id: 999 };
  }
  
  if (!fs.existsSync(DEMO_IMAGE_PATH)) {
    console.warn("⚠ Warning: demo.jpg not found at", DEMO_IMAGE_PATH);
    return null;
  }
  
  const url = `${STRAPI_URL}/api/upload`;
  const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
  
  const fileData = fs.readFileSync(DEMO_IMAGE_PATH);
  const fileName = "demo.jpg";
  
  const formData = Buffer.concat([
    Buffer.from(
      `------${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    fileData,
    Buffer.from(`\r\n------${boundary}--\r\n`),
  ]);
  
  const headers = {
    "Content-Type": `multipart/form-data; boundary=----${boundary}`,
    "Content-Length": formData.length,
  };
  
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }
  
  try {
    const response = await makeRequest(url, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (response.status !== 200 && response.status !== 201) {
      console.error("Failed to upload demo image:", response.status);
      return null;
    }
    
    const uploaded = response.data[0];
    console.log(`✓ Demo image uploaded (ID: ${uploaded.id})`);
    return uploaded;
  } catch (error) {
    console.error("Error uploading demo image:", error.message);
    return null;
  }
}

// Create event in Strapi
async function createEvent(eventData, demoImageId) {
  // Add demo image to event if available
  if (demoImageId) {
    eventData.photos = [demoImageId];
  }
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create event: ${eventData.title_HK?.substring(0, 50)}...`);
    console.log(`           Programs: ${eventData.programs?.length || 0}`);
    console.log(`           Photo ID: ${demoImageId || 'none'}`);
    return { success: true };
  }

  const url = `${STRAPI_URL}/api/events`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  const body = JSON.stringify({ data: eventData });

  try {
    const response = await makeRequest(url, {
      method: "POST",
      headers,
      body,
    });

    if (response.status !== 200 && response.status !== 201) {
      console.error(`  Failed to create event:`, response.status);
      if (response.data) {
        console.error(`  Error:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      }
      return { success: false };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`  Error creating event:`, error.message);
    return { success: false };
  }
}

// Global districts map (needed for groupEventsByName)
let districtsMap = {};

// Main function
async function main() {
  // Get Excel file path from command line or use default
  const excelPath = process.argv[2] || DEFAULT_EXCEL_PATH;
  
  console.log("Import Events from Excel to Strapi (Bilingual)");
  console.log("===============================================\n");
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
  
  // Read Chinese sheet (Sheet 1)
  const chineseSheet = workbook.Sheets[workbook.SheetNames[0]];
  const chineseRows = xlsx.utils.sheet_to_json(chineseSheet);
  
  // Read English sheet (Sheet 2)
  const englishSheet = workbook.Sheets[workbook.SheetNames[1]];
  const englishRows = xlsx.utils.sheet_to_json(englishSheet);

  console.log(`Sheet 1 (Chinese): ${chineseRows.length} rows`);
  console.log(`Sheet 2 (English): ${englishRows.length} rows\n`);

  // Fetch districts and categories for mapping
  console.log("Fetching reference data from Strapi...");
  districtsMap = await fetchDistricts();
  const categoriesMap = await fetchCategories();
  console.log(`  Loaded ${Object.keys(districtsMap).length} districts`);
  console.log(`  Loaded ${Object.keys(categoriesMap).length} categories\n`);

  // Group events by name
  console.log("Grouping events by name...");
  const events = groupEventsByName(chineseRows, englishRows);
  const eventCount = Object.keys(events).length;
  console.log(`  Found ${eventCount} unique events\n`);

  // Upload demo image first
  console.log("Uploading demo image...");
  const demoImage = await uploadDemoImage();
  const demoImageId = demoImage ? demoImage.id : null;
  console.log();
  
  // Process each event
  console.log("Importing events...\n");
  let success = 0;
  let failed = 0;
  let programCount = 0;

  let index = 0;
  for (const [eventName, eventData] of Object.entries(events)) {
    index++;
    const totalPrograms = eventData.programs.length;
    programCount += totalPrograms;
    
    console.log(`[${index}/${eventCount}] ${eventName.substring(0, 50)} (${totalPrograms} program(s))`);
    
    try {
      // Map categories
      const categories = mapCategory(eventData.categoryName, categoriesMap);
      if (categories.length > 0) {
        eventData.categories = categories.map(c => c.id);
      }
      
      // Flatten programs (extract from {hk: ...} wrapper)
      eventData.programs = eventData.programs.map(p => p.hk);
      
      // Remove temporary fields
      delete eventData.categoryName;
      
      const result = await createEvent(eventData, demoImageId);
      
      if (result.success) {
        console.log(`  ✓ Success`);
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
  console.log("\n" + "=".repeat(50));
  console.log("Import Summary");
  console.log("=".repeat(50));
  console.log(`Events: ${eventCount}`);
  console.log(`Programs: ${programCount}`);
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
