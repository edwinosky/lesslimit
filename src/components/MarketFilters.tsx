import React, { useState } from 'react';

interface FilterProps {
  onFiltersChange: (filters: {
    category: string;
    sortBy: string;
  }) => void;
}

const MarketFilters: React.FC<FilterProps> = ({ onFiltersChange }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Trending');

  const categories = [
    'All',
    'Hourly',
    'Daily Strikes',
    'Weekly',
    'Monthly',
    'Political',
    'Crypto',
    'Sports',
    'Weather'
  ];

  const sortOptions = [
    'Trending',
    'Ending Soon',
    'High Value',
    'Newest',
    'LP Rewards'
  ];

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    onFiltersChange({ category, sortBy: selectedSort });
  };

  const handleSortChange = (sortBy: string) => {
    setSelectedSort(sortBy);
    onFiltersChange({ category: selectedCategory, sortBy });
  };

  return (
    <div className="mb-6 bg-gray-800 p-4 rounded-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Categorías</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Ordenar por</h3>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleSortChange(option)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedSort === option
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketFilters;
