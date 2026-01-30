import { useState, useEffect } from 'react'
import Joyride, { STATUS } from 'react-joyride'
import { supabase } from '../../lib/supabase'

const TOURS = {
    template_creation: [
        {
            target: '[data-tour="create-template"]',
            content: 'Click here to create a new program template',
            disableBeacon: true
        },
        {
            target: '[data-tour="template-name"]',
            content: 'Give your template a descriptive name'
        },
        {
            target: '[data-tour="add-stage"]',
            content: 'Add stages to structure your program'
        },
        {
            target: '[data-tour="save-template"]',
            content: 'Save your template when ready'
        }
    ],
    instance_setup: [
        {
            target: '[data-tour="create-instance"]',
            content: 'Start a new program instance from a template',
            disableBeacon: true
        },
        {
            target: '[data-tour="select-template"]',
            content: 'Choose which template to use'
        },
        {
            target: '[data-tour="assign-student"]',
            content: 'Assign a student to this instance'
        }
    ],
    task_management: [
        {
            target: '[data-tour="task-list"]',
            content: 'View all tasks in your roadmap',
            disableBeacon: true
        },
        {
            target: '[data-tour="task-status"]',
            content: 'Update task status as you progress'
        },
        {
            target: '[data-tour="submit-task"]',
            content: 'Submit completed tasks for review'
        }
    ]
}

export default function OnboardingTour({ tourName, onComplete }) {
    const [run, setRun] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)

    const checkTourCompletion = async () => {
        const user = await supabase.auth.getUser()
        const { data } = await supabase
            .from('onboarding_progress')
            .select('completed_tours')
            .eq('user_id', user.data.user?.id)
            .single()

        const completedTours = data?.completed_tours || []
        if (!completedTours.includes(tourName)) {
            setRun(true)
        }
    }

    useEffect(() => {
        checkTourCompletion()
    }, [tourName])

    const handleJoyrideCallback = async (data) => {
        const { status, index, type } = data

        if (type === 'step:after') {
            setStepIndex(index + 1)
        }

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRun(false)
            await markTourComplete()
            onComplete?.()
        }
    }

    const markTourComplete = async () => {
        const user = await supabase.auth.getUser()
        const userId = user.data.user?.id

        const { data } = await supabase
            .from('onboarding_progress')
            .select('completed_tours')
            .eq('user_id', userId)
            .single()

        const completedTours = data?.completed_tours || []

        await supabase
            .from('onboarding_progress')
            .upsert({
                user_id: userId,
                completed_tours: [...completedTours, tourName],
                updated_at: new Date().toISOString()
            })
    }

    const steps = TOURS[tourName] || []

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#3b82f6',
                    zIndex: 10000
                }
            }}
        />
    )
}
