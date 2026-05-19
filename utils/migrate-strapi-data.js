#!/usr/bin/env node

/**
 * Strapi Data Migration Script
 * 
 * This script migrates content from an old Strapi instance to the new one.
 * Usage: node utils/migrate-strapi-data.js
 * 
 * Environment variables:
 * - OLD_STRAPI_URL: URL of the old Strapi instance (default: https://library-2025-nq3wb.ondigitalocean.app)
 * - NEW_STRAPI_URL: URL of the new Strapi instance (default: http://localhost:1337)
 * - OLD_API_TOKEN: API token for the old Strapi (if required)
 * - NEW_API_TOKEN: API token for the new Strapi (if required)
 */

const https = require('https');
const http = require('http');

// Configuration
const OLD_STRAPI_URL = process.env.OLD_STRAPI_URL || 'https://library-2025-nq3wb.ondigitalocean.app';
const NEW_STRAPI_URL = process.env.NEW_STRAPI_URL || 'http://localhost:1338';
const OLD_API_TOKEN = process.env.OLD_API_TOKEN;
const NEW_API_TOKEN = process.env.NEW_API_TOKEN;

// Content types to migrate
// Single types have isSingleType = true
const CONTENT_TYPES = [
  // Collection types
  { name: 'category', endpoint: 'categories', isSingleType: false },
  { name: 'district', endpoint: 'districts', isSingleType: false },
  { name: 'event', endpoint: 'events', isSingleType: false },
  { name: 'half-an-hour', endpoint: 'half-an-hours', isSingleType: false },
  { name: 'page', endpoint: 'pages', isSingleType: false },
  // Single types
  { name: 'footer', endpoint: 'footer', isSingleType: true },
  { name: 'home', endpoint: 'home', isSingleType: true },
  { name: 'menu', endpoint: 'menu', isSingleType: true },
  { name: 'popup', endpoint: 'popup', isSingleType: true },
];

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Fetch data from old Strapi
async function fetchFromOld(endpoint, isSingleType = false) {
  const url = `${OLD_STRAPI_URL}/api/${endpoint}?populate=*`;
  console.log(`Fetching from: ${url}`);
  
  const headers = {};
  if (OLD_API_TOKEN) {
    headers['Authorization'] = `Bearer ${OLD_API_TOKEN}`;
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

// Clean data for new Strapi (remove IDs and timestamps)
function cleanData(item) {
  if (!item || typeof item !== 'object') return item;
  
  if (Array.isArray(item)) {
    return item.map(cleanData);
  }
  
  const cleaned = {};
  for (const [key, value] of Object.entries(item)) {
    // Skip Strapi internal fields
    if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'].includes(key)) {
      continue;
    }
    
    // Handle relations (connect by documentId)
    if (key === 'connect' || key === 'disconnect') {
      continue;
    }
    
    // Handle media fields
    if (key === 'formats' && value && typeof value === 'object') {
      // Keep media reference info but not the full formats
      continue;
    }
    
    // Handle nested objects
    if (value && typeof value === 'object') {
      if (value.data !== undefined) {
        // This is a relation or media
        if (Array.isArray(value.data)) {
          // Many relation or multiple media
          cleaned[key] = value.data.map(relatedItem => {
            if (relatedItem && typeof relatedItem === 'object') {
              // Return documentId for relations, or clean media data
              if (relatedItem.documentId) {
                return { documentId: relatedItem.documentId };
              }
              return cleanData(relatedItem);
            }
            return relatedItem;
          });
        } else if (value.data) {
          // Single relation or single media
          const relatedItem = value.data;
          if (relatedItem.documentId) {
            cleaned[key] = { documentId: relatedItem.documentId };
          } else {
            cleaned[key] = cleanData(relatedItem);
          }
        } else {
          cleaned[key] = null;
        }
      } else {
        // Regular nested object (like components)
        cleaned[key] = cleanData(value);
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

// Post data to new Strapi
async function postToNew(endpoint, data, isSingleType = false) {
  const url = `${NEW_STRAPI_URL}/api/${endpoint}${isSingleType ? '' : ''}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  if (NEW_API_TOKEN) {
    headers['Authorization'] = `Bearer ${NEW_API_TOKEN}`;
  }
  
  const body = JSON.stringify({ data });
  
  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers,
      body,
    });
    
    if (response.status !== 200 && response.status !== 201) {
      console.error(`Failed to create ${endpoint}:`, response.status, response.data);
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error posting to ${endpoint}:`, error.message);
    return null;
  }
}

// Update single type in new Strapi
async function updateSingleType(endpoint, data) {
  const url = `${NEW_STRAPI_URL}/api/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  if (NEW_API_TOKEN) {
    headers['Authorization'] = `Bearer ${NEW_API_TOKEN}`;
  }
  
  const body = JSON.stringify({ data });
  
  try {
    // Try PUT first (for single types)
    const response = await makeRequest(url, {
      method: 'PUT',
      headers,
      body,
    });
    
    if (response.status !== 200 && response.status !== 201) {
      console.error(`Failed to update ${endpoint}:`, response.status, response.data);
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error updating ${endpoint}:`, error.message);
    return null;
  }
}

// Check if new Strapi is accessible
async function checkNewStrapi() {
  try {
    const response = await makeRequest(`${NEW_STRAPI_URL}/api/content-type-builder/content-types`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Migrate a single content type
async function migrateContentType({ name, endpoint, isSingleType }) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Migrating ${isSingleType ? 'single type' : 'collection type'}: ${name}`);
  console.log('='.repeat(50));
  
  // Fetch from old
  const items = await fetchFromOld(endpoint, isSingleType);
  console.log(`Found ${items.length} item(s) to migrate`);
  
  if (items.length === 0) {
    console.log(`Skipping ${name} - no data found`);
    return { name, success: 0, failed: 0, skipped: 0 };
  }
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const item of items) {
    const attributes = item.attributes || item;
    const cleanedData = cleanData(attributes);
    
    console.log(`\nMigrating ${name}: ${attributes.title_HK || attributes.title_EN || attributes.name_HK || attributes.name || 'unnamed'}`);
    
    let result;
    if (isSingleType) {
      result = await updateSingleType(endpoint, cleanedData);
    } else {
      result = await postToNew(endpoint, cleanedData);
    }
    
    if (result) {
      console.log(`✓ Successfully migrated`);
      success++;
    } else {
      console.log(`✗ Failed to migrate`);
      failed++;
    }
  }
  
  return { name, success, failed, skipped };
}

// Main migration function
async function runMigration() {
  console.log('Strapi Data Migration');
  console.log('=====================\n');
  console.log(`From: ${OLD_STRAPI_URL}`);
  console.log(`To:   ${NEW_STRAPI_URL}\n`);
  
  // Check if new Strapi is running
  const isNewStrapiReady = await checkNewStrapi();
  if (!isNewStrapiReady) {
    console.error('Error: New Strapi instance is not accessible at', NEW_STRAPI_URL);
    console.error('Please make sure your new Strapi is running.');
    process.exit(1);
  }
  
  console.log('✓ New Strapi is accessible\n');
  
  // Run migrations
  const results = [];
  
  // First pass: migrate independent content types (no relations)
  const independentTypes = CONTENT_TYPES.filter(ct => 
    ['district', 'category', 'page', 'footer', 'popup'].includes(ct.name)
  );
  
  console.log('\n--- Phase 1: Independent Content Types ---');
  for (const contentType of independentTypes) {
    const result = await migrateContentType(contentType);
    results.push(result);
  }
  
  // Second pass: migrate content types with relations
  const dependentTypes = CONTENT_TYPES.filter(ct => 
    !['district', 'category', 'page', 'footer', 'popup'].includes(ct.name)
  );
  
  console.log('\n--- Phase 2: Dependent Content Types (with relations) ---');
  for (const contentType of dependentTypes) {
    const result = await migrateContentType(contentType);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary');
  console.log('='.repeat(50));
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const result of results) {
    const status = result.failed > 0 ? '⚠' : '✓';
    console.log(`${status} ${result.name}: ${result.success} success, ${result.failed} failed`);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }
  
  console.log('\n' + '-'.repeat(50));
  console.log(`Total: ${totalSuccess} success, ${totalFailed} failed`);
  console.log('='.repeat(50));
  
  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
