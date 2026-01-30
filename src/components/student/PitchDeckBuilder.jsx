import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { Plus, Save, Download, Eye } from 'lucide-react'

const SECTION_TEMPLATES = {
    problem: { title: 'Problem', placeholder: 'What problem are you solving?' },
    solution: { title: 'Solution', placeholder: 'How does your product solve it?' },
    market: { title: 'Market Size', placeholder: 'Total addressable market...' },
    business_model: { title: 'Business Model', placeholder: 'How will you make money?' },
    traction: { title: 'Traction', placeholder: 'Key metrics and milestones...' },
    team: { title: 'Team', placeholder: 'Who is building this?' },
    financials: { title: 'Financials', placeholder: 'Revenue projections...' },
    ask: { title: 'The Ask', placeholder: 'How much are you raising?' }
}

export default function PitchDeckBuilder({ deckId }) {
    const [deck, setDeck] = useState(null)
    const [sections, setSections] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchDeck = async () => {
        const { data: deckData } = await supabase
            .from('pitch_decks')
            .select('*')
            .eq('id', deckId)
            .single()

        const { data: sectionsData } = await supabase
            .from('pitch_deck_sections')
            .select('*')
            .eq('deck_id', deckId)
            .order('order_index')

        setDeck(deckData)
        setSections(sectionsData || [])
        setLoading(false)
    }

    const createNewDeck = async () => {
        const { data } = await supabase
            .from('pitch_decks')
            .insert([{ title: 'Untitled Deck', version: 1 }])
            .select()
            .single()

        if (data) {
            setDeck(data)
            setLoading(false)
        }
    }

    useEffect(() => {
        if (deckId) {
            fetchDeck()
        } else {
            createNewDeck()
        }
    }, [deckId])

    const addSection = async (sectionType) => {
        const template = SECTION_TEMPLATES[sectionType]
        const { data } = await supabase
            .from('pitch_deck_sections')
            .insert([{
                deck_id: deck.id,
                section_type: sectionType,
                title: template.title,
                content: { text: '' },
                order_index: sections.length
            }])
            .select()
            .single()

        if (data) {
            setSections([...sections, data])
        }
    }

    const updateSection = async (sectionId, content) => {
        await supabase
            .from('pitch_deck_sections')
            .update({ content })
            .eq('id', sectionId)

        setSections(sections.map(s => s.id === sectionId ? { ...s, content } : s))
    }

    const exportDeck = async () => {
        const { data } = await supabase.rpc('export_pitch_deck', { p_deck_id: deck.id })
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${deck.title}.json`
        a.click()
    }

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{deck.title}</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Version {deck.version}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={exportDeck}>
                        <Download size={16} className="mr-2" /> Export
                    </Button>
                    <Button>
                        <Eye size={16} className="mr-2" /> Preview
                    </Button>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-6 mb-8">
                {sections.map((section, index) => (
                    <SectionEditor
                        key={section.id}
                        section={section}
                        index={index}
                        onUpdate={(content) => updateSection(section.id, content)}
                    />
                ))}
            </div>

            {/* Add Section */}
            <Card className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Add Section</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(SECTION_TEMPLATES).map(([type, template]) => (
                        <Button
                            key={type}
                            variant="secondary"
                            size="sm"
                            onClick={() => addSection(type)}
                        >
                            <Plus size={14} className="mr-1" /> {template.title}
                        </Button>
                    ))}
                </div>
            </Card>
        </div>
    )
}

function SectionEditor({ section, index, onUpdate }) {
    const [content, setContent] = useState(section.content?.text || '')

    const handleSave = () => {
        onUpdate({ ...section.content, text: content })
    }

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-sm text-slate-500">Slide {index + 1}</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{section.title}</h3>
                </div>
                <Button size="sm" onClick={handleSave}>
                    <Save size={14} className="mr-1" /> Save
                </Button>
            </div>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-40 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 resize-none"
                placeholder={SECTION_TEMPLATES[section.section_type]?.placeholder}
            />
        </Card>
    )
}
