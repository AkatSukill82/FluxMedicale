import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const StepperContext = React.createContext({ activeStep: 0 });

const Stepper = ({ activeStep, children, className, ...props }) => {
  const steps = React.Children.toArray(children);
  const contextValue = React.useMemo(() => ({ activeStep }), [activeStep]);

  return (
    <StepperContext.Provider value={contextValue}>
      <div className={cn("flex items-center justify-between w-full", className)} {...props}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {React.cloneElement(step, { index, totalSteps: steps.length })}
            {index < steps.length - 1 && (
              <div
                className={cn("flex-1 h-0.5 transition-colors", activeStep > index ? 'bg-blue-600' : 'bg-slate-200')}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </StepperContext.Provider>
  );
};

const Step = ({ index, children }) => {
  return <div className="flex flex-col items-center relative">{React.cloneElement(children, { index })}</div>;
};

const StepLabel = ({ index, children, icon }) => {
  const { activeStep } = React.useContext(StepperContext);
  const isActive = activeStep === index;
  const isCompleted = activeStep > index;

  return (
    <>
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 border-2",
          isCompleted
            ? "bg-blue-600 border-blue-600 text-white"
            : isActive
            ? "bg-white border-blue-600 text-blue-600"
            : "bg-slate-200 border-slate-200 text-slate-600"
        )}
      >
        {isCompleted ? <Check className="w-5 h-5" /> : icon ? React.cloneElement(icon, { className: 'w-5 h-5' }) : index + 1}
      </div>
      <p className={cn(
          "mt-2 text-sm text-center font-medium",
          isActive || isCompleted ? "text-blue-600" : "text-slate-500"
      )}>
        {children}
      </p>
    </>
  );
};

export { Stepper, Step, StepLabel };