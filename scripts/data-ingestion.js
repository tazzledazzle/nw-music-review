#!/usr/bin/env node

/**
 * Data ingestion CLI script for fetching events from external APIs
 */

const { IngestionService } = require('../src/lib/ingestion/ingestion-service');
require('dotenv').config({ path: '.env.local' });

// Target cities in our regions
const TARGET_LOCATIONS = [
  // Washington
  { location: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
  { location: 'Portland, OR', latitude: 45.5152, longitude: -122.6784 },
  { location: 'Spokane, WA', latitude: 47.6587, longitude: -117.4260 },
  { location: 'Tacoma, WA', latitude: 47.2529, longitude: -122.4443 },
  
  // Oregon
  { location: 'Eugene, OR', latitude: 44.0521, longitude: -123.0868 },
  { location: 'Bend, OR', latitude: 44.0582, longitude: -121.3153 },
  
  // Idaho
  { location: 'Boise, ID', latitude: 43.6150, longitude: -116.2023 },
  
  // British Columbia
  { location: 'Vancouver, BC', latitude: 49.2827, longitude: -123.1207 },
  { location: 'Victoria, BC', latitude: 48.4284, longitude: -123.3656 },
];

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  // Initialize ingestion service
  const config = {
    songkickApiKey: process.env.SONGKICK_API_KEY,
    bandsintownApiKey: process.env.BANDSINTOWN_API_KEY,
    ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
  };

  const ingestionService = new IngestionService(config);

  try {
    switch (command) {
      case 'locations':
        await ingestByLocations(ingestionService, args);
        break;
      case 'artist':
        await ingestByArtist(ingestionService, args);
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

async function ingestByLocations(ingestionService, args) {
  console.log('Starting location-based ingestion...');
  
  const startDate = args[0] ? new Date(args[0]) : new Date();
  const endDate = args[1] ? new Date(args[1]) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
  
  console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  let totalEvents = 0;
  let totalVenues = 0;
  let totalArtists = 0;
  const allErrors = [];

  for (const location of TARGET_LOCATIONS) {
    console.log(`\nProcessing ${location.location}...`);
    
    const params = {
      location: location.location,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: 50, // 50km radius
      startDate,
      endDate,
      limit: 100,
    };

    try {
      const result = await ingestionService.ingestEventsByLocation(params);
      
      console.log(`  Events: ${result.eventsProcessed}`);
      console.log(`  Venues: ${result.venuesProcessed}`);
      console.log(`  Artists: ${result.artistsProcessed}`);
      
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
        result.errors.forEach(error => console.log(`    - ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.length}`);
      }

      totalEvents += result.eventsProcessed;
      totalVenues += result.venuesProcessed;
      totalArtists += result.artistsProcessed;
      allErrors.push(...result.errors);

    } catch (error) {
      console.error(`  Failed to process ${location.location}:`, error.message);
      allErrors.push(`${location.location}: ${error.message}`);
    }

    // Add delay between locations to respect rate limits
    await sleep(2000);
  }

  console.log('\n=== INGESTION SUMMARY ===');
  console.log(`Total Events Processed: ${totalEvents}`);
  console.log(`Total Venues Processed: ${totalVenues}`);
  console.log(`Total Artists Processed: ${totalArtists}`);
  console.log(`Total Errors: ${allErrors.length}`);
  
  if (allErrors.length > 0) {
    console.log('\nErrors:');
    allErrors.forEach(error => console.log(`  - ${error}`));
  }
}

async function ingestByArtist(ingestionService, args) {
  if (args.length === 0) {
    console.error('Artist name required. Usage: node data-ingestion.js artist "Artist Name" [startDate] [endDate]');
    process.exit(1);
  }

  const artistName = args[0];
  const startDate = args[1] ? new Date(args[1]) : new Date();
  const endDate = args[2] ? new Date(args[2]) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  console.log(`Ingesting events for artist: ${artistName}`);
  console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  const params = {
    startDate,
    endDate,
    limit: 100,
  };

  try {
    const result = await ingestionService.ingestEventsByArtist(artistName, params);
    
    console.log('\n=== INGESTION RESULTS ===');
    console.log(`Events Processed: ${result.eventsProcessed}`);
    console.log(`Venues Processed: ${result.venuesProcessed}`);
    console.log(`Artists Processed: ${result.artistsProcessed}`);
    
    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log(`\nWarnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.success) {
      console.log('\nIngestion completed successfully!');
    } else {
      console.log('\nIngestion completed with errors.');
    }

  } catch (error) {
    console.error('Ingestion failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Data Ingestion CLI

Usage:
  node scripts/data-ingestion.js <command> [options]

Commands:
  locations [startDate] [endDate]     Ingest events from all target locations
  artist "Artist Name" [startDate] [endDate]  Ingest events for specific artist
  help                                Show this help message

Examples:
  node scripts/data-ingestion.js locations
  node scripts/data-ingestion.js locations 2024-01-01 2024-03-31
  node scripts/data-ingestion.js artist "Pearl Jam"
  node scripts/data-ingestion.js artist "Foo Fighters" 2024-01-01 2024-12-31

Environment Variables Required:
  SONGKICK_API_KEY      - Songkick API key
  BANDSINTOWN_API_KEY   - Bandsintown API key  
  TICKETMASTER_API_KEY  - Ticketmaster API key

Date Format: YYYY-MM-DD
  `);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the CLI
if (require.main === module) {
  main();
}

module.exports = { main };