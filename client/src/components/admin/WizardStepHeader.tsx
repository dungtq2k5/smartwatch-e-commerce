import { memo, useMemo, type JSX } from "react";
import Title from "./Title";

type WizardStepHeaderProps<T extends string> = {
  currStep: T;
  title: React.ReactNode;
  parentTitle: string;
  parentLink: string;
  className?: string;
  // Wizard configuration
  isWizardActive: boolean;
  wizardStartStep: T | null;
  allWizardSteps: readonly T[];
};

const WizardStepHeader = memo(
  <T extends string>({
    currStep,
    title,
    parentTitle,
    parentLink,
    className,
    isWizardActive,
    wizardStartStep,
    allWizardSteps,
  }: WizardStepHeaderProps<T>) => {
    const { curr, total } = useMemo((): {
      curr: number;
      total: number;
    } => {
      if (!isWizardActive || !wizardStartStep) {
        return { curr: 0, total: 0 };
      }

      const startIdx = allWizardSteps.indexOf(wizardStartStep);
      const currIdx = allWizardSteps.indexOf(currStep);

      // If somehow invalid -> return 0/0
      if (startIdx === -1 || currIdx === -1) {
        return { curr: 0, total: 0 };
      }

      return {
        curr: currIdx - startIdx + 1,
        total: allWizardSteps.length - startIdx,
      };
    }, [allWizardSteps, currStep, isWizardActive, wizardStartStep]);

    return (
      <>
        {isWizardActive && wizardStartStep ? (
          <div className={className}>
            {/* Wizard Progress UI */}
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3">
                  Creation Wizard
                </span>
                <span className="text-muted small fw-medium">
                  Step {curr} of {total}
                </span>
              </div>
              <span className="text-muted small">
                {Math.round((curr / total) * 100)}% Completed
              </span>
            </div>
            <div className="progress mb-3" style={{ height: "6px" }}>
              <progress
                className="progress-bar progress-filled-color-success--g"
                style={{ width: `${(curr / total) * 100 - 1}%` }}
                aria-valuenow={(curr / total) * 100 - 1}
                aria-valuemin={0}
                aria-valuemax={100}
              ></progress>
            </div>

            {/* Page Title */}
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="fs-2 mb-0">{title}</h1>
            </div>
          </div>
        ) : (
          <Title
            title={title}
            parentTitle={parentTitle}
            parentLink={parentLink}
            className={className}
          />
        )}
      </>
    );
  },
) as <T extends string>(props: WizardStepHeaderProps<T>) => JSX.Element;

export default WizardStepHeader;
