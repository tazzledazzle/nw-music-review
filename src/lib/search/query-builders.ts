import { GeoSearchParams, EventSearchParams, QueryParams } from '../models/types';

/**
 * Query builder utilities for Elasticsearch searches
 */
export class SearchQueryBuilder {
  /**
   * Build a multi-match query for text search
   */
  static buildTextQuery(query: string, fields: string[], boost?: Record<string, number>) {
    if (!query.trim()) {
      return { match_all: {} };
    }

    const boostedFields = fields.map(field => {
      const boostValue = boost?.[field] || 1;
      return boostValue > 1 ? `${field}^${boostValue}` : field;
    });

    return {
      multi_match: {
        query: query.trim(),
        fields: boostedFields,
        type: 'best_fields',
        fuzziness: 'AUTO',
        minimum_should_match: '75%'
      }
    };
  }

  /**
   * Build a geographic distance filter
   */
  static buildGeoFilter(lat: number, lon: number, radius: number, field = 'location') {
    return {
      geo_distance: {
        distance: `${radius}km`,
        [field]: { lat, lon }
      }
    };
  }

  /**
   * Build a date range filter
   */
  static buildDateRangeFilter(field: string, startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) {
      return null;
    }

    const range: any = {};
    if (startDate) range.gte = startDate.toISOString();
    if (endDate) range.lte = endDate.toISOString();

    return { range: { [field]: range } };
  }

  /**
   * Build a terms filter for multiple values
   */
  static buildTermsFilter(field: string, values: string[]) {
    if (!values || values.length === 0) {
      return null;
    }

    return { terms: { [field]: values } };
  }

  /**
   * Build a nested query for nested objects
   */
  static buildNestedQuery(path: string, query: any) {
    return {
      nested: {
        path,
        query
      }
    };
  }

  /**
   * Build sorting configuration
   */
  static buildSort(params: {
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    geoSort?: { lat: number; lon: number; field?: string };
    defaultSort?: Array<Record<string, any>>;
  }) {
    const { sortBy, sortDir = 'desc', geoSort, defaultSort = [] } = params;
    const sort: Array<Record<string, any>> = [];

    // Custom sort field
    if (sortBy) {
      sort.push({ [sortBy]: { order: sortDir } });
    }

    // Geographic sort
    if (geoSort) {
      sort.push({
        _geo_distance: {
          [geoSort.field || 'location']: { 
            lat: geoSort.lat, 
            lon: geoSort.lon 
          },
          order: 'asc',
          unit: 'km'
        }
      });
    }

    // Default sorting
    sort.push(...defaultSort);

    return sort.length > 0 ? sort : [{ _score: { order: 'desc' } }];
  }

  /**
   * Build pagination parameters
   */
  static buildPagination(page = 1, limit = 10) {
    return {
      from: (page - 1) * limit,
      size: Math.min(limit, 100) // Cap at 100 results per page
    };
  }
}

/**
 * Venue-specific query builders
 */
export class VenueQueryBuilder extends SearchQueryBuilder {
  /**
   * Build venue search query
   */
  static buildSearchQuery(query: string, params: GeoSearchParams & { 
    capacity_min?: number;
    capacity_max?: number;
    prosper_rank_min?: number;
    state_province?: string[];
    country?: string[];
  }) {
    const {
      lat,
      lon,
      radius,
      capacity_min,
      capacity_max,
      prosper_rank_min,
      state_province,
      country,
      page = 1,
      limit = 10
    } = params;

    const filters: any[] = [];

    // Geographic filter
    if (lat && lon && radius) {
      filters.push(this.buildGeoFilter(lat, lon, radius));
    }

    // Capacity range filter
    if (capacity_min || capacity_max) {
      const capacityRange: any = {};
      if (capacity_min) capacityRange.gte = capacity_min;
      if (capacity_max) capacityRange.lte = capacity_max;
      filters.push({ range: { capacity: capacityRange } });
    }

    // Prosper rank filter
    if (prosper_rank_min) {
      filters.push({ range: { prosper_rank: { gte: prosper_rank_min } } });
    }

    // State/province filter
    if (state_province && state_province.length > 0) {
      filters.push(this.buildTermsFilter('city.state_province', state_province));
    }

    // Country filter
    if (country && country.length > 0) {
      filters.push(this.buildTermsFilter('city.country', country));
    }

    return {
      query: {
        bool: {
          must: [this.buildTextQuery(query, ['name', 'address', 'city.name'], {
            name: 2,
            'city.name': 1.5,
            address: 1
          })],
          filter: filters
        }
      },
      sort: this.buildSort({
        geoSort: lat && lon ? { lat, lon } : undefined,
        defaultSort: [
          { prosper_rank: { order: 'desc' } },
          { _score: { order: 'desc' } }
        ]
      }),
      ...this.buildPagination(page, limit)
    };
  }
}

/**
 * Artist-specific query builders
 */
export class ArtistQueryBuilder extends SearchQueryBuilder {
  /**
   * Build artist search query
   */
  static buildSearchQuery(query: string, params: QueryParams & {
    genres?: string[];
    has_bio?: boolean;
    has_photo?: boolean;
  }) {
    const {
      genres,
      has_bio,
      has_photo,
      page = 1,
      limit = 10,
      sort_by,
      sort_dir
    } = params;

    const filters: any[] = [];

    // Genre filter
    if (genres && genres.length > 0) {
      filters.push(this.buildTermsFilter('genres', genres));
    }

    // Has bio filter
    if (has_bio) {
      filters.push({ exists: { field: 'profile_bio' } });
    }

    // Has photo filter
    if (has_photo) {
      filters.push({ exists: { field: 'photo_url' } });
    }

    return {
      query: {
        bool: {
          must: [this.buildTextQuery(query, ['name', 'profile_bio'], {
            name: 2,
            profile_bio: 1
          })],
          filter: filters
        }
      },
      sort: this.buildSort({
        sortBy: sort_by,
        sortDir: sort_dir,
        defaultSort: [
          { _score: { order: 'desc' } },
          { 'name.keyword': { order: 'asc' } }
        ]
      }),
      ...this.buildPagination(page, limit)
    };
  }
}

/**
 * Event-specific query builders
 */
export class EventQueryBuilder extends SearchQueryBuilder {
  /**
   * Build event search query
   */
  static buildSearchQuery(query: string, params: EventSearchParams & GeoSearchParams & {
    genres?: string[];
    has_tickets?: boolean;
  }) {
    const {
      start_date,
      end_date,
      artist_id,
      venue_id,
      city_id,
      lat,
      lon,
      radius,
      genres,
      has_tickets,
      page = 1,
      limit = 10,
      sort_by,
      sort_dir
    } = params;

    const filters: any[] = [];

    // Date range filter
    const dateFilter = this.buildDateRangeFilter('event_datetime', start_date, end_date);
    if (dateFilter) {
      filters.push(dateFilter);
    }

    // Artist filter
    if (artist_id) {
      filters.push(this.buildNestedQuery('artists', {
        term: { 'artists.id': artist_id }
      }));
    }

    // Venue filter
    if (venue_id) {
      filters.push({ term: { 'venue.id': venue_id } });
    }

    // City filter (through venue)
    if (city_id) {
      filters.push({ term: { 'venue.city.id': city_id } });
    }

    // Geographic filter
    if (lat && lon && radius) {
      filters.push(this.buildGeoFilter(lat, lon, radius, 'venue.location'));
    }

    // Genre filter (through artists)
    if (genres && genres.length > 0) {
      filters.push(this.buildNestedQuery('artists', {
        terms: { 'artists.genres': genres }
      }));
    }

    // Has tickets filter
    if (has_tickets) {
      filters.push({ exists: { field: 'ticket_url' } });
    }

    return {
      query: {
        bool: {
          must: [this.buildTextQuery(query, [
            'title', 
            'description', 
            'venue.name', 
            'artists.name'
          ], {
            title: 2,
            'venue.name': 1.5,
            'artists.name': 1.5,
            description: 1
          })],
          filter: filters
        }
      },
      sort: this.buildSort({
        sortBy: sort_by,
        sortDir: sort_dir,
        geoSort: lat && lon ? { lat, lon, field: 'venue.location' } : undefined,
        defaultSort: [
          { event_datetime: { order: 'asc' } },
          { _score: { order: 'desc' } }
        ]
      }),
      ...this.buildPagination(page, limit)
    };
  }

  /**
   * Build upcoming events query
   */
  static buildUpcomingEventsQuery(params: {
    venue_id?: number;
    artist_id?: number;
    city_id?: number;
    days_ahead?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      venue_id,
      artist_id,
      city_id,
      days_ahead = 30,
      page = 1,
      limit = 10
    } = params;

    const filters: any[] = [];
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days_ahead);

    // Date range for upcoming events
    filters.push(this.buildDateRangeFilter('event_datetime', now, futureDate)!);

    // Venue filter
    if (venue_id) {
      filters.push({ term: { 'venue.id': venue_id } });
    }

    // Artist filter
    if (artist_id) {
      filters.push(this.buildNestedQuery('artists', {
        term: { 'artists.id': artist_id }
      }));
    }

    // City filter
    if (city_id) {
      filters.push({ term: { 'venue.city.id': city_id } });
    }

    return {
      query: {
        bool: {
          filter: filters
        }
      },
      sort: [
        { event_datetime: { order: 'asc' } }
      ],
      ...this.buildPagination(page, limit)
    };
  }
}

/**
 * Suggestion query builders
 */
export class SuggestionQueryBuilder {
  /**
   * Build autocomplete suggestion query
   */
  static buildSuggestionQuery(query: string, field = 'name.suggest') {
    return {
      suggest: {
        suggestions: {
          prefix: query,
          completion: {
            field,
            size: 10,
            skip_duplicates: true
          }
        }
      }
    };
  }

  /**
   * Build phrase suggestion query for typo correction
   */
  static buildPhraseSuggestionQuery(query: string, field = 'name') {
    return {
      suggest: {
        phrase_suggestions: {
          text: query,
          phrase: {
            field,
            size: 5,
            gram_size: 3,
            direct_generator: [{
              field,
              suggest_mode: 'missing',
              min_word_length: 1
            }]
          }
        }
      }
    };
  }
}