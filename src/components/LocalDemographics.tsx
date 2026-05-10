import React from 'react';
import Card from './Card';
import { ExternalLink, Map, Globe, BarChart3, Users } from 'lucide-react';

const demographicResources = [
    {
        title: 'WA Population Lab – Social Atlas',
        description: 'Interactive demographic maps for the Western Australian Population Lab region, including population, ethnicity, language, and housing data.',
        url: 'https://atlas.id.com.au/wapl',
        icon: Map,
    },
    {
        title: 'ABS Census Data – Greater Perth',
        description: 'Access the latest Australian Bureau of Statistics census data for Greater Perth including demographics, income, and employment.',
        url: 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/5GPER',
        icon: BarChart3,
    },
    {
        title: 'WA Health – Population Health Data',
        description: 'Population health statistics and epidemiology data for Western Australia from the Department of Health.',
        url: 'https://www.health.wa.gov.au/Reports-and-publications/Population-health',
        icon: Users,
    },
    {
        title: '.id Community Profiles',
        description: 'Detailed community demographic profiles powered by .id, including population forecasts, economic profiles, and social atlases.',
        url: 'https://home.id.com.au/demographic-resources/',
        icon: Globe,
    },
];

const LocalDemographics: React.FC = () => {
    return (
        <Card>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Local Demographic Insights</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Explore interactive demographic maps based on ABS data from the Australian Social Atlas.
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Click any resource below to open it in a new tab.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {demographicResources.map((resource, index) => {
                    const IconComponent = resource.icon;
                    return (
                        <a
                            key={index}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md hover:border-baby-blue-300 dark:hover:border-baby-blue-500 transition-all duration-200"
                        >
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 p-2 bg-baby-blue-50 dark:bg-baby-blue-900/30 rounded-lg group-hover:bg-baby-blue-100 dark:group-hover:bg-baby-blue-900/50 transition-colors">
                                    <IconComponent className="h-6 w-6 text-baby-blue-500 dark:text-baby-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-baby-blue-600 dark:group-hover:text-baby-blue-400 transition-colors flex items-center">
                                        {resource.title}
                                        <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {resource.description}
                                    </p>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Note:</strong> These external resources open in a new browser tab. Data is sourced from the Australian Bureau of Statistics (ABS), 
                    .id community demographic tools, and the WA Department of Health.
                </p>
            </div>
        </Card>
    );
};

export default LocalDemographics;