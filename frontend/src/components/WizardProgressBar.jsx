import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  { id: 1, label: 'Incident', icon: '📋' },
  { id: 2, label: 'Correlate', icon: '🔗' },
  { id: 3, label: 'AI Prediction', icon: '🧠' },
  { id: 4, label: 'Cash-Out Map', icon: '📍' },
  { id: 5, label: 'Action Center', icon: '📣' }
];

export default function WizardProgressBar({ currentStep, completedSteps, onStepClick, simulationActive }) {
  return (
    <div className="wizard-progress-bar">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps && completedSteps.has(step.id);
        const isFuture = !isActive && !isCompleted;
        
        let circleClass = 'wizard-step-circle';
        if (isActive) circleClass += ' active';
        else if (isCompleted) circleClass += ' completed';
        else if (isFuture) circleClass += ' future';

        return (
          <React.Fragment key={step.id}>
            <div 
              className="wizard-step" 
              onClick={() => {
                if (!simulationActive && onStepClick) {
                  onStepClick(step.id);
                }
              }}
              style={{ cursor: simulationActive ? 'not-allowed' : 'pointer' }}
            >
              <motion.div 
                className={circleClass}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? '✓' : step.id}
              </motion.div>
              <div className="wizard-step-label">
                {step.icon} {step.label}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`wizard-step-connector ${completedSteps && completedSteps.has(step.id) ? 'completed' : 'future'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
