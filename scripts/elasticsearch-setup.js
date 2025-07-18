#!/usr/bin/env node

/**
 * Elasticsearch setup and management script
 * Usage: node scripts/elasticsearch-setup.js [command]
 * Commands: init, sync, health
 */

const { elasticsearchService } = require('../src/lib/search/elasticsearch');
const { indexingService } = require('../src/lib/search/indexing-service');

async function main() {
  const command = process.argv[2] || 'help';

  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing Elasticsearch indices...');
        await elasticsearchService.initializeIndices();
        console.log('✅ Elasticsearch indices initialized successfully');
        break;

      case 'sync':
        console.log('🔄 Starting full data sync...');
        await indexingService.fullSync();
        console.log('✅ Full data sync completed successfully');
        break;

      case 'health':
        console.log('🏥 Checking Elasticsearch health...');
        const health = await indexingService.healthCheck();
        console.log(`Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`Message: ${health.message}`);
        break;

      case 'setup':
        console.log('🛠️  Setting up Elasticsearch (init + sync)...');
        await elasticsearchService.initializeIndices();
        console.log('✅ Indices initialized');
        await indexingService.fullSync();
        console.log('✅ Data sync completed');
        console.log('🎉 Elasticsearch setup complete!');
        break;

      case 'help':
      default:
        console.log(`
Elasticsearch Setup and Management Script

Usage: node scripts/elasticsearch-setup.js [command]

Commands:
  init    - Initialize Elasticsearch indices with proper mappings
  sync    - Perform full data sync from database to Elasticsearch
  health  - Check Elasticsearch connection and health status
  setup   - Complete setup (init + sync)
  help    - Show this help message

Examples:
  node scripts/elasticsearch-setup.js init
  node scripts/elasticsearch-setup.js sync
  node scripts/elasticsearch-setup.js health
  node scripts/elasticsearch-setup.js setup

Environment Variables:
  ELASTICSEARCH_URL      - Elasticsearch connection URL (default: http://localhost:9200)
  ELASTICSEARCH_USERNAME - Elasticsearch username (optional)
  ELASTICSEARCH_PASSWORD - Elasticsearch password (optional)
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}