/**
 * Elasticsearch query optimization utilities
 * These functions help optimize Elasticsearch queries for better performance
 */

/**
 * Optimize a search query based on query complexity and expected result size
 * @param query Original search query object
 * @param expectedResultSize Expected number of results
 * @returns Optimized query object
 */
export function optimizeSearchQuery(query: any, expectedResultSize: number = 100): any {
  // Create a deep copy of the query to avoid modifying the original
  const optimizedQuery = JSON.parse(JSON.stringify(query));
  
  // Add track_total_hits optimization based on expected result size
  if (expectedResultSize < 10000) {
    // For small result sets, track exact hit count
    optimizedQuery.track_total_hits = true;
  } else {
    // For large result sets, limit tracking to improve performance
    optimizedQuery.track_total_hits = 10000;
  }
  
  // Add search optimization parameters
  optimizedQuery.min_score = 0.1; // Filter out very low-scoring results
  
  // Add request cache for appropriate queries
  if (isQueryCacheable(optimizedQuery)) {
    optimizedQuery.request_cache = true;
  }
  
  // Add timeout to prevent long-running queries
  optimizedQuery.timeout = '3s';
  
  // Optimize sort for performance
  optimizeSort(optimizedQuery);
  
  // Add preference for consistent shard routing
  optimizedQuery.preference = '_local'; // Prefer local shards for faster response
  
  return optimizedQuery;
}

/**
 * Check if a query is cacheable
 * @param query Query object to check
 * @returns Whether the query can be cached
 */
function isQueryCacheable(query: any): boolean {
  // Don't cache queries with random scoring
  if (query.query?.function_score?.random_score) {
    return false;
  }
  
  // Don't cache queries with now() or other date math
  const queryStr = JSON.stringify(query);
  if (queryStr.includes('now')) {
    return false;
  }
  
  // Don't cache queries with very specific filters that are unlikely to be reused
  if (query.query?.bool?.filter?.length > 5) {
    return false;
  }
  
  return true;
}

/**
 * Optimize sort for better performance
 * @param query Query object to optimize
 */
function optimizeSort(query: any): void {
  // If no sort is specified, don't modify
  if (!query.sort) {
    return;
  }
  
  // Check for inefficient sorts
  query.sort = query.sort.map((sortItem: any) => {
    // If sorting by geo_distance, ensure it has proper parameters
    if (sortItem.geo_distance) {
      sortItem.geo_distance.ignore_unmapped = true;
    }
    
    // If sorting by a text field, use the keyword version for better performance
    if (typeof sortItem === 'object') {
      const field = Object.keys(sortItem)[0];
      if (field === 'name' || field === 'title' || field === 'description') {
        const direction = sortItem[field].order || 'asc';
        return { [`${field}.keyword`]: { order: direction } };
      }
    }
    
    return sortItem;
  });
}

/**
 * Create a query with result caching for frequently accessed data
 * @param query Base query object
 * @param cacheKey Unique key for the cached results
 * @param ttl Time-to-live for cache in seconds
 * @returns Query with caching directives
 */
export function createCachedQuery(query: any, cacheKey: string, ttl: number = 300): any {
  return {
    ...query,
    request_cache: true,
    preference: `cache_${cacheKey}`,
    _cache: true,
    _cache_ttl: ttl,
  };
}

/**
 * Optimize aggregations for better performance
 * @param aggregations Aggregations object to optimize
 * @returns Optimized aggregations
 */
export function optimizeAggregations(aggregations: any): any {
  const optimized = { ...aggregations };
  
  // Iterate through all aggregations
  Object.keys(optimized).forEach(aggName => {
    const agg = optimized[aggName];
    
    // Add sampling for term aggregations on high-cardinality fields
    if (agg.terms && isHighCardinalityField(agg.terms.field)) {
      agg.terms.size = Math.min(agg.terms.size || 10, 100); // Limit size
      agg.terms.shard_size = agg.terms.size * 2; // Double shard size for accuracy
    }
    
    // Optimize date histograms
    if (agg.date_histogram) {
      // Use fixed_interval instead of interval for better performance
      if (agg.date_histogram.interval && !agg.date_histogram.fixed_interval) {
        agg.date_histogram.fixed_interval = agg.date_histogram.interval;
        delete agg.date_histogram.interval;
      }
      
      // Add missing value handling
      agg.date_histogram.missing = 'now';
    }
    
    // Recursively optimize sub-aggregations
    if (agg.aggs || agg.aggregations) {
      const subAggs = agg.aggs || agg.aggregations;
      agg.aggs = optimizeAggregations(subAggs);
      delete agg.aggregations; // Standardize on aggs property
    }
  });
  
  return optimized;
}

/**
 * Check if a field is likely to have high cardinality
 * @param field Field name to check
 * @returns Whether the field likely has high cardinality
 */
function isHighCardinalityField(field: string): boolean {
  const highCardinalityFields = [
    'id', 
    'title', 
    'name', 
    'description', 
    'address',
    'website',
    'external_id'
  ];
  
  return highCardinalityFields.some(f => field.includes(f));
}

/**
 * Create a query optimized for geospatial searches
 * @param lat Latitude
 * @param lon Longitude
 * @param radius Radius in kilometers
 * @param options Additional options
 * @returns Optimized geospatial query
 */
export function createOptimizedGeoQuery(
  lat: number, 
  lon: number, 
  radius: number,
  options: {
    boost?: number;
    includeDistance?: boolean;
    maxResults?: number;
  } = {}
): any {
  const { boost = 1.0, includeDistance = true, maxResults = 100 } = options;
  
  const geoQuery = {
    query: {
      function_score: {
        query: {
          bool: {
            filter: [
              {
                geo_distance: {
                  distance: `${radius}km`,
                  location: {
                    lat,
                    lon
                  }
                }
              }
            ]
          }
        },
        functions: [
          {
            gauss: {
              location: {
                origin: { lat, lon },
                scale: `${radius / 2}km`,
                offset: '0km',
                decay: 0.5
              }
            },
            weight: boost
          }
        ],
        score_mode: 'multiply',
        boost_mode: 'multiply'
      }
    },
    size: maxResults,
    sort: [
      '_score',
      {
        prosper_rank: {
          order: 'desc',
          missing: '_last'
        }
      }
    ]
  };
  
  // Add script_fields to include distance in results if requested
  if (includeDistance) {
    geoQuery.script_fields = {
      distance: {
        script: {
          source: "doc['location'].arcDistance(params.lat, params.lon) * 0.001",
          params: { lat, lon }
        }
      }
    };
  }
  
  return geoQuery;
}