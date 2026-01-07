import React, { useState } from 'react';
import Card from './Card';
import { ExternalLink } from 'lucide-react';

const lgas = [
    { name: 'Greater Perth', url: 'https://atlas.id.com.au/perth/maps/social-atlas?id=235&z=10&lat=-31.95&lng=115.86' },
    { name: 'Wanneroo', url: 'https://atlas.id.com.au/wanneroo' },
    { name: 'Swan', url: 'https://atlas.id.com.au/swan' },
    { name: 'Stirling', url: 'https://atlas.id.com.au/stirling/maps/social-atlas?id=235&z=11&lat=-31.87&lng=115.80' },
    { name: 'Canning', url: 'https://atlas.id.com.au/canning/maps/social-atlas?id=235&z=11&lat=-32.02&lng=115.93' },
    { name: 'Gosnells', url: 'https://atlas.id.com.au/gosnells/maps/social-atlas?id=235&z=11&lat=-32.07&lng=115.98' },
    { name: 'Mandurah', url: 'https://atlas.id.com.au/mandurah/maps/social-atlas?id=235&z=10&lat=-32.55&lng=115.75' },
];

const LocalDemographics: React.FC = () => {
    const [activeLgaIndex, setActiveLgaIndex] = useState(0);

    return (
        <Card>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Local Demographic Insights</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Explore interactive demographic maps based on ABS data from the Australian Social Atlas.
                </p>
                <a 
                    href="https://atlas.id.com.au/" 
                    target="_blank" rel="noopener noreferrer" 
                    className="mt-2 inline-flex items-center text-xs text-baby-blue-500 hover:text-baby-blue-600 dark:text-baby-blue-400 dark:hover:text-baby-blue-300"
                >
                    Data provided by .id SAFARI <ExternalLink className="ml-1 h-3 w-3" />
                </a>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {lgas.map((lga, index) => (
                        <button
                            key={lga.name}
                            onClick={() => setActiveLgaIndex(index)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeLgaIndex === index
                                ? 'border-lime-green-500 text-lime-green-600 dark:text-lime-green-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            }`}
                        >
                            {lga.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-4">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800 rounded-md shadow-inner overflow-hidden">
                     <iframe
                        key={lgas[activeLgaIndex].url}
                        src={lgas[activeLgaIndex].url}
                        title={`Social Atlas Map for ${lgas[activeLgaIndex].name}`}
                        className="w-full h-[80vh] border-0"
                        loading="lazy"
                    />
                </div>
            </div>
        </Card>
    );
};

export default LocalDemographics;