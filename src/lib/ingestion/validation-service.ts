/**
 * Data validation and duplicate detection service
 */

import { ExternalEvent, ExternalVenue, ExternalArtist, TransformationResult } from './types';

interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'url' | 'email';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

interface DuplicateDetectionConfig {
  eventSimilarityThreshold: number; // 0-1, how similar events need to be to be considered duplicates
  venueSimilarityThreshold: number;
  artistSimilarityThreshold: number;
  enableFuzzyMatching: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // Quality score 0-100
}

interface DuplicateResult {
  isDuplicate: boolean;
  duplicateId?: string;
  similarity: number;
  reason: string;
}

export class ValidationService {
  private config: DuplicateDetectionConfig;
  private eventRules: ValidationRule[];
  private venueRules: ValidationRule[];
  private artistRules: ValidationRule[];

  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = {
      eventSimilarityThreshold: 0.8,
      venueSimilarityThreshold: 0.9,
      artistSimilarityThreshold: 0.85,
      enableFuzzyMatching: true,
      ...config,
    };

    this.initializeValidationRules();
  }

  /**
   * Validate external event data
   */
  validateEvent(event: ExternalEvent): ValidationResult {
    return this.validateData(event, this.eventRules);
  }

  /**
   * Validate external venue data
   */
  validateVenue(venue: ExternalVenue): ValidationResult {
    return this.validateData(venue, this.venueRules);
  }

  /**
   * Validate external artist data
   */
  validateArtist(artist: ExternalArtist): ValidationResult {
    return this.validateData(artist, this.artistRules);
  }

  /**
   * Check if event is a duplicate of existing events
   */
  checkEventDuplicate(event: ExternalEvent, existingEvents: ExternalEvent[]): DuplicateResult {
    for (const existing of existingEvents) {
      const similarity = this.calculateEventSimilarity(event, existing);
      
      if (similarity >= this.config.eventSimilarityThreshold) {
        return {
          isDuplicate: true,
          duplicateId: existing.id,
          similarity,
          reason: `Event matches existing event with ${Math.round(similarity * 100)}% similarity`,
        };
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      reason: 'No duplicate found',
    };
  }

  /**
   * Check if venue is a duplicate of existing venues
   */
  checkVenueDuplicate(venue: ExternalVenue, existingVenues: ExternalVenue[]): DuplicateResult {
    for (const existing of existingVenues) {
      const similarity = this.calculateVenueSimilarity(venue, existing);
      
      if (similarity >= this.config.venueSimilarityThreshold) {
        return {
          isDuplicate: true,
          duplicateId: existing.id,
          similarity,
          reason: `Venue matches existing venue with ${Math.round(similarity * 100)}% similarity`,
        };
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      reason: 'No duplicate found',
    };
  }

  /**
   * Check if artist is a duplicate of existing artists
   */
  checkArtistDuplicate(artist: ExternalArtist, existingArtists: ExternalArtist[]): DuplicateResult {
    for (const existing of existingArtists) {
      const similarity = this.calculateArtistSimilarity(artist, existing);
      
      if (similarity >= this.config.artistSimilarityThreshold) {
        return {
          isDuplicate: true,
          duplicateId: existing.id,
          similarity,
          reason: `Artist matches existing artist with ${Math.round(similarity * 100)}% similarity`,
        };
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      reason: 'No duplicate found',
    };
  }

  /**
   * Batch validate and deduplicate events
   */
  validateAndDeduplicateEvents(events: ExternalEvent[]): TransformationResult<ExternalEvent[]> {
    const validEvents: ExternalEvent[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Validate event
      const validation = this.validateEvent(event);
      if (!validation.isValid) {
        errors.push(`Event ${i}: ${validation.errors.join(', ')}`);
        continue;
      }
      
      warnings.push(...validation.warnings.map(w => `Event ${i}: ${w}`));

      // Check for duplicates within the batch
      const duplicateCheck = this.checkEventDuplicate(event, validEvents);
      if (duplicateCheck.isDuplicate) {
        warnings.push(`Event ${i}: ${duplicateCheck.reason}`);
        continue;
      }

      validEvents.push(event);
    }

    return {
      success: errors.length === 0,
      data: validEvents,
      errors,
      warnings,
    };
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    this.eventRules = [
      {
        field: 'id',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'title',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 300,
      },
      {
        field: 'datetime',
        required: true,
        type: 'date',
        customValidator: (value) => value instanceof Date && !isNaN(value.getTime()),
      },
      {
        field: 'venue',
        required: true,
        type: 'string',
        customValidator: (value) => typeof value === 'object' && value.name,
      },
      {
        field: 'artists',
        required: true,
        type: 'string',
        customValidator: (value) => Array.isArray(value) && value.length > 0,
      },
      {
        field: 'source',
        required: true,
        type: 'string',
        customValidator: (value) => ['songkick', 'bandsintown', 'ticketmaster', 'scraper'].includes(value),
      },
    ];

    this.venueRules = [
      {
        field: 'id',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      {
        field: 'city',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'country',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 3,
      },
    ];

    this.artistRules = [
      {
        field: 'id',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
      },
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
    ];
  }

  /**
   * Validate data against rules
   */
  private validateData(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      
      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required field '${rule.field}' is missing`);
        score -= 20;
        continue;
      }

      if (value === undefined || value === null) {
        continue; // Skip validation for optional missing fields
      }

      // Type validation
      if (!this.validateType(value, rule.type)) {
        errors.push(`Field '${rule.field}' has invalid type, expected ${rule.type}`);
        score -= 15;
        continue;
      }

      // Length validation
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        errors.push(`Field '${rule.field}' is too short, minimum length is ${rule.minLength}`);
        score -= 10;
      }

      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        warnings.push(`Field '${rule.field}' is too long, maximum length is ${rule.maxLength}`);
        score -= 5;
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`Field '${rule.field}' does not match required pattern`);
        score -= 10;
      }

      // Custom validation
      if (rule.customValidator && !rule.customValidator(value)) {
        errors.push(`Field '${rule.field}' failed custom validation`);
        score -= 15;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Calculate similarity between two events
   */
  private calculateEventSimilarity(event1: ExternalEvent, event2: ExternalEvent): number {
    let totalWeight = 0;
    let matchWeight = 0;

    // Title similarity (weight: 40%)
    const titleSimilarity = this.calculateStringSimilarity(event1.title, event2.title);
    totalWeight += 40;
    matchWeight += titleSimilarity * 40;

    // Venue similarity (weight: 30%)
    const venueSimilarity = this.calculateStringSimilarity(event1.venue.name, event2.venue.name);
    totalWeight += 30;
    matchWeight += venueSimilarity * 30;

    // Date similarity (weight: 20%)
    const dateSimilarity = this.calculateDateSimilarity(event1.datetime, event2.datetime);
    totalWeight += 20;
    matchWeight += dateSimilarity * 20;

    // Artist similarity (weight: 10%)
    const artistSimilarity = this.calculateArtistListSimilarity(event1.artists, event2.artists);
    totalWeight += 10;
    matchWeight += artistSimilarity * 10;

    return totalWeight > 0 ? matchWeight / totalWeight : 0;
  }

  /**
   * Calculate similarity between two venues
   */
  private calculateVenueSimilarity(venue1: ExternalVenue, venue2: ExternalVenue): number {
    let totalWeight = 0;
    let matchWeight = 0;

    // Name similarity (weight: 50%)
    const nameSimilarity = this.calculateStringSimilarity(venue1.name, venue2.name);
    totalWeight += 50;
    matchWeight += nameSimilarity * 50;

    // City similarity (weight: 30%)
    const citySimilarity = this.calculateStringSimilarity(venue1.city, venue2.city);
    totalWeight += 30;
    matchWeight += citySimilarity * 30;

    // Address similarity (weight: 20%)
    if (venue1.address && venue2.address) {
      const addressSimilarity = this.calculateStringSimilarity(venue1.address, venue2.address);
      totalWeight += 20;
      matchWeight += addressSimilarity * 20;
    }

    return totalWeight > 0 ? matchWeight / totalWeight : 0;
  }

  /**
   * Calculate similarity between two artists
   */
  private calculateArtistSimilarity(artist1: ExternalArtist, artist2: ExternalArtist): number {
    return this.calculateStringSimilarity(artist1.name, artist2.name);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    if (!this.config.enableFuzzyMatching) {
      return s1 === s2 ? 1 : 0;
    }

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  /**
   * Calculate date similarity
   */
  private calculateDateSimilarity(date1: Date, date2: Date): number {
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Same day = 1.0, within 24 hours = 0.5, beyond that decreases
    if (diffHours === 0) return 1;
    if (diffHours <= 24) return 0.5;
    if (diffHours <= 48) return 0.2;
    return 0;
  }

  /**
   * Calculate similarity between artist lists
   */
  private calculateArtistListSimilarity(artists1: ExternalArtist[], artists2: ExternalArtist[]): number {
    if (artists1.length === 0 && artists2.length === 0) return 1;
    if (artists1.length === 0 || artists2.length === 0) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const artist1 of artists1) {
      let bestMatch = 0;
      for (const artist2 of artists2) {
        const similarity = this.calculateStringSimilarity(artist1.name, artist2.name);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
      comparisons++;
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate data type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        return value instanceof Date && !isNaN(value.getTime());
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}