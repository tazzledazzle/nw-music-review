/**
 * Scheduler service for regular data ingestion and updates
 */

import { IngestionService } from './ingestion-service';
import { WebScraperService } from './web-scraper-service';
import { ExternalSearchParams } from './types';

interface ScheduleConfig {
  enabled: boolean;
  intervals: {
    apiIngestion: number; // milliseconds
    webScraping: number; // milliseconds
    cleanup: number; // milliseconds
  };
  targets: {
    regions: string[];
    popularArtists: string[];
    venueUrls: string[];
  };
  limits: {
    maxEventsPerRun: number;
    maxScrapingTargets: number;
  };
}

interface ScheduledJob {
  id: string;
  name: string;
  type: 'api' | 'scraping' | 'cleanup';
  interval: number;
  lastRun?: Date;
  nextRun: Date;
  enabled: boolean;
  config?: any;
}

interface JobResult {
  jobId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  itemsProcessed: number;
  errors: string[];
  warnings: string[];
}

export class SchedulerService {
  private config: ScheduleConfig;
  private ingestionService: IngestionService;
  private scraperService: WebScraperService;
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private jobHistory: JobResult[] = [];

  constructor(
    config: ScheduleConfig,
    ingestionService: IngestionService,
    scraperService: WebScraperService
  ) {
    this.config = config;
    this.ingestionService = ingestionService;
    this.scraperService = scraperService;
    
    this.initializeJobs();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    console.log('Starting data ingestion scheduler...');

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping data ingestion scheduler...');

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Add a new scheduled job
   */
  addJob(job: Omit<ScheduledJob, 'id' | 'nextRun'>): string {
    const id = this.generateJobId();
    const scheduledJob: ScheduledJob = {
      ...job,
      id,
      nextRun: new Date(Date.now() + job.interval),
    };

    this.jobs.set(id, scheduledJob);

    if (this.isRunning && job.enabled) {
      this.scheduleJob(scheduledJob);
    }

    return id;
  }

  /**
   * Remove a scheduled job
   */
  removeJob(jobId: string): boolean {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    return this.jobs.delete(jobId);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job execution history
   */
  getJobHistory(limit: number = 50): JobResult[] {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Run a job immediately
   */
  async runJobNow(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return await this.executeJob(job);
  }

  /**
   * Initialize default jobs
   */
  private initializeJobs(): void {
    // API ingestion job for each region
    for (const region of this.config.targets.regions) {
      this.addJob({
        name: `API Ingestion - ${region}`,
        type: 'api',
        interval: this.config.intervals.apiIngestion,
        enabled: true,
        config: { region },
      });
    }

    // Popular artists ingestion job
    this.addJob({
      name: 'Popular Artists Ingestion',
      type: 'api',
      interval: this.config.intervals.apiIngestion * 2, // Less frequent
      enabled: true,
      config: { type: 'artists', artists: this.config.targets.popularArtists },
    });

    // Web scraping job
    this.addJob({
      name: 'Venue Website Scraping',
      type: 'scraping',
      interval: this.config.intervals.webScraping,
      enabled: true,
      config: { venues: this.config.targets.venueUrls },
    });

    // Cleanup job
    this.addJob({
      name: 'Data Cleanup',
      type: 'cleanup',
      interval: this.config.intervals.cleanup,
      enabled: true,
      config: {},
    });
  }

  /**
   * Schedule a job to run
   */
  private scheduleJob(job: ScheduledJob): void {
    const delay = Math.max(0, job.nextRun.getTime() - Date.now());
    
    const timer = setTimeout(async () => {
      try {
        await this.executeJob(job);
      } catch (error) {
        console.error(`Error executing job ${job.id}:`, error);
      }
      
      // Reschedule the job
      if (this.isRunning && job.enabled) {
        job.nextRun = new Date(Date.now() + job.interval);
        this.scheduleJob(job);
      }
    }, delay);

    this.timers.set(job.id, timer);
  }

  /**
   * Execute a scheduled job
   */
  private async executeJob(job: ScheduledJob): Promise<JobResult> {
    const startTime = new Date();
    console.log(`Executing job: ${job.name} (${job.id})`);

    const result: JobResult = {
      jobId: job.id,
      success: false,
      startTime,
      endTime: new Date(),
      itemsProcessed: 0,
      errors: [],
      warnings: [],
    };

    try {
      switch (job.type) {
        case 'api':
          await this.executeApiIngestionJob(job, result);
          break;
        case 'scraping':
          await this.executeScrapingJob(job, result);
          break;
        case 'cleanup':
          await this.executeCleanupJob(job, result);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      result.success = result.errors.length === 0;
      job.lastRun = startTime;
    } catch (error) {
      result.errors.push(`Job execution failed: ${error}`);
      result.success = false;
    }

    result.endTime = new Date();
    this.jobHistory.push(result);

    // Keep only last 1000 job results
    if (this.jobHistory.length > 1000) {
      this.jobHistory = this.jobHistory.slice(-1000);
    }

    console.log(`Job ${job.name} completed: ${result.success ? 'SUCCESS' : 'FAILED'}, processed ${result.itemsProcessed} items`);
    
    return result;
  }

  /**
   * Execute API ingestion job
   */
  private async executeApiIngestionJob(job: ScheduledJob, result: JobResult): Promise<void> {
    const config = job.config;

    if (config.region) {
      // Ingest events by region
      const searchParams: ExternalSearchParams = {
        location: config.region,
        limit: this.config.limits.maxEventsPerRun,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
      };

      const ingestionResult = await this.ingestionService.ingestEventsByLocation(searchParams);
      
      result.itemsProcessed = ingestionResult.eventsProcessed;
      result.errors.push(...ingestionResult.errors);
      result.warnings.push(...ingestionResult.warnings);
    } else if (config.type === 'artists' && config.artists) {
      // Ingest events by popular artists
      let totalProcessed = 0;
      
      for (const artist of config.artists.slice(0, 10)) { // Limit to 10 artists per run
        try {
          const searchParams: ExternalSearchParams = {
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            limit: 50,
          };

          const ingestionResult = await this.ingestionService.ingestEventsByArtist(artist, searchParams);
          totalProcessed += ingestionResult.eventsProcessed;
          result.errors.push(...ingestionResult.errors);
          result.warnings.push(...ingestionResult.warnings);

          // Add delay between artist requests
          await this.sleep(1000);
        } catch (error) {
          result.errors.push(`Failed to ingest events for artist ${artist}: ${error}`);
        }
      }

      result.itemsProcessed = totalProcessed;
    }
  }

  /**
   * Execute web scraping job
   */
  private async executeScrapingJob(job: ScheduledJob, result: JobResult): Promise<void> {
    const config = job.config;
    let totalProcessed = 0;

    if (config.venues) {
      const maxTargets = Math.min(config.venues.length, this.config.limits.maxScrapingTargets);
      
      for (let i = 0; i < maxTargets; i++) {
        const venueUrl = config.venues[i];
        
        try {
          // Basic selectors for common venue website patterns
          const selectors = {
            title: '.event-title, .show-title, h1, h2',
            description: '.event-description, .show-description, .description',
            date: '.event-date, .show-date, .date',
            time: '.event-time, .show-time, .time',
            venue: '.venue-name, .location',
            artists: '.artist-name, .performer, .lineup',
            ticketUrl: 'a[href*="ticket"], a[href*="buy"]',
          };

          const scrapingResult = await this.scraperService.scrapeVenueEvents(venueUrl, selectors);
          
          if (scrapingResult.success && scrapingResult.data) {
            totalProcessed += scrapingResult.data.length;
          } else {
            result.errors.push(...scrapingResult.errors);
          }

          // Add delay between scraping requests
          await this.sleep(2000);
        } catch (error) {
          result.errors.push(`Failed to scrape venue ${venueUrl}: ${error}`);
        }
      }
    }

    result.itemsProcessed = totalProcessed;
  }

  /**
   * Execute cleanup job
   */
  private async executeCleanupJob(job: ScheduledJob, result: JobResult): Promise<void> {
    // This would typically clean up old events, remove duplicates, etc.
    // For now, just log that cleanup ran
    console.log('Running data cleanup...');
    
    // Simulate cleanup work
    await this.sleep(1000);
    
    result.itemsProcessed = 1; // Placeholder
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}