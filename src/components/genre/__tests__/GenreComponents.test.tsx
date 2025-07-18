import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GenreBadge from '../GenreBadge';
import GenreFilter from '../GenreFilter';
import { GenreProvider } from '@/lib/context/genre-context';

// Mock the useRouter hook
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Genre Components', () => {
  describe('GenreBadge', () => {
    it('should not render when no genre is selected', () => {
      const { container } = render(
        <GenreProvider initialGenre={null}>
          <GenreBadge />
        </GenreProvider>
      );
      
      expect(container.firstChild).toBeNull();
    });
    
    it('should render with the current genre', () => {
      render(
        <GenreProvider initialGenre="rock">
          <GenreBadge />
        </GenreProvider>
      );
      
      expect(screen.getByText('rock')).toBeInTheDocument();
    });
    
    it('should render with clear button when showClear is true', () => {
      render(
        <GenreProvider initialGenre="jazz">
          <GenreBadge showClear={true} />
        </GenreProvider>
      );
      
      expect(screen.getByText('jazz')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
      expect(screen.getByText('Remove genre filter')).toBeInTheDocument();
    });
  });
  
  describe('GenreFilter', () => {
    it('should render with the current genre selected', () => {
      render(
        <GenreProvider initialGenre="rock">
          <GenreFilter />
        </GenreProvider>
      );
      
      expect(screen.getByText('Rock')).toBeInTheDocument();
    });
    
    it('should call onChange when a genre is selected', () => {
      const handleChange = vi.fn();
      
      render(
        <GenreProvider initialGenre={null}>
          <GenreFilter onChange={handleChange} />
        </GenreProvider>
      );
      
      // Open the dropdown
      fireEvent.click(screen.getByRole('button'));
      
      // Select a genre
      fireEvent.click(screen.getByText('Rock'));
      
      expect(handleChange).toHaveBeenCalledWith('rock');
    });
  });
});