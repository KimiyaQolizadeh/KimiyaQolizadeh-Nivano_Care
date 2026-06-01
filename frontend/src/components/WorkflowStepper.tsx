interface WorkflowStepperProps {
  steps: string[]
  currentStep: number
}

export default function WorkflowStepper({ steps, currentStep }: WorkflowStepperProps) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-sm shadow-slate-200/70">
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-5">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div key={step} className="relative min-w-0">
              <div className="flex items-center">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-sm ${
                    isCurrent ? 'bg-blue-700 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                  }`}
                >
                  {index + 1}
                </span>
                {index < steps.length - 1 && (
                  <div className={`ml-3 h-0.5 flex-1 rounded-full ${isDone ? 'bg-emerald-300' : isCurrent ? 'bg-blue-300' : 'bg-slate-200'}`} />
                )}
              </div>
              <p className={`mt-3 text-sm font-bold leading-5 ${isCurrent ? 'text-blue-900' : isDone ? 'text-emerald-900' : 'text-slate-500'}`}>
                {step}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {isCurrent ? 'Current' : isDone ? 'Ready' : 'Upcoming'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
