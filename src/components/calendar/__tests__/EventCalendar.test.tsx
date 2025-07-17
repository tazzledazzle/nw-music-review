import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventCalendar from '../EventCalendar';

// Mock fetch
global.fetch = vi.fn();

// Create events for the current month to ensure they show up in the calendar
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const mockEvents = {
  events: [
    {
      id: 1,
      venue_id: 123,
      title: 'Test Concert',
      description: 'A great show',
      event_datetime: new Date(currentYear, currentMonth, 15, 20, 0, 0).toISOString(),
      ticket_url: 'https://tickets.example.com',
      external_id: 'ext123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      venue_id: 123,
      title: 'Another Show',
      description: 'Another great show',
      event_datetime: new Date(currentYear, currentMonth, 20, 19, 30, 0).toISOString(),
      ticket_url: 'https://tickets.example.com',
      external_id: 'ext124',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  pagination: {
    page: 1,
    limit: 100,
    total: 2,
    total_pages: 1
  }
};

describe('EventCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEvents)
    });
  });

  it('should render calendar with month view by default', async () => {
    render(<EventCalendar venueId={123} />);
    
    expect(screen.getByText('Loading events...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    // Check for month view elements
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    
    // Check for day headers
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('should switch to week view when week button is clicked', async () => {
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    const weekButton = screen.getByText('Week');
    fireEvent.click(weekButton);
    
    // Week view should be active
    expect(weekButton).toHaveClass('bg-white text-blue-600 shadow-sm');
  });

  it('should call onEventClick when an event is clicked', async () => {
    const mockOnEventClick = vi.fn();
    render(<EventCalendar venueId={123} onEventClick={mockOnEventClick} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    // Wait for events to be rendered
    await waitFor(() => {
      expect(screen.getByText('Test Concert')).toBeInTheDocument();
    });
    
    const eventButton = screen.getByText('Test Concert');
    fireEvent.click(eventButton);
    
    expect(mockOnEventClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        title: 'Test Concert'
      })
    );
  });

  it('should navigate to previous month when previous button is clicked', async () => {
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    const prevButton = screen.getByLabelText('Previous');
    fireEvent.click(prevButton);
    
    // Should make a new API call with different date range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should navigate to next month when next button is clicked', async () => {
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    const nextButton = screen.getByLabelText('Next');
    fireEvent.click(nextButton);
    
    // Should make a new API call with different date range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should navigate to current date when today button is clicked', async () => {
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
    
    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);
    
    // Should make a new API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should display error message when API call fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('API Error'));
    
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading events/)).toBeInTheDocument();
    });
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should display no events message when no events are returned', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events: [], pagination: { page: 1, limit: 100, total: 0, total_pages: 0 } })
    });
    
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(screen.getByText('No events scheduled for this month.')).toBeInTheDocument();
    });
  });

  it('should make API call with correct parameters', async () => {
    render(<EventCalendar venueId={123} />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/venues\/123\/events\?.*start_date=.*&end_date=.*&limit=100/)
      );
    });
  });

  it('should apply custom className', () => {
    render(<EventCalendar venueId={123} className="custom-class" />);
    
    const calendar = screen.getByText('Loading events...').closest('.custom-class');
    expect(calendar).toBeInTheDocument();
  });
});