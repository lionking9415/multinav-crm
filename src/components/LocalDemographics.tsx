import React from 'react';
import Card from './Card';
import { ExternalLink, Map, Globe, BarChart3, Users } from 'lucide-react';

const demographicResources = [
    {
        title: 'ABS Census Data – Greater Perth',
        description: 'Access the latest Australian Bureau of Statistics census data for Greater Perth including demographics, income, and employment.',
        url: 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/5GPER',
        icon: BarChart3,
    },
    {
        title: 'ABS TableBuilder – Custom Data',
        description: 'Build custom tables and maps from ABS Census data. Create demographic breakdowns by language, country of birth, and more.',
        url: 'https://www.abs.gov.au/statistics/microdata-tablebuilder/tablebuilder',
        icon: Map,
    },
    {
        title: 'WA Health – Epidemiology Reports',
        description: 'Population health statistics and epidemiology reports for Western Australia from the WA Department of Health.',
        url: 'https://ww2.health.wa.gov.au/Reports-and-publications/Population-health',
        icon: Users,
    },
    {
        title: 'Profile .id – City of Perth',
        description: 'Community profile for City of Perth including population, cultural diversity, housing, and economic data.',
        url: 'https://profile.id.com.au/perth',
        icon: Globe,
    },
    {
        title: 'ABS – Cultural Diversity in Australia',
        description: 'Census data on country of birth, language spoken at home, ancestry, and cultural diversity across Australia.',
        url: 'https://www.abs.gov.au/statistics/people/people-and-communities/cultural-diversity-census/latest-release',
        icon: Users,
    },
    {
        title: 'ABS Data Explorer – Interactive Maps',
        description: 'Explore ABS data visually with interactive maps and charts. View demographics by region, suburb, and statistical area.',
        url: 'https://explore.data.abs.gov.au/',
        icon: Map,
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
                    .id community profiles, and the WA Department of Health. Use these tools to understand local demographics relevant to health navigation services.
                </p>
            </div>
        </Card>
    );
};

export default LocalDemographics;