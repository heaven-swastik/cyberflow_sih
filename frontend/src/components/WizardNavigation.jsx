import React from 'react';

export default function WizardNavigation({ 
  currentStep, 
  totalSteps = 5, 
  onBack, 
  onNext, 
  simulationActive 
}) {
  return (
    <div className="wizard-navigation">
      <div className="wizard-nav-left">
        {currentStep > 1 ? (
          <button 
            className="wizard-nav-btn secondary" 
            onClick={onBack}
            disabled={simulationActive}
            style={{ opacity: simulationActive ? 0.5 : 1, cursor: simulationActive ? 'not-allowed' : 'pointer' }}
          >
            Back
          </button>
        ) : (
          <div style={{ width: '60px' }}></div>
        )}
      </div>
      
      <div className="wizard-nav-center">
        Step {currentStep} of {totalSteps}
      </div>
      
      <div className="wizard-nav-right">
        <button 
          className="wizard-nav-btn primary" 
          onClick={onNext}
          disabled={simulationActive}
          style={{ opacity: simulationActive ? 0.5 : 1, cursor: simulationActive ? 'not-allowed' : 'pointer' }}
        >
          {currentStep === totalSteps ? '✓ Complete Investigation' : 'Next'}
        </button>
      </div>
    </div>
  );
}
