import React from 'react';
import Card from './Card';
import { ExternalLink } from 'lucide-react';

const PERTH_ATLAS_URL = 'https://atlas.id.com.au/wapl';

const LocalDemographics: React.FC = () => {
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

            <div className="mt-4">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800 rounded-md shadow-inner overflow-hidden">
                     <iframe
                        src={PERTH_ATLAS_URL}
                        title="Social Atlas Map for Greater Perth"
                        className="w-full h-[80vh] border-0"
                        loading="lazy"
                    />
                </div>
            </div>
        </Card>
    );
};

export default LocalDemographics;