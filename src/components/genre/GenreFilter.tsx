'use client';

import { useGenre } from '@/lib/context/genre-context';
import { VALID_GENRES } from '@/middleware';
import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface GenreFilterProps {
  className?: string;
  onChange?: (genre: string | null) => void;
  showAllOption?: boolean;
  label?: string;
}

/**
 * Component for filtering content by genre
 * Can be used as a controlled component with onChange or as a navigation component
 */
export default function GenreFilter({
  className = '',
  onChange,
  showAllOption = true,
  label = 'Genre'
}: GenreFilterProps) {
  const { currentGenre, validGenres } = useGenre();
  const [selected, setSelected] = useState<string | null>(currentGenre);
  const router = useRouter();
  
  // Create options array with "All Genres" option if requested
  const options = showAllOption 
    ? [{ id: 'all', name: 'All Genres', value: null }, ...validGenres.map(g => ({ id: g, name: capitalizeFirstLetter(g), value: g }))]
    : validGenres.map(g => ({ id: g, name: capitalizeFirstLetter(g), value: g }));
  
  // Find the current selection in options
  const currentSelection = options.find(opt => opt.value === selected) || options[0];
  
  // Handle selection change
  const handleChange = (option: { id: string, name: string, value: string | null }) => {
    setSelected(option.value);
    
    if (onChange) {
      // If controlled component, call onChange
      onChange(option.value);
    } else {
      // Otherwise, handle navigation
      if (option.value) {
        // Navigate to genre subdomain
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost';
        
        if (isLocalhost) {
          // For local development
          const port = window.location.port;
          window.location.href = `http://${option.value}.localhost:${port}${window.location.pathname}`;
        } else {
          // For production
          const domainParts = hostname.split('.');
          if (domainParts.length >= 2) {
            // Replace subdomain or add new one
            domainParts[0] = option.value;
            window.location.href = `${window.location.protocol}//${domainParts.join('.')}${window.location.pathname}`;
          }
        }
      } else {
        // Remove genre filter by navigating to main domain
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost';
        
        if (isLocalhost) {
          // For local development
          const port = window.location.port;
          window.location.href = `http://localhost:${port}${window.location.pathname}`;
        } else {
          // For production
          const domainParts = hostname.split('.');
          if (domainParts.length > 2) {
            // Remove subdomain
            window.location.href = `${window.location.protocol}//${domainParts.slice(1).join('.')}${window.location.pathname}`;
          }
        }
      }
    }
  };
  
  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  return (
    <div className={className}>
      <Listbox value={currentSelection} onChange={handleChange}>
        <div className="relative mt-1">
          <Listbox.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </Listbox.Label>
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
            <span className="block truncate">{currentSelection.name}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {options.map((option) => (
                <Listbox.Option
                  key={option.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                    }`
                  }
                  value={option}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {option.name}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}