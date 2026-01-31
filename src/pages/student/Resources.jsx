import { useState, useMemo } from 'react'
import {
    FileText,
    Search,
    Download,
    ExternalLink,
    Filter,
    Star,
    Layout,
    Presentation,
    ShieldCheck,
    BarChart,
    Send,
    HelpCircle,
    FolderOpen
} from 'lucide-react'
import { useData } from '../../hooks/useData'
import Card from '../../components/common/Card'

const ICON_MAP = {
    Layout: Layout,
    Presentation: Presentation,
    ShieldCheck: ShieldCheck,
    BarChart: BarChart,
    Send: Send,
    FileText: FileText,
}

export default function StudentResources() {
    const { data } = useData()
    const { globalResources = [] } = data || {}
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const categories = useMemo(() => {
        const cats = new Set(globalResources.map(r => r.category))
        return ['All', ...Array.from(cats).sort()]
    }, [globalResources])

    const filteredResources = useMemo(() => {
        return globalResources.filter(res => {
            const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.description?.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [globalResources, searchQuery, selectedCategory])

    const featuredResources = useMemo(() => {
        return globalResources.filter(r => r.isFeatured)
    }, [globalResources])

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-heading font-bold text-slate-900 dark:text-white">Helpful Documents</h1>
                    <p className="mt-2 text-lg text-slate-500 font-medium max-w-2xl">
                        A curated library of templates, guides, and resources to support your entrepreneurial journey.
                    </p>
                </div>
            </header>

            {/* Featured Section */}
            {featuredResources.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                        <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                        <h2>Must-Have Resources</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {featuredResources.map(res => (
                            <ResourceCard key={res.id} resource={res} featured />
                        ))}
                    </div>
                </section>
            )}

            {/* Main Library */}
            <section className="space-y-6 pt-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                        <FolderOpen className="h-6 w-6 text-student-primary" />
                        <h2>Document Library</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-student-primary/20 focus:border-student-primary bg-white transition-all text-sm"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                                            ? 'bg-student-primary text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredResources.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6 border border-slate-100">
                            <HelpCircle className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No documents found</h3>
                        <p className="text-slate-500 mt-2">Try adjusting your search or category filter.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredResources.map(res => (
                            <ResourceCard key={res.id} resource={res} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

function ResourceCard({ resource, featured = false }) {
    const Icon = ICON_MAP[resource.iconName] || FileText

    return (
        <Card className={`group relative h-full flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1 ${featured ? 'border-amber-100 bg-gradient-to-br from-white to-amber-50/30 ring-1 ring-amber-50' : 'border-slate-100'}`}>
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${featured ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${featured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {resource.category}
                    </span>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-student-primary transition-colors line-clamp-2">
                        {resource.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {resource.description}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                        {resource.fileType || 'Link'}
                    </span>
                </div>

                <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${featured
                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'
                        }`}
                >
                    {resource.fileType === 'Link' ? (
                        <>
                            <ExternalLink className="h-4 w-4" />
                            Open Link
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4" />
                            Download
                        </>
                    )}
                </a>
            </div>
        </Card>
    )
}
