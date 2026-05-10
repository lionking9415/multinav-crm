import React from 'react';
import Card from './Card';
import { ExternalLink, Map } from 'lucide-react';

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
                <div className="bg-gradient-to-br from-baby-blue-50 to-lime-green-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-12 text-center">
                    <Map className="mx-auto h-24 w-24 text-baby-blue-400 dark:text-baby-blue-300 mb-6" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                        Perth Social Atlas
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                        Access detailed demographic data, interactive maps, and community profiles for Greater Perth. 
                        View population statistics, cultural diversity, language data, and socioeconomic indicators by suburb and region.
                    </p>
                    <a
                        href={PERTH_ATLAS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 transition-colors"
                    >
                        Open Interactive Atlas
                        <ExternalLink className="ml-3 h-6 w-6" />
                    </a>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Opens in a new tab
                    </p>
                </div>
            </div>
        </Card>
    );
};

export default LocalDemographics;